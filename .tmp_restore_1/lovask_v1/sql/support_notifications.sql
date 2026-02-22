-- Admin notifications for support tickets

drop policy if exists "Notifications insert admin" on public.notifications;
create policy "Notifications insert admin" on public.notifications
  for insert with check (public.is_admin());

create or replace function public.notify_admins(p_type text, p_payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  insert into public.notifications (user_id, type, payload)
  select u.id, p_type, p_payload
  from public.users u
  where u.role = 'admin';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
