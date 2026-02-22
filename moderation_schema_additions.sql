-- Moderation policies

-- Reports: admin can select/update, users can insert
drop policy if exists "Reports insert" on public.reports;
drop policy if exists "Reports select admin" on public.reports;
drop policy if exists "Reports update admin" on public.reports;

create policy "Reports insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "Reports select admin" on public.reports
  for select using (public.is_admin());

create policy "Reports update admin" on public.reports
  for update using (public.is_admin());

-- Blocks: user can insert/select own
drop policy if exists "Blocks insert" on public.blocks;
drop policy if exists "Blocks select own" on public.blocks;

create policy "Blocks insert" on public.blocks
  for insert with check (auth.uid() = blocker_id);

create policy "Blocks select own" on public.blocks
  for select using (auth.uid() = blocker_id or public.is_admin());
