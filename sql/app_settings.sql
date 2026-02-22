create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_app_settings_updated_at();

alter table public.app_settings enable row level security;

create policy "App settings admin read"
on public.app_settings
for select
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

create policy "App settings admin write"
on public.app_settings
for insert
to authenticated
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

create policy "App settings admin update"
on public.app_settings
for update
to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);
