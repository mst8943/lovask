-- Notifications triggers for likes, matches, messages

create or replace function public.notify_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  values (new.to_user, 'like', jsonb_build_object('from_user', new.from_user, 'title', 'Yeni beğeni', 'body', 'Bir kullanıcı seni beğendi.'));
  return new;
end;
$$;

create or replace function public.notify_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select u.id, 'match', jsonb_build_object('match_id', new.id, 'title', 'Yeni eşleşme', 'body', 'Yeni bir eşleşmen var!', 'url', '/matches')
  from public.users u
  join public.user_settings s on s.user_id = u.id
  where u.id in (new.user_a, new.user_b) and s.match_notifications = true;
  return new;
end;
$$;

create or replace function public.notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  allow_message boolean;
begin
  select case when m.user_a = new.sender_id then m.user_b else m.user_a end
    into target_id
  from public.matches m
  where m.id = new.match_id;

  if target_id is not null then
    select message_notifications into allow_message from public.user_settings where user_id = target_id;
    if allow_message is null then
      allow_message := true;
    end if;
  end if;

  if target_id is not null and allow_message = true then
    insert into public.notifications (user_id, type, payload)
    values (target_id, 'message', jsonb_build_object('match_id', new.match_id, 'title', 'Yeni mesaj', 'body', new.content, 'url', '/matches'));
  end if;

  return new;
end;
$$;

-- Triggers

drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like after insert on public.likes
for each row execute function public.notify_like();

drop trigger if exists trg_notify_match on public.matches;
create trigger trg_notify_match after insert on public.matches
for each row execute function public.notify_match();

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages
for each row execute function public.notify_message();
