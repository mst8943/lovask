-- Feed RPC performance tuning
-- Run in Supabase SQL editor after feed_rpc.sql

begin;

create index if not exists idx_profiles_discovery_updated_id
  on public.profiles (updated_at desc, id desc)
  where hide_from_discovery = false;

create index if not exists idx_profile_variants_user_active
  on public.profile_variants (user_id)
  where is_active = true;

create index if not exists idx_users_last_active
  on public.users (last_active_at desc);

commit;
