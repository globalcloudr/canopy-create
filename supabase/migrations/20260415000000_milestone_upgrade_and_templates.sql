-- ──────────────────────────────────────────────────────────────
-- Milestone upgrade: dates, assignees, richer status, visibility
-- Project templates: auto-generate milestones on conversion
-- Recurring cycle foundation: cycle_number, origin_project_id
-- ──────────────────────────────────────────────────────────────

begin;

-- ─── Expand create_milestones ─────────────────────────────────

alter table create_milestones
  add column if not exists sort_order integer not null default 0,
  add column if not exists due_date date,
  add column if not exists assignee_id uuid references auth.users(id),
  add column if not exists description text,
  add column if not exists visibility text not null default 'all'
    check (visibility in ('all', 'internal')),
  add column if not exists milestone_status text not null default 'not_started'
    check (milestone_status in ('not_started', 'in_progress', 'completed', 'blocked'));

-- Backfill milestone_status from legacy status column
update create_milestones
  set milestone_status = case
    when status = 'completed' then 'completed'
    else 'not_started'
  end
  where milestone_status = 'not_started' and status = 'completed';

-- Index for timeline queries ordered by sort_order
create index if not exists create_milestones_sort_idx
  on create_milestones(project_id, sort_order);

-- ─── Expand create_projects ───────────────────────────────────

alter table create_projects
  add column if not exists cycle_number integer not null default 1,
  add column if not exists origin_project_id uuid references create_projects(id);

-- ─── Project templates ────────────────────────────────────────

create table if not exists create_project_templates (
  id                      uuid        primary key default gen_random_uuid(),
  workspace_id            uuid        references organizations(id) on delete cascade,
  name                    text        not null,
  workflow_family         text        not null,
  description             text,
  milestone_definitions   jsonb       not null default '[]'::jsonb,
  deliverable_definitions jsonb       not null default '[]'::jsonb,
  created_at              timestamptz not null default now()
);

create index if not exists create_project_templates_workspace_idx
  on create_project_templates(workspace_id);

alter table create_project_templates enable row level security;

create policy "workspace members or operators can read create_project_templates"
  on create_project_templates for select
  using (
    create_is_platform_operator()
    or workspace_id is null
    or workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

create policy "operators can manage create_project_templates"
  on create_project_templates for all
  using (create_is_platform_operator())
  with check (create_is_platform_operator());

commit;
