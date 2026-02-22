drop policy if exists "App settings admin read" on public.app_settings;
drop policy if exists "App settings read authenticated" on public.app_settings;

create policy "App settings read authenticated"
on public.app_settings
for select
to authenticated
using (true);
