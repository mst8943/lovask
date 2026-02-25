-- Incremental schema additions for full feature set

-- Helper: admin check (bypasses RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- USERS extensions
alter table public.users add column if not exists last_login_at timestamptz;
alter table public.users add column if not exists last_active_at timestamptz;
alter table public.users add column if not exists referral_code text;
alter table public.users add column if not exists referred_by uuid references public.users on delete set null;
alter table public.users add column if not exists is_banned boolean default false;
alter table public.users add column if not exists ban_reason text;
alter table public.users add column if not exists ban_expires_at timestamptz;
alter table public.users add column if not exists is_hidden boolean default false;

-- PROFILES extensions
alter table public.profiles add column if not exists location_lat numeric;
alter table public.profiles add column if not exists location_lng numeric;
alter table public.profiles add column if not exists distance_km_pref int default 50;
alter table public.profiles add column if not exists gender_pref text[] default '{}';
alter table public.profiles add column if not exists age_min_pref int default 18;
alter table public.profiles add column if not exists age_max_pref int default 99;
alter table public.profiles add column if not exists hide_from_discovery boolean default false;
alter table public.profiles add column if not exists looking_for_genders text[] default '{}'::text[];

-- FAVORITES
create table if not exists public.favorites (
  id uuid default uuid_generate_v4() primary key,
  from_user uuid references public.users on delete cascade,
  to_user uuid references public.users on delete cascade,
  created_at timestamptz default now(),
  unique(from_user, to_user)
);

-- BLOCKS
create table if not exists public.blocks (
  id uuid default uuid_generate_v4() primary key,
  blocker_id uuid references public.users on delete cascade,
  blocked_id uuid references public.users on delete cascade,
  reason text,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

-- PROFILE VIEWS
create table if not exists public.profile_views (
  id uuid default uuid_generate_v4() primary key,
  viewer_id uuid references public.users on delete set null,
  viewed_id uuid references public.users on delete cascade,
  created_at timestamptz default now()
);

-- TYPING STATUS
create table if not exists public.typing_status (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches on delete cascade,
  user_id uuid references public.users on delete cascade,
  is_typing boolean default false,
  updated_at timestamptz default now(),
  unique(match_id, user_id)
);

-- STORY VIEWS
create table if not exists public.story_views (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories on delete cascade,
  viewer_id uuid references public.users on delete set null,
  created_at timestamptz default now(),
  unique(story_id, viewer_id)
);

-- BOOSTS
create table if not exists public.boosts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text default 'purchase' check (source in ('purchase','daily','promo')),
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  type text not null,
  payload jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- USER SETTINGS
create table if not exists public.user_settings (
  user_id uuid references public.users on delete cascade primary key,
  push_enabled boolean default true,
  email_enabled boolean default true,
  match_notifications boolean default true,
  message_notifications boolean default true,
  hide_from_discovery boolean default false
);

-- SUBSCRIPTIONS
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  status text default 'active' check (status in ('active','canceled','expired','pending')),
  plan text default 'monthly',
  provider text default 'bank_transfer',
  started_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz default now()
);

-- BANK TRANSFERS
create table if not exists public.bank_transfers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade,
  kind text not null check (kind in ('coins','premium')),
  amount int not null,
  currency text default 'TRY',
  status text default 'pending' check (status in ('pending','verified','rejected')),
  reference text,
  receipt_url text,
  admin_id uuid references public.users on delete set null,
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- AI USAGE
create table if not exists public.ai_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete set null,
  bot_id uuid references public.users on delete set null,
  model text,
  tokens_in int default 0,
  tokens_out int default 0,
  cost_usd numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.ai_cost_limits (
  id uuid default uuid_generate_v4() primary key,
  date date unique,
  daily_limit_usd numeric default 0,
  spent_usd numeric default 0
);

-- ADMIN AUDIT LOGS
create table if not exists public.admin_audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.users on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- BOT GROUPS
create table if not exists public.bot_groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  prompt text,
  behavior_settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- BOT SCHEDULES
create table if not exists public.bot_schedules (
  id uuid default uuid_generate_v4() primary key,
  bot_id uuid references public.users on delete cascade,
  timezone text default 'UTC',
  active_hours jsonb default '[]'::jsonb,
  daily_message_limit int default 50,
  daily_new_chat_limit int default 10,
  response_delay_min_s int default 5,
  response_delay_max_s int default 45,
  intensity int default 50,
  created_at timestamptz default now()
);

-- RLS
alter table public.favorites enable row level security;
alter table public.blocks enable row level security;
alter table public.profile_views enable row level security;
alter table public.typing_status enable row level security;
alter table public.story_views enable row level security;
alter table public.boosts enable row level security;
alter table public.notifications enable row level security;
alter table public.user_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.bank_transfers enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_cost_limits enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.bot_groups enable row level security;
alter table public.bot_schedules enable row level security;

-- POLICY UPDATES
create policy "Users can view their own private data or admin" on public.users
  for select using (auth.uid() = id or public.is_admin());

create policy "Users can update their own data or admin" on public.users
  for update using (auth.uid() = id or public.is_admin());

create policy "Profiles update own or admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

create policy "Favorites insert" on public.favorites
  for insert with check (auth.uid() = from_user);

create policy "Favorites select own" on public.favorites
  for select using (auth.uid() = from_user or public.is_admin());

create policy "Blocks insert" on public.blocks
  for insert with check (auth.uid() = blocker_id);

create policy "Blocks select own" on public.blocks
  for select using (auth.uid() = blocker_id or public.is_admin());

create policy "Profile views insert" on public.profile_views
  for insert with check (auth.uid() = viewer_id);

create policy "Profile views select for viewed" on public.profile_views
  for select using (auth.uid() = viewed_id or public.is_admin());

create policy "Typing select for match" on public.typing_status
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Typing upsert for match" on public.typing_status
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Typing update for match" on public.typing_status
  for update using (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Story views insert" on public.story_views
  for insert with check (auth.uid() = viewer_id);

create policy "Story views select for owner" on public.story_views
  for select using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    ) or public.is_admin()
  );

create policy "Boosts insert own" on public.boosts
  for insert with check (auth.uid() = user_id);

create policy "Boosts select own" on public.boosts
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Boosts select active public" on public.boosts
  for select using (ends_at > now());

create policy "Notifications select own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Notifications update own" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Settings select own" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Settings upsert own" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "Settings update own" on public.user_settings
  for update using (auth.uid() = user_id);

create policy "Subscriptions select own" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Subscriptions insert own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Bank transfers insert own" on public.bank_transfers
  for insert with check (auth.uid() = user_id);

create policy "Bank transfers select own or admin" on public.bank_transfers
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Bank transfers update admin" on public.bank_transfers
  for update using (public.is_admin());

create policy "AI usage insert" on public.ai_usage
  for insert with check (auth.uid() = user_id);

create policy "AI usage select admin" on public.ai_usage
  for select using (public.is_admin());

create policy "AI cost limits admin" on public.ai_cost_limits
  for select using (public.is_admin());

create policy "AI cost limits update admin" on public.ai_cost_limits
  for update using (public.is_admin());

create policy "Admin audit logs admin" on public.admin_audit_logs
  for select using (public.is_admin());

create policy "Admin audit logs insert admin" on public.admin_audit_logs
  for insert with check (public.is_admin());

create policy "Bot groups admin" on public.bot_groups
  for select using (public.is_admin());

create policy "Bot groups insert admin" on public.bot_groups
  for insert with check (public.is_admin());

create policy "Bot groups update admin" on public.bot_groups
  for update using (public.is_admin());

create policy "Bot schedules admin" on public.bot_schedules
  for select using (public.is_admin());

create policy "Bot schedules insert admin" on public.bot_schedules
  for insert with check (public.is_admin());

create policy "Bot schedules update admin" on public.bot_schedules
  for update using (public.is_admin());

-- MESSAGE READ RECEIPTS
create policy "Messages update read_at by match participant" on public.messages
  for update using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- INDEXES
create index if not exists idx_favorites_from_user on public.favorites (from_user);
create index if not exists idx_blocks_blocker_id on public.blocks (blocker_id);
create index if not exists idx_profile_views_viewed_id on public.profile_views (viewed_id);
create index if not exists idx_typing_status_match_id on public.typing_status (match_id);
create index if not exists idx_story_views_story_id on public.story_views (story_id);
create index if not exists idx_boosts_user_id on public.boosts (user_id);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_bank_transfers_user_id on public.bank_transfers (user_id);
create index if not exists idx_ai_usage_user_id on public.ai_usage (user_id);
create index if not exists idx_bot_schedules_bot_id on public.bot_schedules (bot_id);
