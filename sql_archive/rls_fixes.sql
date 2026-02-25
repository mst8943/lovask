-- RLS FIXES (safe policies only)
-- These close real functional gaps without opening write access broadly.

-- USERS: allow admin insert (e.g., admin tooling)
drop policy if exists "Users insert admin" on public.users;
create policy "Users insert admin" on public.users
  for insert with check (public.is_admin());

-- TRANSACTIONS: allow users to insert their own ledger rows (client spend/add)
drop policy if exists "Transactions insert own" on public.transactions;
create policy "Transactions insert own" on public.transactions
  for insert with check (auth.uid() = user_id);

-- TRANSACTIONS: allow users to view their own ledger if needed
drop policy if exists "Transactions select own" on public.transactions;
create policy "Transactions select own" on public.transactions
  for select using (auth.uid() = user_id);

-- NOTIFICATIONS: allow users to insert their own notification rows
drop policy if exists "Notifications insert own" on public.notifications;
create policy "Notifications insert own" on public.notifications
  for insert with check (auth.uid() = user_id);

-- PROFILES: allow users to update their own profile (explicit WITH CHECK)
drop policy if exists "Profiles update own or admin" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Profiles update own or admin" on public.profiles
  for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- PROFILES: allow users to read their own profile (even if hidden from discovery)
drop policy if exists "Profiles select own or admin" on public.profiles;
create policy "Profiles select own or admin" on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

-- AI COST LIMITS: allow admin to insert daily limit rows
drop policy if exists "AI cost limits insert admin" on public.ai_cost_limits;
create policy "AI cost limits insert admin" on public.ai_cost_limits
  for insert with check (public.is_admin());
