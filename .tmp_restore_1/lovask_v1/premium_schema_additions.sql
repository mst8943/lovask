-- Premium enforcement policies

-- Likes: allow premium users to see who liked them
drop policy if exists "Likes select for to_user premium" on public.likes;

create policy "Likes select for to_user premium" on public.likes
  for select using (
    to_user = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_premium = true
    )
  );

-- Profile views: only premium users can see viewers
drop policy if exists "Profile views select for viewed premium" on public.profile_views;

create policy "Profile views select for viewed premium" on public.profile_views
  for select using (
    viewed_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_premium = true
    )
  );

-- Daily premium boost helper
create or replace function public.claim_daily_boost()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_today date := current_date;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.users where id = v_user_id and is_premium = true) then
    return false;
  end if;

  if exists (
    select 1 from public.boosts
    where user_id = v_user_id
      and source = 'daily'
      and starts_at::date = v_today
  ) then
    return false;
  end if;

  insert into public.boosts (user_id, starts_at, ends_at, source)
  values (v_user_id, now(), now() + interval '30 minutes', 'daily');

  return true;
end;
$$;
