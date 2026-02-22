-- CRITICAL PERFORMANCE INDEXES
-- Based on Audit Report 2026-02-18

-- 1. Matches Table: Critical for all RLS and queries involving relationships
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b);
CREATE INDEX IF NOT EXISTS idx_matches_is_active ON public.matches(is_active);

-- 2. Messages Table: Critical for chat load speed and RLS checks
-- Most queries filter by match_id and order by created_at
CREATE INDEX IF NOT EXISTS idx_messages_match_id_created_at ON public.messages(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
-- Index for unread counts
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(match_id, read_at) WHERE read_at IS NULL;

-- 3. Likes Table: Critical for "Liked You" page and matching logic
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON public.likes(to_user);
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON public.likes(from_user);

-- 4. Notifications: Critical for the bell icon queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications(user_id, is_read);

-- 5. Profiles: Critical for Feed filtering
-- GIN index for array columns which are often filtered
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON public.profiles(age);
-- If we filter by interests often:
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON public.profiles USING GIN (interests);

-- 6. Optimizing RLS Helper Lookups
-- If typing_status or online checks use match_id:
CREATE INDEX IF NOT EXISTS idx_typing_status_match_id ON public.typing_status(match_id);

-- 7. Bot Configs
CREATE INDEX IF NOT EXISTS idx_bot_configs_user_id ON public.bot_configs(user_id);
