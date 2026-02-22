-- Extra engagement features: liked-you unlocks, chat states, gifts, support

-- Liked-you time unlocks
create table if not exists public.liked_you_unlocks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_liked_you_unlocks_user on public.liked_you_unlocks(user_id);

alter table public.liked_you_unlocks enable row level security;

drop policy if exists "Liked you unlocks select own" on public.liked_you_unlocks;
drop policy if exists "Liked you unlocks insert own" on public.liked_you_unlocks;

create policy "Liked you unlocks select own" on public.liked_you_unlocks
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Liked you unlocks insert own" on public.liked_you_unlocks
  for insert with check (auth.uid() = user_id);

create or replace function public.unlock_liked_you(p_hours int, p_cost int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select coin_balance into v_balance from public.users where id = v_user_id;
  if v_balance is null or v_balance < p_cost then
    raise exception 'insufficient balance';
  end if;

  update public.users
  set coin_balance = coin_balance - p_cost
  where id = v_user_id;

  insert into public.transactions (user_id, amount, type, metadata)
  values (v_user_id, -p_cost, 'purchase', jsonb_build_object('feature','liked_you','hours',p_hours));

  insert into public.liked_you_unlocks (user_id, expires_at)
  values (v_user_id, now() + make_interval(hours => p_hours));

  return true;
end;
$$;

-- Chat state flags per user
create table if not exists public.chat_states (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches on delete cascade,
  user_id uuid references public.users on delete cascade,
  is_archived boolean default false,
  is_favorite boolean default false,
  is_trashed boolean default false,
  deleted_at timestamptz null,
  updated_at timestamptz default now(),
  unique(match_id, user_id)
);

alter table public.chat_states enable row level security;

drop policy if exists "Chat states select own" on public.chat_states;
drop policy if exists "Chat states insert own" on public.chat_states;
drop policy if exists "Chat states update own" on public.chat_states;

create policy "Chat states select own" on public.chat_states
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Chat states insert own" on public.chat_states
  for insert with check (auth.uid() = user_id);

create policy "Chat states update own" on public.chat_states
  for update using (auth.uid() = user_id or public.is_admin());

create index if not exists idx_chat_states_user on public.chat_states(user_id);
create index if not exists idx_chat_states_match on public.chat_states(match_id);

-- Gifts catalog
create table if not exists public.gifts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price int not null,
  image_url text null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create unique index if not exists idx_gifts_name on public.gifts(name);

alter table public.gifts enable row level security;

drop policy if exists "Gifts select auth" on public.gifts;
drop policy if exists "Gifts admin" on public.gifts;

create policy "Gifts select auth" on public.gifts
  for select using (auth.uid() is not null);

create policy "Gifts admin" on public.gifts
  for insert with check (public.is_admin());

create policy "Gifts admin update" on public.gifts
  for update using (public.is_admin());

-- Gift sends
create table if not exists public.gift_sends (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.matches on delete cascade,
  from_user uuid references public.users on delete cascade,
  to_user uuid references public.users on delete cascade,
  gift_id uuid references public.gifts on delete set null,
  amount int not null,
  created_at timestamptz default now()
);

alter table public.gift_sends enable row level security;

drop policy if exists "Gift sends insert" on public.gift_sends;
drop policy if exists "Gift sends select" on public.gift_sends;

create policy "Gift sends insert" on public.gift_sends
  for insert with check (auth.uid() = from_user);

create policy "Gift sends select" on public.gift_sends
  for select using (
    auth.uid() = from_user or auth.uid() = to_user or public.is_admin()
  );

create or replace function public.send_gift(p_match_id uuid, p_gift_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_other_id uuid;
  v_price int;
  v_balance int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and (m.user_a = v_user_id or m.user_b = v_user_id)
  ) then
    raise exception 'not authorized';
  end if;

  select price into v_price from public.gifts where id = p_gift_id and is_active = true;
  if v_price is null then
    raise exception 'gift not found';
  end if;

  select coin_balance into v_balance from public.users where id = v_user_id;
  if v_balance is null or v_balance < v_price then
    raise exception 'insufficient balance';
  end if;

  select case when m.user_a = v_user_id then m.user_b else m.user_a end
  into v_other_id
  from public.matches m
  where m.id = p_match_id;

  update public.users set coin_balance = coin_balance - v_price where id = v_user_id;

  insert into public.transactions (user_id, amount, type, metadata)
  values (v_user_id, -v_price, 'gift', jsonb_build_object('match_id',p_match_id,'gift_id',p_gift_id));

  insert into public.gift_sends (match_id, from_user, to_user, gift_id, amount)
  values (p_match_id, v_user_id, v_other_id, p_gift_id, v_price);

  return true;
end;
$$;

-- Support tickets
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  subject text not null,
  message text not null,
  status text default 'open' check (status in ('open','pending','resolved','closed')),
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "Support tickets select own" on public.support_tickets;
drop policy if exists "Support tickets insert own" on public.support_tickets;
drop policy if exists "Support tickets admin select" on public.support_tickets;
drop policy if exists "Support tickets admin update" on public.support_tickets;

create policy "Support tickets select own" on public.support_tickets
  for select using (auth.uid() = user_id);

create policy "Support tickets insert own" on public.support_tickets
  for insert with check (auth.uid() = user_id);

create policy "Support tickets admin select" on public.support_tickets
  for select using (public.is_admin());

create policy "Support tickets admin update" on public.support_tickets
  for update using (public.is_admin());

-- Optional seed gifts
insert into public.gifts (name, price, image_url, is_active)
values
  ('Gul', 5, null, true),
  ('Kalp', 10, null, true),
  ('Yildiz', 15, null, true),
  ('Cicek', 25, null, true)
on conflict (name) do nothing;
