-- Commerce packages: coin packages + premium plans

create table if not exists public.coin_packages (
  id uuid primary key default gen_random_uuid(),
  title text,
  coins int not null check (coins > 0),
  price numeric not null check (price > 0),
  currency text not null default 'TRY',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.premium_plans (
  id uuid primary key default gen_random_uuid(),
  title text,
  months int not null check (months > 0),
  price numeric not null check (price > 0),
  currency text not null default 'TRY',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.coin_packages enable row level security;
alter table public.premium_plans enable row level security;

drop policy if exists "Coin packages select" on public.coin_packages;
create policy "Coin packages select" on public.coin_packages
  for select using (true);

drop policy if exists "Premium plans select" on public.premium_plans;
create policy "Premium plans select" on public.premium_plans
  for select using (true);

drop policy if exists "Coin packages admin" on public.coin_packages;
create policy "Coin packages admin" on public.coin_packages
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Premium plans admin" on public.premium_plans;
create policy "Premium plans admin" on public.premium_plans
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists idx_coin_packages_active_order
  on public.coin_packages (is_active, sort_order, price);

create index if not exists idx_premium_plans_active_order
  on public.premium_plans (is_active, sort_order, price);

alter table public.bank_transfers
  add column if not exists coin_package_id uuid,
  add column if not exists premium_plan_id uuid;

