-- Push subscriptions

create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Push subs insert own" on public.push_subscriptions;
drop policy if exists "Push subs select own" on public.push_subscriptions;
drop policy if exists "Push subs delete own" on public.push_subscriptions;

create policy "Push subs insert own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Push subs select own" on public.push_subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Push subs delete own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
