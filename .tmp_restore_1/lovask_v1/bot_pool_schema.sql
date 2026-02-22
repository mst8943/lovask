-- Bot photo/bio pools (admin only)

create table if not exists public.bot_photo_pool (
  id uuid default uuid_generate_v4() primary key,
  gender text not null,
  size int not null,
  url text not null,
  created_at timestamptz default now(),
  unique(url)
);

create table if not exists public.bot_bio_pool (
  id uuid default uuid_generate_v4() primary key,
  gender text,
  bio text not null,
  created_at timestamptz default now()
);

alter table public.bot_photo_pool enable row level security;
alter table public.bot_bio_pool enable row level security;

drop policy if exists "Bot photo pool admin" on public.bot_photo_pool;
drop policy if exists "Bot bio pool admin" on public.bot_bio_pool;

create policy "Bot photo pool admin" on public.bot_photo_pool
  for select using (public.is_admin());

create policy "Bot photo pool admin insert" on public.bot_photo_pool
  for insert with check (public.is_admin());

create policy "Bot photo pool admin delete" on public.bot_photo_pool
  for delete using (public.is_admin());

create policy "Bot bio pool admin select" on public.bot_bio_pool
  for select using (public.is_admin());

create policy "Bot bio pool admin insert" on public.bot_bio_pool
  for insert with check (public.is_admin());

create policy "Bot bio pool admin delete" on public.bot_bio_pool
  for delete using (public.is_admin());

-- Bot name pool (admin only)

create table if not exists public.bot_name_pool (
  id uuid default uuid_generate_v4() primary key,
  gender text not null,
  name text not null,
  created_at timestamptz default now(),
  unique(gender, name)
);

alter table public.bot_name_pool enable row level security;

drop policy if exists "Bot name pool admin select" on public.bot_name_pool;
drop policy if exists "Bot name pool admin insert" on public.bot_name_pool;
drop policy if exists "Bot name pool admin delete" on public.bot_name_pool;

create policy "Bot name pool admin select" on public.bot_name_pool
  for select using (public.is_admin());

create policy "Bot name pool admin insert" on public.bot_name_pool
  for insert with check (public.is_admin());

create policy "Bot name pool admin delete" on public.bot_name_pool
  for delete using (public.is_admin());
