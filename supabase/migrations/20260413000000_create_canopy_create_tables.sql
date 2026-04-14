create extension if not exists pgcrypto;

begin;

create table if not exists public.create_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  workflow_family text not null check (
    workflow_family in (
      'design_production',
      'website_update',
      'managed_communications'
    )
  ),
  request_type text not null check (
    request_type in (
      'catalog_project',
      'brochure_project',
      'flyer_project',
      'postcard_project',
      'banner_project',
      'fact_sheet_project',
      'website_update',
      'newsletter_request',
      'social_media_request',
      'campaign_support_request',
      'other'
    )
  ),
  status text not null default 'submitted' check (
    status in (
      'submitted',
      'in_progress',
      'client_review',
      'converted',
      'completed'
    )
  ),
  approval_required boolean not null default false,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  converted_project_id uuid,
  converted_item_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.create_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.organizations(id) on delete cascade,
  origin_request_id uuid,
  title text not null,
  workflow_family text not null check (
    workflow_family in (
      'design_production',
      'website_update',
      'managed_communications'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'active',
      'completed',
      'archived'
    )
  ),
  template_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.create_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.create_projects(id) on delete cascade,
  request_id uuid references public.create_requests(id) on delete set null,
  title text not null,
  item_type text not null,
  status text not null default 'pending' check (
    status in (
      'pending',
      'in_progress',
      'in_review',
      'completed'
    )
  ),
  approval_state text not null default 'pending' check (
    approval_state in (
      'pending',
      'approved',
      'approved_with_changes',
      'changes_requested'
    )
  ),
  due_date timestamptz,
  sort_order integer not null default 0,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint create_items_parent_check check (
    project_id is not null or request_id is not null
  )
);

alter table public.create_requests
  add constraint create_requests_converted_project_id_fkey
  foreign key (converted_project_id)
  references public.create_projects(id)
  on delete set null;

alter table public.create_requests
  add constraint create_requests_converted_item_id_fkey
  foreign key (converted_item_id)
  references public.create_items(id)
  on delete set null;

alter table public.create_projects
  add constraint create_projects_origin_request_id_fkey
  foreign key (origin_request_id)
  references public.create_requests(id)
  on delete set null;

create index if not exists create_requests_workspace_id_idx
  on public.create_requests (workspace_id);

create index if not exists create_projects_workspace_id_idx
  on public.create_projects (workspace_id);

create index if not exists create_items_workspace_id_idx
  on public.create_items (workspace_id);

create index if not exists create_projects_origin_request_id_idx
  on public.create_projects (origin_request_id);

create index if not exists create_items_project_id_idx
  on public.create_items (project_id);

create index if not exists create_items_request_id_idx
  on public.create_items (request_id);

alter table public.create_requests enable row level security;
alter table public.create_projects enable row level security;
alter table public.create_items enable row level security;

drop policy if exists "Create requests are readable within a workspace" on public.create_requests;
create policy "Create requests are readable within a workspace"
  on public.create_requests
  for select
  using (
    public.is_org_viewer(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create requests are insertable within a workspace" on public.create_requests;
create policy "Create requests are insertable within a workspace"
  on public.create_requests
  for insert
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create requests are updatable within a workspace" on public.create_requests;
create policy "Create requests are updatable within a workspace"
  on public.create_requests
  for update
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  )
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create requests are deletable within a workspace" on public.create_requests;
create policy "Create requests are deletable within a workspace"
  on public.create_requests
  for delete
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create projects are readable within a workspace" on public.create_projects;
create policy "Create projects are readable within a workspace"
  on public.create_projects
  for select
  using (
    public.is_org_viewer(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create projects are insertable within a workspace" on public.create_projects;
create policy "Create projects are insertable within a workspace"
  on public.create_projects
  for insert
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create projects are updatable within a workspace" on public.create_projects;
create policy "Create projects are updatable within a workspace"
  on public.create_projects
  for update
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  )
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create projects are deletable within a workspace" on public.create_projects;
create policy "Create projects are deletable within a workspace"
  on public.create_projects
  for delete
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create items are readable within a workspace" on public.create_items;
create policy "Create items are readable within a workspace"
  on public.create_items
  for select
  using (
    public.is_org_viewer(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create items are insertable within a workspace" on public.create_items;
create policy "Create items are insertable within a workspace"
  on public.create_items
  for insert
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create items are updatable within a workspace" on public.create_items;
create policy "Create items are updatable within a workspace"
  on public.create_items
  for update
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  )
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

drop policy if exists "Create items are deletable within a workspace" on public.create_items;
create policy "Create items are deletable within a workspace"
  on public.create_items
  for delete
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

commit;
