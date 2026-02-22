-- Performance indexes for feed/chat/realtime
-- Run in Supabase SQL editor

begin;

create index if not exists idx_messages_match_created_at
  on public.messages (match_id, created_at desc);

create index if not exists idx_messages_match_sender_read
  on public.messages (match_id, sender_id, read_at);

create index if not exists idx_likes_from_to
  on public.likes (from_user, to_user);

create index if not exists idx_passes_from_to
  on public.passes (from_user, to_user);

create index if not exists idx_blocks_blocker
  on public.blocks (blocker_id);

create index if not exists idx_blocks_blocked
  on public.blocks (blocked_id);

create index if not exists idx_matches_user_a
  on public.matches (user_a);

create index if not exists idx_matches_user_b
  on public.matches (user_b);

create index if not exists idx_profiles_discovery_updated
  on public.profiles (updated_at desc)
  where hide_from_discovery = false;

create index if not exists idx_chat_states_user_match
  on public.chat_states (user_id, match_id);

create index if not exists idx_typing_status_match_user
  on public.typing_status (match_id, user_id);

create index if not exists idx_profile_views_viewed
  on public.profile_views (viewed_id, created_at desc);

create index if not exists idx_story_views_story
  on public.story_views (story_id, created_at desc);

create index if not exists idx_gift_sends_match
  on public.gift_sends (match_id, created_at desc);

create index if not exists idx_transactions_user
  on public.transactions (user_id, created_at desc);

create index if not exists idx_payments_user
  on public.payments (user_id, created_at desc);

create index if not exists idx_bank_transfers_user
  on public.bank_transfers (user_id, created_at desc);

create index if not exists idx_boosts_user
  on public.boosts (user_id, ends_at desc);

commit;
