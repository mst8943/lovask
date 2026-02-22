-- Performance + chat state denormalization for live

-- Indexes
create index if not exists idx_messages_match_created_at
  on public.messages (match_id, created_at desc);

create index if not exists idx_messages_match_read_at
  on public.messages (match_id, read_at);

create index if not exists idx_messages_match_sender_read
  on public.messages (match_id, sender_id, read_at);

create index if not exists idx_matches_user_a
  on public.matches (user_a);

create index if not exists idx_matches_user_b
  on public.matches (user_b);

create index if not exists idx_notifications_user_read
  on public.notifications (user_id, is_read);

create index if not exists idx_discovery_impressions_user_created
  on public.discovery_impressions (user_id, created_at desc);

-- Chat states: denormalized fields
alter table public.chat_states
  add column if not exists last_read_at timestamptz null,
  add column if not exists unread_count int not null default 0,
  add column if not exists last_message_at timestamptz null,
  add column if not exists last_message_preview text null;

-- Ensure chat_state exists
create or replace function public.ensure_chat_state(p_match_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_states (match_id, user_id)
  values (p_match_id, p_user_id)
  on conflict (match_id, user_id) do nothing;
end;
$$;

-- Update chat_state on new message
create or replace function public.on_message_insert_update_chat_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_receiver uuid;
  v_preview text;
begin
  select user_a, user_b into v_user_a, v_user_b
  from public.matches
  where id = new.match_id;

  if v_user_a is null then
    return new;
  end if;

  v_receiver := case when new.sender_id = v_user_a then v_user_b else v_user_a end;
  v_preview := coalesce(nullif(new.content, ''), '[media]');

  perform public.ensure_chat_state(new.match_id, v_user_a);
  perform public.ensure_chat_state(new.match_id, v_user_b);

  update public.chat_states
  set last_message_at = new.created_at,
      last_message_preview = v_preview,
      updated_at = now()
  where match_id = new.match_id;

  update public.chat_states
  set unread_count = coalesce(unread_count, 0) + 1,
      updated_at = now()
  where match_id = new.match_id and user_id = v_receiver;

  return new;
end;
$$;

-- Update chat_state on read
create or replace function public.on_message_read_update_chat_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_receiver uuid;
begin
  if old.read_at is not null or new.read_at is null then
    return new;
  end if;

  select user_a, user_b into v_user_a, v_user_b
  from public.matches
  where id = new.match_id;

  if v_user_a is null then
    return new;
  end if;

  v_receiver := case when new.sender_id = v_user_a then v_user_b else v_user_a end;

  update public.chat_states
  set unread_count = greatest(coalesce(unread_count, 0) - 1, 0),
      last_read_at = new.read_at,
      updated_at = now()
  where match_id = new.match_id and user_id = v_receiver;

  return new;
end;
$$;

drop trigger if exists trg_messages_insert_chat_state on public.messages;
create trigger trg_messages_insert_chat_state
after insert on public.messages
for each row execute function public.on_message_insert_update_chat_state();

drop trigger if exists trg_messages_read_chat_state on public.messages;
create trigger trg_messages_read_chat_state
after update of read_at on public.messages
for each row execute function public.on_message_read_update_chat_state();

-- Backfill chat_states for existing matches
insert into public.chat_states (match_id, user_id)
select m.id, u.user_id
from public.matches m
cross join lateral (values (m.user_a), (m.user_b)) as u(user_id)
on conflict (match_id, user_id) do nothing;

-- Backfill last message preview/at
update public.chat_states cs
set last_message_at = sub.last_message_at,
    last_message_preview = sub.last_message_preview
from (
  select m.id as match_id,
         u.user_id,
         (select msg.created_at
          from public.messages msg
          where msg.match_id = m.id
          order by msg.created_at desc
          limit 1) as last_message_at,
         (select coalesce(nullif(msg.content, ''), '[media]')
          from public.messages msg
          where msg.match_id = m.id
          order by msg.created_at desc
          limit 1) as last_message_preview
  from public.matches m
  cross join lateral (values (m.user_a), (m.user_b)) as u(user_id)
) sub
where cs.match_id = sub.match_id and cs.user_id = sub.user_id;

-- Backfill unread counts
update public.chat_states cs
set unread_count = sub.cnt
from (
  select m.id as match_id,
         u.user_id,
         (select count(*)
          from public.messages msg
          where msg.match_id = m.id
            and msg.sender_id <> u.user_id
            and msg.read_at is null) as cnt
  from public.matches m
  cross join lateral (values (m.user_a), (m.user_b)) as u(user_id)
) sub
where cs.match_id = sub.match_id and cs.user_id = sub.user_id;
