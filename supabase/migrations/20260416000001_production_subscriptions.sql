-- Production subscription schedules per workspace
-- Stores each school's recurring cycle configuration (catalog 3x/year, newsletter monthly)

create table if not exists create_production_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null,
  subscription_type  text not null,
  enabled            boolean not null default false,
  -- Catalog: target delivery month (1–12) and day (1–28)
  delivery_month     integer check (delivery_month between 1 and 12),
  delivery_day       integer not null default 1 check (delivery_day between 1 and 28),
  -- How many days before delivery to fire the kickoff reminder (default 56 = 8 weeks)
  kickoff_lead_days  integer not null default 56,
  -- Reference to the most recently completed cycle's project (for pre-fill)
  last_project_id    uuid references create_projects(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint create_production_subscriptions_type_check
    check (subscription_type in ('catalog_fall', 'catalog_winter_spring', 'catalog_summer', 'newsletter_monthly')),
  unique(workspace_id, subscription_type)
);

-- Prevents duplicate reminder sends (idempotent cron)
create table if not exists create_reminder_log (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null,
  subscription_id  uuid not null references create_production_subscriptions(id) on delete cascade,
  reminder_type    text not null,   -- 'kickoff' | 'content_start' | 'content_deadline'
  trigger_date     date not null,
  sent_at          timestamptz not null default now(),
  unique(subscription_id, reminder_type, trigger_date)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table create_production_subscriptions enable row level security;
alter table create_reminder_log enable row level security;

-- Workspace members can read their own subscriptions
create policy "workspace_members_read_subscriptions"
  on create_production_subscriptions for select
  using (
    workspace_id in (
      select org_id from memberships where user_id = auth.uid()
    )
  );

-- Platform operators and workspace owners/admins can write
create policy "operators_write_subscriptions"
  on create_production_subscriptions for all
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and (profiles.platform_role in ('super_admin', 'platform_staff') or profiles.is_super_admin = true)
    )
    or workspace_id in (
      select org_id from memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Platform operators can read reminder log
create policy "operators_read_reminder_log"
  on create_reminder_log for select
  using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid()
        and (profiles.platform_role in ('super_admin', 'platform_staff') or profiles.is_super_admin = true)
    )
  );
