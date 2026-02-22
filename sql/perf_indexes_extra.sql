-- Extra performance indexes for feed RPC / filters
-- Run in Supabase SQL editor after perf_indexes.sql

begin;

create index if not exists idx_profile_variants_active
  on public.profile_variants (user_id)
  where is_active = true;

create index if not exists idx_users_last_active
  on public.users (last_active_at desc);

create index if not exists idx_profiles_interests_gin
  on public.profiles using gin (interests);

create index if not exists idx_blocks_blocker_blocked
  on public.blocks (blocker_id, blocked_id);

create index if not exists idx_blocks_blocked_blocker
  on public.blocks (blocked_id, blocker_id);

commit;
