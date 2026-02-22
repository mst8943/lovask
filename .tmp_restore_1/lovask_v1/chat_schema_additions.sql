-- Chat v2 schema updates

-- Ensure read receipt policy exists (if not already created)
create policy if not exists "Messages update read_at by match participant" on public.messages
  for update using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- Typing status RLS policies (if not already created)
create policy if not exists "Typing select for match" on public.typing_status
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy if not exists "Typing upsert for match" on public.typing_status
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy if not exists "Typing update for match" on public.typing_status
  for update using (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- Chat initiation tracking + refund
create table if not exists public.chat_initiations (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches on delete cascade unique,
  initiator_id uuid references public.users on delete cascade,
  amount int not null,
  created_at timestamptz default now(),
  refunded_at timestamptz
);

alter table public.chat_initiations enable row level security;

create policy if not exists "Chat initiations insert" on public.chat_initiations
  for insert with check (auth.uid() = initiator_id);

create policy if not exists "Chat initiations select for match" on public.chat_initiations
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create or replace function public.refund_chat_initiation(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  init public.chat_initiations%rowtype;
begin
  select * into init
  from public.chat_initiations
  where match_id = p_match_id and refunded_at is null;

  if not found then
    return false;
  end if;

  if not exists (
    select 1 from public.matches m
    where m.id = p_match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  if init.initiator_id = auth.uid() then
    return false;
  end if;

  update public.users
  set coin_balance = coin_balance + init.amount
  where id = init.initiator_id;

  insert into public.transactions (user_id, amount, type, metadata)
  values (init.initiator_id, init.amount, 'gift', jsonb_build_object('reason','chat_refund','match_id',p_match_id));

  update public.chat_initiations set refunded_at = now() where id = init.id;

  return true;
end;
$$;
