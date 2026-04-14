-- ============================================================
-- Canopy Create — initial schema
-- ============================================================
-- All tables are workspace-scoped via workspace_id, which
-- references the shared organizations table.
-- RLS is enabled on every table as a safety net; the server
-- data layer (create-data.ts) uses the service role key and
-- bypasses RLS, but direct client access is still restricted.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- Helper: check if the current user is a platform operator
-- ──────────────────────────────────────────────────────────────
create or replace function create_is_platform_operator()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid()
      and (platform_role in ('super_admin', 'platform_staff') or is_super_admin = true)
  );
$$;


-- ──────────────────────────────────────────────────────────────
-- create_requests
-- ──────────────────────────────────────────────────────────────
create table if not exists create_requests (
  id                    uuid        primary key default gen_random_uuid(),
  workspace_id          uuid        not null references organizations(id) on delete cascade,
  title                 text        not null,
  workflow_family       text        not null, -- design_production | website_update | managed_communications
  request_type          text        not null,
  details               jsonb       null,
  status                text        not null default 'submitted',
  approval_required     boolean     not null default false,
  submitted_by_user_id  uuid        not null, -- references auth.users(id)
  assigned_to_user_id   uuid        null,     -- references auth.users(id)
  converted_project_id  uuid        null,     -- set when converted; FK added below
  converted_item_id     uuid        null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists create_requests_workspace_id_idx
  on create_requests(workspace_id);

create index if not exists create_requests_status_idx
  on create_requests(workspace_id, status);

alter table create_requests enable row level security;

create policy "workspace members or operators can read create_requests"
  on create_requests for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_requests"
  on create_requests for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can update create_requests"
  on create_requests for update
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- create_projects
-- ──────────────────────────────────────────────────────────────
create table if not exists create_projects (
  id                  uuid        primary key default gen_random_uuid(),
  workspace_id        uuid        not null references organizations(id) on delete cascade,
  origin_request_id   uuid        null references create_requests(id) on delete set null,
  title               text        not null,
  workflow_family     text        not null,
  status              text        not null default 'draft',
  template_key        text        null,
  plane_project_id    text        null, -- populated when Plane integration is active
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists create_projects_workspace_id_idx
  on create_projects(workspace_id);

create index if not exists create_projects_status_idx
  on create_projects(workspace_id, status);

alter table create_projects enable row level security;

create policy "workspace members or operators can read create_projects"
  on create_projects for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_projects"
  on create_projects for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can update create_projects"
  on create_projects for update
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- Backfill FK: create_requests.converted_project_id → create_projects
-- ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'create_requests_converted_project_id_fkey'
      and conrelid = 'create_requests'::regclass
  ) then
    alter table create_requests
      add constraint create_requests_converted_project_id_fkey
      foreign key (converted_project_id)
      references create_projects(id)
      on delete set null;
  end if;
end;
$$;


-- ──────────────────────────────────────────────────────────────
-- create_milestones
-- Lightweight named checkpoints on a project (client-visible
-- production timeline). Simple pending/completed toggle.
-- ──────────────────────────────────────────────────────────────
create table if not exists create_milestones (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references organizations(id) on delete cascade,
  project_id    uuid        not null references create_projects(id) on delete cascade,
  title         text        not null,
  status        text        not null default 'pending',
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists create_milestones_project_id_idx
  on create_milestones(workspace_id, project_id);

alter table create_milestones enable row level security;

create policy "workspace members or operators can read create_milestones"
  on create_milestones for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_milestones"
  on create_milestones for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can update create_milestones"
  on create_milestones for update
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- create_items
-- Trackable deliverable/step under a project or request.
-- Has versions, comments, and approvals attached to it.
-- ──────────────────────────────────────────────────────────────
create table if not exists create_items (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references organizations(id) on delete cascade,
  project_id      uuid        null references create_projects(id) on delete cascade,
  request_id      uuid        null references create_requests(id) on delete cascade,
  title           text        not null,
  item_type       text        not null default 'deliverable',
  status          text        not null default 'pending',
  approval_state  text        not null default 'pending',
  due_date        date        null,
  sort_order      integer     not null default 0,
  assignee_id     uuid        null,     -- references auth.users(id)
  plane_issue_id  text        null,     -- populated when Plane integration is active
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists create_items_workspace_id_idx
  on create_items(workspace_id);

create index if not exists create_items_project_id_idx
  on create_items(workspace_id, project_id)
  where project_id is not null;

create index if not exists create_items_request_id_idx
  on create_items(workspace_id, request_id)
  where request_id is not null;

alter table create_items enable row level security;

create policy "workspace members or operators can read create_items"
  on create_items for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_items"
  on create_items for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can update create_items"
  on create_items for update
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- create_item_versions
-- Draft/proof outputs uploaded by the Akkedis team against an item.
-- ──────────────────────────────────────────────────────────────
create table if not exists create_item_versions (
  id             uuid        primary key default gen_random_uuid(),
  workspace_id   uuid        not null references organizations(id) on delete cascade,
  item_id        uuid        not null references create_items(id) on delete cascade,
  version_label  text        not null, -- e.g. "Draft 1", "Draft 2", "Final"
  file_url       text        null,
  notes          text        null,
  created_by     uuid        not null, -- references auth.users(id)
  created_at     timestamptz not null default now()
);

create index if not exists create_item_versions_item_id_idx
  on create_item_versions(workspace_id, item_id);

alter table create_item_versions enable row level security;

create policy "workspace members or operators can read create_item_versions"
  on create_item_versions for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "operators can insert create_item_versions"
  on create_item_versions for insert
  with check (create_is_platform_operator());


-- ──────────────────────────────────────────────────────────────
-- create_item_comments
-- Thread on a deliverable item — visible to school and Akkedis.
-- ──────────────────────────────────────────────────────────────
create table if not exists create_item_comments (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references organizations(id) on delete cascade,
  item_id         uuid        not null references create_items(id) on delete cascade,
  body            text        not null,
  author_user_id  uuid        not null, -- references auth.users(id)
  created_at      timestamptz not null default now()
);

create index if not exists create_item_comments_item_id_idx
  on create_item_comments(workspace_id, item_id);

alter table create_item_comments enable row level security;

create policy "workspace members or operators can read create_item_comments"
  on create_item_comments for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_item_comments"
  on create_item_comments for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- create_approvals
-- Formal review decisions recorded against an item or version.
-- ──────────────────────────────────────────────────────────────
create table if not exists create_approvals (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references organizations(id) on delete cascade,
  item_id      uuid        not null references create_items(id) on delete cascade,
  version_id   uuid        null references create_item_versions(id) on delete set null,
  decision     text        not null, -- approved | approved_with_changes | changes_requested
  note         text        null,
  decided_by   uuid        not null, -- references auth.users(id)
  decided_at   timestamptz not null default now()
);

create index if not exists create_approvals_item_id_idx
  on create_approvals(workspace_id, item_id);

alter table create_approvals enable row level security;

create policy "workspace members or operators can read create_approvals"
  on create_approvals for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_approvals"
  on create_approvals for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- create_request_attachments
-- Files uploaded by the school when submitting or updating a request.
-- ──────────────────────────────────────────────────────────────
create table if not exists create_request_attachments (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references organizations(id) on delete cascade,
  request_id    uuid        not null references create_requests(id) on delete cascade,
  filename      text        not null,
  file_url      text        not null,
  uploaded_by   uuid        not null, -- references auth.users(id)
  created_at    timestamptz not null default now()
);

create index if not exists create_request_attachments_request_id_idx
  on create_request_attachments(workspace_id, request_id);

alter table create_request_attachments enable row level security;

create policy "workspace members or operators can read create_request_attachments"
  on create_request_attachments for select
  using (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "workspace members or operators can insert create_request_attachments"
  on create_request_attachments for insert
  with check (
    create_is_platform_operator()
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────
-- updated_at triggers
-- ──────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists create_requests_updated_at on create_requests;
create trigger create_requests_updated_at
  before update on create_requests
  for each row execute function set_updated_at();

drop trigger if exists create_projects_updated_at on create_projects;
create trigger create_projects_updated_at
  before update on create_projects
  for each row execute function set_updated_at();

drop trigger if exists create_items_updated_at on create_items;
create trigger create_items_updated_at
  before update on create_items
  for each row execute function set_updated_at();


-- ──────────────────────────────────────────────────────────────
-- Storage bucket note (configure in Supabase dashboard or via
-- storage API — cannot be created in a SQL migration):
--
--   Bucket name: canopy-create
--   Paths:
--     {workspace_id}/requests/{request_id}/{filename}
--     {workspace_id}/projects/{project_id}/items/{item_id}/{version_label}/{filename}
-- ──────────────────────────────────────────────────────────────
