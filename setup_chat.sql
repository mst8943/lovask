-- MATCES TABLE
create table if not exists public.matches (
  id uuid default uuid_generate_v4() primary key,
  user_a uuid references public.profiles(id) on delete cascade not null,
  user_b uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  is_active boolean default true,
  unique(user_a, user_b)
);

-- MESSAGES TABLE
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  type text default 'text', -- 'text', 'image', 'audio'
  media_url text,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- RLS for Matches
alter table public.matches enable row level security;

create policy "Users can view their matches"
  on public.matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "System can insert matches" 
  on public.matches for insert 
  with check (true); -- Usually restricted to server-side or triggered by likes

-- RLS for Messages
alter table public.messages enable row level security;

create policy "Users can view messages in their matches"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Users can insert messages in their matches"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );
