create table if not exists public.create_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null references public.create_projects(id) on delete cascade,
  title text not null,
  status text not null check (status in ('pending', 'completed')) default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists create_milestones_workspace_id_idx
  on public.create_milestones (workspace_id);

create index if not exists create_milestones_project_id_idx
  on public.create_milestones (project_id);

alter table public.create_milestones enable row level security;

create policy "Create milestones are viewable by workspace viewers"
  on public.create_milestones
  for select
  using (
    public.is_org_viewer(workspace_id)
    or public.is_platform_operator()
  );

create policy "Create milestones are insertable by workspace owners"
  on public.create_milestones
  for insert
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

create policy "Create milestones are updatable by workspace owners"
  on public.create_milestones
  for update
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  )
  with check (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );

create policy "Create milestones are deletable by workspace owners"
  on public.create_milestones
  for delete
  using (
    public.is_org_owner(workspace_id)
    or public.is_platform_operator()
  );
