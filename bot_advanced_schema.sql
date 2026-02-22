-- Advanced bot controls

create table if not exists public.bot_global_settings (
  id uuid default uuid_generate_v4() primary key,
  global_prompt text,
  tone text default 'playful',
  language_mode text default 'auto',
  auto_like_rate int default 5, -- percent
  engagement_intensity text default 'medium',
  cooldown_hours int default 72,
  active_hours jsonb default '[]'::jsonb,
  response_delay_min_s int default 3,
  response_delay_max_s int default 12,
  read_receipt_delay_s int default 10,
  auto_story boolean default false,
  profile_rotation_minutes int default 0,
  allow_initiate boolean default false,
  updated_at timestamptz default now()
);

alter table public.bot_global_settings enable row level security;
drop policy if exists "Bot global settings admin" on public.bot_global_settings;
create policy "Bot global settings admin" on public.bot_global_settings
  for select using (public.is_admin());

create policy "Bot global settings update admin" on public.bot_global_settings
  for update using (public.is_admin());

create policy "Bot global settings insert admin" on public.bot_global_settings
  for insert with check (public.is_admin());

-- Extend bot_configs with new fields
alter table public.bot_configs add column if not exists tone text;
alter table public.bot_configs add column if not exists language_mode text;
alter table public.bot_configs add column if not exists auto_like_rate int;
alter table public.bot_configs add column if not exists engagement_intensity text;
alter table public.bot_configs add column if not exists cooldown_hours int;
alter table public.bot_configs add column if not exists active_hours jsonb;
alter table public.bot_configs add column if not exists response_delay_min_s int;
alter table public.bot_configs add column if not exists response_delay_max_s int;
alter table public.bot_configs add column if not exists read_receipt_delay_s int;
alter table public.bot_configs add column if not exists auto_story boolean;
alter table public.bot_configs add column if not exists profile_rotation_minutes int;
alter table public.bot_configs add column if not exists allow_initiate boolean;

-- Override flag
alter table public.bot_configs add column if not exists use_global boolean default true;

-- Extend bot_groups with override fields
alter table public.bot_groups add column if not exists tone text;
alter table public.bot_groups add column if not exists language_mode text;
alter table public.bot_groups add column if not exists auto_like_rate int;
alter table public.bot_groups add column if not exists engagement_intensity text;
alter table public.bot_groups add column if not exists cooldown_hours int;
alter table public.bot_groups add column if not exists active_hours jsonb;
alter table public.bot_groups add column if not exists response_delay_min_s int;
alter table public.bot_groups add column if not exists response_delay_max_s int;
alter table public.bot_groups add column if not exists read_receipt_delay_s int;
alter table public.bot_groups add column if not exists auto_story boolean;
alter table public.bot_groups add column if not exists profile_rotation_minutes int;

-- Bot activity history for cooldown
create table if not exists public.bot_user_cooldowns (
  id uuid default uuid_generate_v4() primary key,
  bot_id uuid references public.users on delete cascade,
  user_id uuid references public.users on delete cascade,
  last_interaction_at timestamptz default now(),
  unique(bot_id, user_id)
);

alter table public.bot_user_cooldowns enable row level security;
drop policy if exists "Bot cooldowns admin" on public.bot_user_cooldowns;
create policy "Bot cooldowns admin" on public.bot_user_cooldowns
  for select using (public.is_admin());

-- Bot maintenance log
create table if not exists public.bot_maintenance_logs (
  id uuid default uuid_generate_v4() primary key,
  ran_at timestamptz default now(),
  notes text
);
