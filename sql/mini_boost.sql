-- Mini Boost daily limit + admin access
-- Run in Supabase SQL editor

begin;

-- Extend boosts source enum/check to include mini
alter table public.boosts
  drop constraint if exists boosts_source_check;

alter table public.boosts
  add constraint boosts_source_check
  check (source in ('purchase','daily','promo','mini'));

create index if not exists idx_boosts_user_start
  on public.boosts (user_id, starts_at desc);

-- Mini boost: 1 per day, atomically charge and create boost
create or replace function public.activate_mini_boost(p_minutes int, p_cost int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_used int;
  v_balance int;
  v_ends_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select count(1) into v_used
  from public.boosts
  where user_id = v_user_id
    and source = 'mini'
    and starts_at >= date_trunc('day', now());

  if v_used > 0 then
    return false;
  end if;

  if p_cost > 0 then
    select coin_balance into v_balance from public.users where id = v_user_id;
    if v_balance is null or v_balance < p_cost then
      raise exception 'insufficient balance';
    end if;

    update public.users
    set coin_balance = coin_balance - p_cost
    where id = v_user_id;

    insert into public.transactions (user_id, amount, type, metadata)
    values (v_user_id, -p_cost, 'spend', jsonb_build_object('reason','boost_lite','minutes',p_minutes));
  end if;

  v_ends_at := now() + make_interval(mins => p_minutes);

  insert into public.boosts (user_id, starts_at, ends_at, source)
  values (v_user_id, now(), v_ends_at, 'mini');

  return true;
end;
$$;

-- Admin can view all boosts
alter table public.boosts enable row level security;
drop policy if exists "Boosts admin select" on public.boosts;
create policy "Boosts admin select" on public.boosts
  for select using (is_admin());

commit;
