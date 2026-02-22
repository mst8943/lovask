-- Access plans for premium unlocks (liked_you, profile_viewers)

create table if not exists public.access_plans (
  feature text primary key,
  hours int not null default 24,
  cost int not null default 20,
  is_active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.access_unlocks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  feature text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_access_unlocks_user on public.access_unlocks(user_id);
create index if not exists idx_access_unlocks_feature on public.access_unlocks(feature);

alter table public.access_plans enable row level security;
alter table public.access_unlocks enable row level security;

drop policy if exists "Access plans select auth" on public.access_plans;
drop policy if exists "Access plans admin" on public.access_plans;
drop policy if exists "Access plans admin update" on public.access_plans;
drop policy if exists "Access unlocks select own" on public.access_unlocks;
drop policy if exists "Access unlocks insert own" on public.access_unlocks;

create policy "Access plans select auth" on public.access_plans
  for select using (auth.uid() is not null);

create policy "Access plans admin" on public.access_plans
  for insert with check (public.is_admin());

create policy "Access plans admin update" on public.access_plans
  for update using (public.is_admin());

create policy "Access unlocks select own" on public.access_unlocks
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Access unlocks insert own" on public.access_unlocks
  for insert with check (auth.uid() = user_id);

create or replace function public.unlock_feature_access(p_feature text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_plan record;
  v_balance int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_plan from public.access_plans where feature = p_feature and is_active = true;
  if v_plan is null then
    raise exception 'plan not available';
  end if;

  select coin_balance into v_balance from public.users where id = v_user_id;
  if v_balance is null or v_balance < v_plan.cost then
    raise exception 'insufficient balance';
  end if;

  update public.users
  set coin_balance = coin_balance - v_plan.cost
  where id = v_user_id;

  insert into public.transactions (user_id, amount, type, metadata)
  values (v_user_id, -v_plan.cost, 'purchase', jsonb_build_object('feature',p_feature,'hours',v_plan.hours));

  insert into public.access_unlocks (user_id, feature, expires_at)
  values (v_user_id, p_feature, now() + make_interval(hours => v_plan.hours));

  return true;
end;
$$;

insert into public.access_plans (feature, hours, cost, is_active)
values
  ('liked_you', 24, 20, true),
  ('profile_viewers', 24, 15, true)
on conflict (feature) do update
set hours = excluded.hours,
    cost = excluded.cost,
    is_active = excluded.is_active,
    updated_at = now();
