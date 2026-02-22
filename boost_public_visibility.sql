-- Allow all authenticated users to see currently active boosts.
-- Needed for feed "Yukselt" stories to be visible to everyone.

drop policy if exists "Boosts select active public" on public.boosts;

create policy "Boosts select active public" on public.boosts
  for select
  using (ends_at > now());

