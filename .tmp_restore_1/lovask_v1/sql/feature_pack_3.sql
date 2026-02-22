-- Feature Pack 3: Push orchestration (rate limit + audit log)

create table if not exists public.push_send_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users on delete cascade,
  source_user_id uuid references public.users on delete set null,
  type text not null check (type in ('message','match','test')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_push_send_log_target_time
  on public.push_send_log (target_user_id, created_at desc);

create index if not exists idx_push_send_log_target_type_time
  on public.push_send_log (target_user_id, type, created_at desc);

alter table public.push_send_log enable row level security;
drop policy if exists "Push send log admin" on public.push_send_log;
create policy "Push send log admin" on public.push_send_log
  for select using (public.is_admin());
