create table if not exists public.user_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('email','device','photo')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  proof_url text null,
  device_info jsonb null,
  note text null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewer_id uuid null references public.users(id)
);

create index if not exists idx_user_verifications_user on public.user_verifications(user_id);
create index if not exists idx_user_verifications_status on public.user_verifications(status);

alter table public.user_verifications enable row level security;

create policy "User verifications read own"
  on public.user_verifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "User verifications insert own"
  on public.user_verifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "User verifications admin select"
  on public.user_verifications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

create policy "User verifications admin update"
  on public.user_verifications
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
