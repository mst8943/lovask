-- RLS hardening for user-facing tables
-- Run in Supabase SQL editor (service role)

begin;

-- Likes
alter table if exists public.likes enable row level security;
drop policy if exists "Likes select own" on public.likes;
drop policy if exists "Likes insert own" on public.likes;
drop policy if exists "Likes delete own" on public.likes;
create policy "Likes select own" on public.likes
  for select using (from_user = auth.uid() or to_user = auth.uid() or is_admin());
create policy "Likes insert own" on public.likes
  for insert with check (from_user = auth.uid() or is_admin());
create policy "Likes delete own" on public.likes
  for delete using (from_user = auth.uid() or is_admin());

-- Passes
alter table if exists public.passes enable row level security;
drop policy if exists "Passes select own" on public.passes;
drop policy if exists "Passes insert own" on public.passes;
drop policy if exists "Passes delete own" on public.passes;
create policy "Passes select own" on public.passes
  for select using (from_user = auth.uid() or is_admin());
create policy "Passes insert own" on public.passes
  for insert with check (from_user = auth.uid() or is_admin());
create policy "Passes delete own" on public.passes
  for delete using (from_user = auth.uid() or is_admin());

-- Blocks
alter table if exists public.blocks enable row level security;
drop policy if exists "Blocks select own" on public.blocks;
drop policy if exists "Blocks insert own" on public.blocks;
drop policy if exists "Blocks delete own" on public.blocks;
create policy "Blocks select own" on public.blocks
  for select using (blocker_id = auth.uid() or blocked_id = auth.uid() or is_admin());
create policy "Blocks insert own" on public.blocks
  for insert with check (blocker_id = auth.uid() or is_admin());
create policy "Blocks delete own" on public.blocks
  for delete using (blocker_id = auth.uid() or is_admin());

-- Favorites
alter table if exists public.favorites enable row level security;
drop policy if exists "Favorites select own" on public.favorites;
drop policy if exists "Favorites insert own" on public.favorites;
drop policy if exists "Favorites delete own" on public.favorites;
create policy "Favorites select own" on public.favorites
  for select using (from_user = auth.uid() or is_admin());
create policy "Favorites insert own" on public.favorites
  for insert with check (from_user = auth.uid() or is_admin());
create policy "Favorites delete own" on public.favorites
  for delete using (from_user = auth.uid() or is_admin());

-- Super likes
alter table if exists public.super_likes enable row level security;
drop policy if exists "Super likes select own" on public.super_likes;
drop policy if exists "Super likes insert own" on public.super_likes;
create policy "Super likes select own" on public.super_likes
  for select using (from_user = auth.uid() or to_user = auth.uid() or is_admin());
create policy "Super likes insert own" on public.super_likes
  for insert with check (from_user = auth.uid() or is_admin());

-- Matches
alter table if exists public.matches enable row level security;
drop policy if exists "Matches select participant" on public.matches;
drop policy if exists "Matches insert participant" on public.matches;
drop policy if exists "Matches update participant" on public.matches;
create policy "Matches select participant" on public.matches
  for select using (user_a = auth.uid() or user_b = auth.uid() or is_admin());
create policy "Matches insert participant" on public.matches
  for insert with check (user_a = auth.uid() or user_b = auth.uid() or is_admin());
create policy "Matches update participant" on public.matches
  for update using (user_a = auth.uid() or user_b = auth.uid() or is_admin());

-- Chat states
alter table if exists public.chat_states enable row level security;
drop policy if exists "Chat states select own" on public.chat_states;
drop policy if exists "Chat states insert own" on public.chat_states;
drop policy if exists "Chat states update own" on public.chat_states;
drop policy if exists "Chat states delete own" on public.chat_states;
create policy "Chat states select own" on public.chat_states
  for select using (user_id = auth.uid() or is_admin());
create policy "Chat states insert own" on public.chat_states
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Chat states update own" on public.chat_states
  for update using (user_id = auth.uid() or is_admin());
create policy "Chat states delete own" on public.chat_states
  for delete using (user_id = auth.uid() or is_admin());

-- Typing status
alter table if exists public.typing_status enable row level security;
drop policy if exists "Typing select participant" on public.typing_status;
drop policy if exists "Typing insert own" on public.typing_status;
drop policy if exists "Typing update own" on public.typing_status;
drop policy if exists "Typing delete own" on public.typing_status;
create policy "Typing select participant" on public.typing_status
  for select using (
    is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.matches m
      where m.id = typing_status.match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );
create policy "Typing insert own" on public.typing_status
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Typing update own" on public.typing_status
  for update using (user_id = auth.uid() or is_admin());
create policy "Typing delete own" on public.typing_status
  for delete using (user_id = auth.uid() or is_admin());

-- Chat initiations
alter table if exists public.chat_initiations enable row level security;
drop policy if exists "Chat initiations select own" on public.chat_initiations;
drop policy if exists "Chat initiations insert own" on public.chat_initiations;
drop policy if exists "Chat initiations update own" on public.chat_initiations;
create policy "Chat initiations select own" on public.chat_initiations
  for select using (initiator_id = auth.uid() or is_admin());
create policy "Chat initiations insert own" on public.chat_initiations
  for insert with check (initiator_id = auth.uid() or is_admin());
create policy "Chat initiations update own" on public.chat_initiations
  for update using (initiator_id = auth.uid() or is_admin());

-- Read receipt unlocks
alter table if exists public.read_receipt_unlocks enable row level security;
drop policy if exists "Read receipt select own" on public.read_receipt_unlocks;
drop policy if exists "Read receipt insert own" on public.read_receipt_unlocks;
create policy "Read receipt select own" on public.read_receipt_unlocks
  for select using (user_id = auth.uid() or is_admin());
create policy "Read receipt insert own" on public.read_receipt_unlocks
  for insert with check (user_id = auth.uid() or is_admin());

-- Access unlocks
alter table if exists public.access_unlocks enable row level security;
drop policy if exists "Access unlocks select own" on public.access_unlocks;
drop policy if exists "Access unlocks insert own" on public.access_unlocks;
create policy "Access unlocks select own" on public.access_unlocks
  for select using (user_id = auth.uid() or is_admin());
create policy "Access unlocks insert own" on public.access_unlocks
  for insert with check (user_id = auth.uid() or is_admin());

-- Liked-you unlocks
alter table if exists public.liked_you_unlocks enable row level security;
drop policy if exists "Liked you select own" on public.liked_you_unlocks;
drop policy if exists "Liked you insert own" on public.liked_you_unlocks;
create policy "Liked you select own" on public.liked_you_unlocks
  for select using (user_id = auth.uid() or is_admin());
create policy "Liked you insert own" on public.liked_you_unlocks
  for insert with check (user_id = auth.uid() or is_admin());

-- Profile views
alter table if exists public.profile_views enable row level security;
drop policy if exists "Profile views select own" on public.profile_views;
drop policy if exists "Profile views insert own" on public.profile_views;
create policy "Profile views select own" on public.profile_views
  for select using (viewer_id = auth.uid() or viewed_id = auth.uid() or is_admin());
create policy "Profile views insert own" on public.profile_views
  for insert with check (viewer_id = auth.uid() or is_admin());

-- Story views
alter table if exists public.story_views enable row level security;
drop policy if exists "Story views select own" on public.story_views;
drop policy if exists "Story views insert own" on public.story_views;
create policy "Story views select own" on public.story_views
  for select using (
    is_admin()
    or viewer_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_views.story_id
        and s.user_id = auth.uid()
    )
  );
create policy "Story views insert own" on public.story_views
  for insert with check (viewer_id = auth.uid() or is_admin());

-- Gifts
alter table if exists public.gifts enable row level security;
drop policy if exists "Gifts select active" on public.gifts;
drop policy if exists "Gifts admin write" on public.gifts;
create policy "Gifts select active" on public.gifts
  for select using (is_active = true or is_admin());
create policy "Gifts admin write" on public.gifts
  for all using (is_admin()) with check (is_admin());

-- Gift sends
alter table if exists public.gift_sends enable row level security;
drop policy if exists "Gift sends select own" on public.gift_sends;
drop policy if exists "Gift sends insert own" on public.gift_sends;
create policy "Gift sends select own" on public.gift_sends
  for select using (from_user = auth.uid() or to_user = auth.uid() or is_admin());
create policy "Gift sends insert own" on public.gift_sends
  for insert with check (from_user = auth.uid() or is_admin());

-- Boosts
alter table if exists public.boosts enable row level security;
drop policy if exists "Boosts select own" on public.boosts;
drop policy if exists "Boosts insert own" on public.boosts;
create policy "Boosts select own" on public.boosts
  for select using (user_id = auth.uid() or is_admin());
create policy "Boosts insert own" on public.boosts
  for insert with check (user_id = auth.uid() or is_admin());

-- Bank transfers
alter table if exists public.bank_transfers enable row level security;
drop policy if exists "Bank transfers select own" on public.bank_transfers;
drop policy if exists "Bank transfers insert own" on public.bank_transfers;
drop policy if exists "Bank transfers admin update" on public.bank_transfers;
create policy "Bank transfers select own" on public.bank_transfers
  for select using (user_id = auth.uid() or is_admin());
create policy "Bank transfers insert own" on public.bank_transfers
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Bank transfers admin update" on public.bank_transfers
  for update using (is_admin()) with check (is_admin());

-- Payments
alter table if exists public.payments enable row level security;
drop policy if exists "Payments select own" on public.payments;
drop policy if exists "Payments insert own" on public.payments;
drop policy if exists "Payments admin update" on public.payments;
create policy "Payments select own" on public.payments
  for select using (user_id = auth.uid() or is_admin());
create policy "Payments insert own" on public.payments
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Payments admin update" on public.payments
  for update using (is_admin()) with check (is_admin());

-- Transactions
alter table if exists public.transactions enable row level security;
drop policy if exists "Transactions select own" on public.transactions;
drop policy if exists "Transactions insert own" on public.transactions;
drop policy if exists "Transactions admin update" on public.transactions;
create policy "Transactions select own" on public.transactions
  for select using (user_id = auth.uid() or is_admin());
create policy "Transactions insert own" on public.transactions
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Transactions admin update" on public.transactions
  for update using (is_admin()) with check (is_admin());

-- Access plans (public read, admin write)
alter table if exists public.access_plans enable row level security;
drop policy if exists "Access plans select" on public.access_plans;
drop policy if exists "Access plans admin write" on public.access_plans;
create policy "Access plans select" on public.access_plans
  for select using (true);
create policy "Access plans admin write" on public.access_plans
  for all using (is_admin()) with check (is_admin());

-- App settings (public read, admin write)
alter table if exists public.app_settings enable row level security;
drop policy if exists "App settings select" on public.app_settings;
drop policy if exists "App settings admin write" on public.app_settings;
create policy "App settings select" on public.app_settings
  for select using (true);
create policy "App settings admin write" on public.app_settings
  for all using (is_admin()) with check (is_admin());

-- Reports
alter table if exists public.reports enable row level security;
drop policy if exists "Reports insert own" on public.reports;
drop policy if exists "Reports admin select" on public.reports;
drop policy if exists "Reports admin update" on public.reports;
create policy "Reports insert own" on public.reports
  for insert with check (reporter_id = auth.uid() or is_admin());
create policy "Reports admin select" on public.reports
  for select using (is_admin());
create policy "Reports admin update" on public.reports
  for update using (is_admin()) with check (is_admin());

-- Support tickets
alter table if exists public.support_tickets enable row level security;
drop policy if exists "Support select own" on public.support_tickets;
drop policy if exists "Support insert own" on public.support_tickets;
drop policy if exists "Support admin update" on public.support_tickets;
create policy "Support select own" on public.support_tickets
  for select using (user_id = auth.uid() or is_admin());
create policy "Support insert own" on public.support_tickets
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Support admin update" on public.support_tickets
  for update using (is_admin()) with check (is_admin());

-- User verifications
alter table if exists public.user_verifications enable row level security;
drop policy if exists "Verifications select own" on public.user_verifications;
drop policy if exists "Verifications insert own" on public.user_verifications;
drop policy if exists "Verifications admin update" on public.user_verifications;
create policy "Verifications select own" on public.user_verifications
  for select using (user_id = auth.uid() or is_admin());
create policy "Verifications insert own" on public.user_verifications
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Verifications admin update" on public.user_verifications
  for update using (is_admin()) with check (is_admin());

-- Push subscriptions
alter table if exists public.push_subscriptions enable row level security;
drop policy if exists "Push subs select own" on public.push_subscriptions;
drop policy if exists "Push subs insert own" on public.push_subscriptions;
drop policy if exists "Push subs update own" on public.push_subscriptions;
drop policy if exists "Push subs delete own" on public.push_subscriptions;
create policy "Push subs select own" on public.push_subscriptions
  for select using (user_id = auth.uid() or is_admin());
create policy "Push subs insert own" on public.push_subscriptions
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Push subs update own" on public.push_subscriptions
  for update using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
create policy "Push subs delete own" on public.push_subscriptions
  for delete using (user_id = auth.uid() or is_admin());

commit;
