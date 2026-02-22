-- Extra RLS policies for admin/bot tables and profile variants
-- Run in Supabase SQL editor after rls_hardening.sql

begin;

-- Bot configs (admin only)
alter table if exists public.bot_configs enable row level security;
drop policy if exists "Bot configs admin" on public.bot_configs;
create policy "Bot configs admin" on public.bot_configs
  for all using (is_admin()) with check (is_admin());

-- Bot groups (admin only)
alter table if exists public.bot_groups enable row level security;
drop policy if exists "Bot groups admin" on public.bot_groups;
create policy "Bot groups admin" on public.bot_groups
  for all using (is_admin()) with check (is_admin());

-- Bot global settings (admin only)
alter table if exists public.bot_global_settings enable row level security;
drop policy if exists "Bot global settings admin" on public.bot_global_settings;
create policy "Bot global settings admin" on public.bot_global_settings
  for all using (is_admin()) with check (is_admin());

-- Bot pools (admin only)
alter table if exists public.bot_name_pool enable row level security;
drop policy if exists "Bot name pool admin" on public.bot_name_pool;
create policy "Bot name pool admin" on public.bot_name_pool
  for all using (is_admin()) with check (is_admin());

alter table if exists public.bot_bio_pool enable row level security;
drop policy if exists "Bot bio pool admin" on public.bot_bio_pool;
create policy "Bot bio pool admin" on public.bot_bio_pool
  for all using (is_admin()) with check (is_admin());

alter table if exists public.bot_photo_pool enable row level security;
drop policy if exists "Bot photo pool admin" on public.bot_photo_pool;
create policy "Bot photo pool admin" on public.bot_photo_pool
  for all using (is_admin()) with check (is_admin());

-- Bot schedules (admin only)
alter table if exists public.bot_schedules enable row level security;
drop policy if exists "Bot schedules admin" on public.bot_schedules;
create policy "Bot schedules admin" on public.bot_schedules
  for all using (is_admin()) with check (is_admin());

-- Bot chat overrides (admin only)
alter table if exists public.bot_chat_overrides enable row level security;
drop policy if exists "Bot chat overrides admin" on public.bot_chat_overrides;
create policy "Bot chat overrides admin" on public.bot_chat_overrides
  for all using (is_admin()) with check (is_admin());

-- Bot maintenance logs (admin only)
alter table if exists public.bot_maintenance_logs enable row level security;
drop policy if exists "Bot maintenance logs admin" on public.bot_maintenance_logs;
create policy "Bot maintenance logs admin" on public.bot_maintenance_logs
  for all using (is_admin()) with check (is_admin());

-- Bot user cooldowns (admin only)
alter table if exists public.bot_user_cooldowns enable row level security;
drop policy if exists "Bot cooldowns admin" on public.bot_user_cooldowns;
create policy "Bot cooldowns admin" on public.bot_user_cooldowns
  for all using (is_admin()) with check (is_admin());

-- AI usage (admin only)
alter table if exists public.ai_usage enable row level security;
drop policy if exists "AI usage admin" on public.ai_usage;
create policy "AI usage admin" on public.ai_usage
  for all using (is_admin()) with check (is_admin());

-- Admin audit logs (admin only)
alter table if exists public.admin_audit_logs enable row level security;
drop policy if exists "Admin audit logs admin" on public.admin_audit_logs;
create policy "Admin audit logs admin" on public.admin_audit_logs
  for all using (is_admin()) with check (is_admin());

-- Profile variants: allow active variants to be read, owners to manage
alter table if exists public.profile_variants enable row level security;
drop policy if exists "Profile variants select" on public.profile_variants;
drop policy if exists "Profile variants insert own" on public.profile_variants;
drop policy if exists "Profile variants update own" on public.profile_variants;
drop policy if exists "Profile variants delete own" on public.profile_variants;
create policy "Profile variants select" on public.profile_variants
  for select using (is_active = true or user_id = auth.uid() or is_admin());
create policy "Profile variants insert own" on public.profile_variants
  for insert with check (user_id = auth.uid() or is_admin());
create policy "Profile variants update own" on public.profile_variants
  for update using (user_id = auth.uid() or is_admin());
create policy "Profile variants delete own" on public.profile_variants
  for delete using (user_id = auth.uid() or is_admin());

commit;
