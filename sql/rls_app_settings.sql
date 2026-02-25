-- Harden app_settings access: public read for safe keys, admin for all.
alter table public.app_settings enable row level security;

drop policy if exists "App settings public read" on public.app_settings;
create policy "App settings public read" on public.app_settings
  for select using (
    key in (
      'feature_flags',
      'feature_rollout',
      'payment_settings',
      'profile_variant_approvals',
      'profile_variants_enabled'
    )
  );

drop policy if exists "App settings admin access" on public.app_settings;
create policy "App settings admin access" on public.app_settings
  for all using (public.is_admin());
