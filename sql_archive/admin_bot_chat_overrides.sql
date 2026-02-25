-- Admin handoff for bot chats

create table if not exists public.bot_chat_overrides (
  match_id uuid references public.matches on delete cascade primary key,
  ai_enabled boolean default true,
  updated_by uuid references public.users on delete set null,
  updated_at timestamptz default now()
);

alter table public.bot_chat_overrides enable row level security;

drop policy if exists "Bot chat overrides admin select" on public.bot_chat_overrides;
drop policy if exists "Bot chat overrides admin insert" on public.bot_chat_overrides;
drop policy if exists "Bot chat overrides admin update" on public.bot_chat_overrides;

create policy "Bot chat overrides admin select" on public.bot_chat_overrides
  for select using (public.is_admin());

create policy "Bot chat overrides admin insert" on public.bot_chat_overrides
  for insert with check (public.is_admin());

create policy "Bot chat overrides admin update" on public.bot_chat_overrides
  for update using (public.is_admin());

-- Allow admin to view matches/messages for moderation
drop policy if exists "Matches select admin" on public.matches;
create policy "Matches select admin" on public.matches
  for select using (public.is_admin());

drop policy if exists "Messages select admin" on public.messages;
create policy "Messages select admin" on public.messages
  for select using (public.is_admin());
