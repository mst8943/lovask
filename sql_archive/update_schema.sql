-- PASSES TABLE
-- Records skipped profiles so they don't show up again.
create table public.passes (
  id uuid default uuid_generate_v4() primary key,
  from_user uuid references public.users on delete cascade,
  to_user uuid references public.users on delete cascade,
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

-- RLS
alter table public.passes enable row level security;

create policy "Users can create passes" on public.passes
  for insert with check (auth.uid() = from_user);

create policy "Users can view passes they sent" on public.passes
  for select using (auth.uid() = from_user);
