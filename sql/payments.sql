-- Card payment requests (provider integration scaffold)

create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  provider text not null,
  kind text not null check (kind in ('coins','premium')),
  amount int not null,
  currency text default 'TRY',
  status text default 'pending' check (status in ('pending','paid','failed','canceled')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payments_user on public.payments(user_id);

alter table public.payments enable row level security;

drop policy if exists "Payments select own" on public.payments;
drop policy if exists "Payments insert own" on public.payments;
drop policy if exists "Payments admin select" on public.payments;
drop policy if exists "Payments admin update" on public.payments;

create policy "Payments select own" on public.payments
  for select using (auth.uid() = user_id);

create policy "Payments insert own" on public.payments
  for insert with check (auth.uid() = user_id);

create policy "Payments admin select" on public.payments
  for select using (public.is_admin());

create policy "Payments admin update" on public.payments
  for update using (public.is_admin());
