alter table public.create_requests
  add column if not exists details jsonb;
