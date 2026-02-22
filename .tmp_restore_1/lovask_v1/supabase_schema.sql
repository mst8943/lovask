-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- USERS TABLE (Extends auth.users)
-- This table stores public user data and application-specific fields
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin', 'bot')),
  coin_balance int default 100,
  is_premium boolean default false,
  premium_expires_at timestamptz,
  created_at timestamptz default now()
);

-- PROFILES TABLE
-- Contains public profile information visible to other users
create table public.profiles (
  id uuid references public.users on delete cascade primary key,
  display_name text,
  age int,
  gender text,
  bio text,
  city text,
  photos jsonb default '[]'::jsonb, -- Array of photo URLs
  interests text[] default '{}',
  updated_at timestamptz default now()
);

-- MATCHES TABLE
-- Stores successful matches between two users
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  user_a uuid references public.users on delete cascade,
  user_b uuid references public.users on delete cascade,
  created_at timestamptz default now(),
  is_active boolean default true,
  unique(user_a, user_b)
);

-- MESSAGES TABLE
-- Stores chat messages between matched users
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches on delete cascade,
  sender_id uuid references public.users on delete cascade,
  content text,
  media_url text, -- For images/videos
  type text default 'text' check (type in ('text', 'image')),
  read_at timestamptz,
  created_at timestamptz default now()
);

-- LIKES TABLE
-- Records user likes. A mutual like triggers a match.
create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  from_user uuid references public.users on delete cascade,
  to_user uuid references public.users on delete cascade,
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

-- TRANSACTIONS TABLE
-- Immutable ledger for coin economy
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  amount int not null, -- Positive for credit, negative for debit
  type text not null check (type in ('bonus', 'purchase', 'spend', 'gift')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- STORIES TABLE
-- Temporary user stories (24h TTL handled by application logic or cron)
create table public.stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  media_url text not null,
  media_type text default 'image' check (media_type in ('image','video')),
  expires_at timestamptz default (now() + interval '24 hours'),
  views_count int default 0,
  created_at timestamptz default now()
);

-- BOT CONFIGS TABLE
-- Stores AI personality and behavior settings for bot users
create table public.bot_configs (
  user_id uuid references public.users on delete cascade primary key,
  personality_prompt text,
  behavior_settings jsonb default '{}'::jsonb
);

-- REPORTS TABLE
-- User reporting system
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.users on delete set null,
  reported_id uuid references public.users on delete cascade,
  reason text,
  status text default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling RLS on all tables
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.likes enable row level security;
alter table public.transactions enable row level security;
alter table public.stories enable row level security;
alter table public.bot_configs enable row level security;
alter table public.reports enable row level security;

-- USERS POLICIES
create policy "Users can view their own private data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid() = id);

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- LIKES POLICIES
create policy "Users can create likes" on public.likes
  for insert with check (auth.uid() = from_user);

create policy "Users can view likes they sent" on public.likes
  for select using (auth.uid() = from_user);

-- MATCHES POLICIES
create policy "Users can view their matches" on public.matches
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- MESSAGES POLICIES
create policy "Users can view messages in their matches" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Users can insert messages to their matches" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- STORAGE BUCKET POLICIES (Assuming buckets 'avatars' and 'stories' exist)
-- Note: Must be executed in SQL Editor as Storage policies are slightly different
-- but here is the logic:
-- Avatars: Public Read, Auth Insert/Update (Own folder)
-- Stories: Public Read, Auth Insert (Own folder)

-- TRIGGER FOR NEW USER CREATION
-- Automatically creates a public.users entry when a new user signs up via Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, coin_balance)
  values (new.id, new.email, 100);
  
  insert into public.transactions (user_id, amount, type, metadata)
  values (new.id, 100, 'bonus', '{"reason": "signup_bonus"}'::jsonb);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
