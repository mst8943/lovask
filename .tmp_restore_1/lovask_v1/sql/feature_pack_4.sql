-- Feature Pack 4: Bot safety queue (status + admin actions)

alter table public.bot_safety_events
  add column if not exists status text default 'open'
  check (status in ('open','resolved','dismissed'));

create index if not exists idx_bot_safety_events_status_time
  on public.bot_safety_events (status, created_at desc);

drop policy if exists "Admin update bot_safety_events" on public.bot_safety_events;
create policy "Admin update bot_safety_events" on public.bot_safety_events
  for update using (public.is_admin());
