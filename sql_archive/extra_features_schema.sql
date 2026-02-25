-- Extra features schema for super like, boosts, incognito, read receipts, advanced filters, verification, rewind, profile variants

-- Profiles extended attributes
alter table public.profiles add column if not exists relationship_type text;
alter table public.profiles add column if not exists education text;
alter table public.profiles add column if not exists smoking text;
alter table public.profiles add column if not exists alcohol text;
alter table public.profiles add column if not exists kids_status text;
alter table public.profiles add column if not exists height_cm int;
alter table public.profiles add column if not exists religion text;
alter table public.profiles add column if not exists lifestyle text;
alter table public.profiles add column if not exists is_verified boolean default false;

-- Users daily counters
alter table public.users add column if not exists last_super_like_at timestamptz;
alter table public.users add column if not exists incognito_until timestamptz;

-- Super likes
create table if not exists public.super_likes (
  id uuid default uuid_generate_v4() primary key,
  from_user uuid references public.users on delete cascade,
  to_user uuid references public.users on delete cascade,
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

alter table public.super_likes enable row level security;

drop policy if exists "Super likes insert own" on public.super_likes;
drop policy if exists "Super likes select own" on public.super_likes;

create policy "Super likes insert own" on public.super_likes
  for insert with check (auth.uid() = from_user);

create policy "Super likes select own" on public.super_likes
  for select using (auth.uid() = from_user or auth.uid() = to_user or public.is_admin());

-- Daily super like claim
create or replace function public.claim_super_like(p_to_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_last date;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select last_super_like_at::date into v_last from public.users where id = v_user_id;
  if v_last is not null and v_last >= current_date then
    return false;
  end if;

  insert into public.super_likes (from_user, to_user) values (v_user_id, p_to_user);
  insert into public.likes (from_user, to_user) values (v_user_id, p_to_user)
  on conflict do nothing;

  if exists (
    select 1 from public.likes l
    where l.from_user = p_to_user and l.to_user = v_user_id
  ) then
    insert into public.matches (user_a, user_b)
    values (v_user_id, p_to_user)
    on conflict do nothing;
  end if;

  update public.users set last_super_like_at = now() where id = v_user_id;
  return true;
end;
$$;

-- Rewind table
create table if not exists public.rewinds (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  target_id uuid references public.users on delete cascade,
  created_at timestamptz default now()
);

alter table public.rewinds enable row level security;
drop policy if exists "Rewinds insert own" on public.rewinds;
drop policy if exists "Rewinds select own" on public.rewinds;
create policy "Rewinds insert own" on public.rewinds for insert with check (auth.uid() = user_id);
create policy "Rewinds select own" on public.rewinds for select using (auth.uid() = user_id or public.is_admin());

-- Incognito passes
create table if not exists public.incognito_passes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.incognito_passes enable row level security;
drop policy if exists "Incognito select own" on public.incognito_passes;
drop policy if exists "Incognito insert own" on public.incognito_passes;
create policy "Incognito select own" on public.incognito_passes for select using (auth.uid() = user_id or public.is_admin());
create policy "Incognito insert own" on public.incognito_passes for insert with check (auth.uid() = user_id);

-- Read receipt unlocks per match
create table if not exists public.read_receipt_unlocks (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches on delete cascade unique,
  user_id uuid references public.users on delete cascade,
  created_at timestamptz default now()
);

alter table public.read_receipt_unlocks enable row level security;
drop policy if exists "Read receipts insert own" on public.read_receipt_unlocks;
drop policy if exists "Read receipts select own" on public.read_receipt_unlocks;
create policy "Read receipts insert own" on public.read_receipt_unlocks for insert with check (auth.uid() = user_id);
create policy "Read receipts select own" on public.read_receipt_unlocks for select using (auth.uid() = user_id or public.is_admin());

-- Profile variants for cycling
create table if not exists public.profile_variants (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  name text,
  bio text,
  photos jsonb default '[]'::jsonb,
  is_active boolean default false,
  created_at timestamptz default now()
);

alter table public.profile_variants enable row level security;
drop policy if exists "Variants insert own" on public.profile_variants;
drop policy if exists "Variants select own" on public.profile_variants;
drop policy if exists "Variants update own" on public.profile_variants;
create policy "Variants insert own" on public.profile_variants for insert with check (auth.uid() = user_id);
create policy "Variants select own" on public.profile_variants for select using (auth.uid() = user_id or public.is_admin());
create policy "Variants update own" on public.profile_variants for update using (auth.uid() = user_id or public.is_admin());

-- Boost plus helper
create or replace function public.activate_boost_plus(p_minutes int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.boosts (user_id, starts_at, ends_at, source)
  values (v_user_id, now(), now() + make_interval(mins => p_minutes), 'purchase');

  return true;
end;
$$;

-- Incognito activate
create or replace function public.activate_incognito(p_hours int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set incognito_until = now() + make_interval(hours => p_hours)
  where id = v_user_id;

  return true;
end;
$$;
