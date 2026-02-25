-- Bot admin policies

drop policy if exists "Bot configs admin select" on public.bot_configs;
drop policy if exists "Bot configs admin update" on public.bot_configs;
drop policy if exists "Bot configs admin insert" on public.bot_configs;

create policy "Bot configs admin select" on public.bot_configs
  for select using (public.is_admin());

create policy "Bot configs admin insert" on public.bot_configs
  for insert with check (public.is_admin());

create policy "Bot configs admin update" on public.bot_configs
  for update using (public.is_admin());

drop policy if exists "Bot groups admin select" on public.bot_groups;
drop policy if exists "Bot groups admin insert" on public.bot_groups;
drop policy if exists "Bot groups admin update" on public.bot_groups;

create policy "Bot groups admin select" on public.bot_groups
  for select using (public.is_admin());

create policy "Bot groups admin insert" on public.bot_groups
  for insert with check (public.is_admin());

create policy "Bot groups admin update" on public.bot_groups
  for update using (public.is_admin());
