# Lovask / Aura Master Plan

## Scope
Responsive web app first. PWA hardening and push after core web features are complete.
Payment is bank transfer only for now.

## Current Baseline (from repo)
Auth email/password + Google. Onboarding basic info + photos. Swipe feed. Matches + realtime chat. Coin balance + premium flag. Basic PWA manifest.

## Target Outcomes
Unified web app with full feature set described in master prompt.
Admin panel with moderation, bots, economy, analytics.
AI bot system via OpenRouter with cost controls.
PWA installable and reliable sync.

## Milestones
1. Data model and RLS complete for all required features.
2. Auth and account settings complete. Profile completion enforced.
3. Discovery feed v2 with list cards, filters, favorites, profile detail, view tracking.
4. Chat v2 with typing, read receipts, images, coin refund on reply, realtime sync.
5. Economy and premium perks enforced. Boosts. Bank transfer flow for coins and subscription.
6. Stories system with limits and highlights.
7. Safety and moderation: report, block, ban, abuse checks.
8. AI bot system with OpenRouter, scheduling, rate limits, personalities.
9. Admin panel with analytics and controls.
10. PWA hardening, offline strategy, push notifications.
11. QA, performance, SEO, error handling polish.

## Data Model Additions
users table additions: last_login_at, referral_code, referred_by, is_banned, ban_reason, ban_expires_at, is_hidden, last_active_at
profiles additions: location_lat, location_lng, distance_km_pref, gender_pref, age_min_pref, age_max_pref, hide_from_discovery
favorites table
blocks table
profile_views table
typing_status table or realtime presence via channel
message_reads table or read_at updates with policy
story_views table
boosts table
notifications table
subscriptions table
bank_transfers table
ai_usage table
ai_cost_limits table
admin_audit_logs table
bot_groups table
bot_schedules table

## Pages and Routes
Public: /, /login, /register, /forgot
Onboarding: /onboarding
Main: /feed, /feed/filters, /profile, /profile/edit, /profiles/[id]
Matches: /matches, /matches/[id]
Stories: /stories, /stories/[id]
Settings: /settings, /settings/privacy, /settings/notifications, /settings/account
Store: /store, /store/coins, /store/premium
Admin: /admin, /admin/users, /admin/reports, /admin/bots, /admin/ai, /admin/transactions

## Backend Services
Supabase RPCs for feed query, match creation, coin spend with transaction log, refund on reply, boost activation, story expiration, bot message scheduling.

## Bank Transfer Payment Flow
Create bank transfer request. Admin marks as verified. Coins or premium applied. Full audit log.

## Next Implementation Steps
A. Extend schema and RLS policies.
B. Add settings and account management.
C. Replace swipe feed with list feed + filters + profile detail.
D. Upgrade chat features.
