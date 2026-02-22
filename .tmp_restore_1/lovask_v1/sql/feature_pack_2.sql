-- Feature Pack 2: Discovery impressions cooldown + notifications triggers

-- ------------------------------------------------------------
-- Discovery impressions performance
-- ------------------------------------------------------------
create index if not exists idx_discovery_impressions_user_created
  on public.discovery_impressions (user_id, created_at desc);

create index if not exists idx_discovery_impressions_user_profile
  on public.discovery_impressions (user_id, profile_id, created_at desc);

-- Stories cleanup helper index
create index if not exists idx_stories_expires_at
  on public.stories (expires_at);

-- ------------------------------------------------------------
-- Feed RPC v2: exclude recently seen profiles (impression cooldown)
-- ------------------------------------------------------------
create or replace function public.fetch_feed_page_v2(
    p_user_id uuid,
    p_cursor timestamptz default null,
    p_cursor_id uuid default null,
    p_limit int default 20,
    p_age_min int default null,
    p_age_max int default null,
    p_city text default null,
    p_genders text[] default null,
    p_interests text[] default null,
    p_relationship_type text default null,
    p_education text default null,
    p_smoking text default null,
    p_alcohol text default null,
    p_kids_status text default null,
    p_height_min int default null,
    p_height_max int default null,
    p_religion text default null,
    p_lifestyle text default null,
    p_online_only boolean default false,
    p_premium_only boolean default false,
    p_distance_km int default null
)
returns table (
    id uuid,
    display_name text,
    age int,
    gender text,
    city text,
    bio text,
    photos jsonb,
    interests text[],
    is_bot boolean,
    looking_for_genders text[],
    is_verified boolean,
    updated_at timestamptz,
    is_premium boolean,
    last_active_at timestamptz,
    compatibility_score int,
    distance_km numeric
)
language sql
stable
security definer
set search_path = public
as $$
    with base as (
        select
            p.*,
            u.is_premium,
            case
              when us.last_active_visibility = 'hidden' then null
              when us.last_active_visibility = 'matches'
                   and not exists (
                     select 1 from public.matches mm
                     where mm.is_active = true
                       and ((mm.user_a = p_user_id and mm.user_b = p.id)
                         or (mm.user_b = p_user_id and mm.user_a = p.id))
                   ) then null
              else u.last_active_at
            end as last_active_at,
            coalesce(v.bio, p.bio) as resolved_bio,
            case
                when v.photos is not null and jsonb_array_length(v.photos) > 0 then v.photos
                else p.photos
            end as resolved_photos,
            c.score as compatibility_score,
            case
              when p.location_visibility = 'hidden' then null
              when p.location_lat is not null and p.location_lng is not null
                   and me.location_lat is not null and me.location_lng is not null
                then case
                  when p.location_visibility = 'approx'
                    then round(public.haversine_km(me.location_lat, me.location_lng, p.location_lat, p.location_lng) / 10) * 10
                  else public.haversine_km(me.location_lat, me.location_lng, p.location_lat, p.location_lng)
                end
              else null
            end as distance_km
        from profiles p
        left join users u on u.id = p.id
        left join profiles me on me.id = p_user_id
        left join profile_variants v on v.user_id = p.id and v.is_active = true
        left join user_settings us on us.user_id = p.id
        left join compatibility_scores c on c.user_id = p_user_id and c.other_id = p.id
        where p.hide_from_discovery = false
          and (auth.uid() = p_user_id or is_admin())
          and p.id <> p_user_id
          and not exists (
              select 1 from likes l
              where l.from_user = p_user_id and l.to_user = p.id
          )
          and not exists (
              select 1 from passes pa
              where pa.from_user = p_user_id and pa.to_user = p.id
          )
          and not exists (
              select 1 from blocks b
              where (b.blocker_id = p_user_id and b.blocked_id = p.id)
                 or (b.blocked_id = p_user_id and b.blocker_id = p.id)
          )
          and not exists (
              select 1
              from public.discovery_impressions di
              where di.user_id = p_user_id
                and di.profile_id = p.id
                and di.created_at > now() - interval '45 minutes'
          )
          and (
              p_cursor is null
              or (p_cursor_id is null and p.updated_at < p_cursor)
              or (p.updated_at < p_cursor)
              or (p.updated_at = p_cursor and p.id < p_cursor_id)
          )
          and (p_age_min is null or p.age >= p_age_min)
          and (p_age_max is null or p.age <= p_age_max)
          and (p_city is null or p.city ilike '%' || p_city || '%')
          and (p_genders is null or p.gender = any (p_genders))
          and (p_interests is null or p.interests && p_interests)
          and (p_relationship_type is null or p.relationship_type = p_relationship_type)
          and (p_education is null or p.education = p_education)
          and (p_smoking is null or p.smoking = p_smoking)
          and (p_alcohol is null or p.alcohol = p_alcohol)
          and (p_kids_status is null or p.kids_status = p_kids_status)
          and (p_height_min is null or p.height_cm >= p_height_min)
          and (p_height_max is null or p.height_cm <= p_height_max)
          and (p_religion is null or p.religion = p_religion)
          and (p_lifestyle is null or p.lifestyle = p_lifestyle)
          and (not p_online_only or (u.last_active_at is not null and u.last_active_at > now() - interval '10 minutes'))
          and (not p_premium_only or u.is_premium = true)
          and (p_distance_km is null or (
                p.location_visibility <> 'hidden'
                and p.location_lat is not null and p.location_lng is not null
                and me.location_lat is not null and me.location_lng is not null
                and public.haversine_km(me.location_lat, me.location_lng, p.location_lat, p.location_lng) <= p_distance_km
          ))
    )
    select
        id,
        display_name,
        age,
        gender,
        city,
        resolved_bio as bio,
        resolved_photos as photos,
        interests,
        is_bot,
        looking_for_genders,
        is_verified,
        updated_at,
        is_premium,
        last_active_at,
        coalesce(compatibility_score, 0) as compatibility_score,
        distance_km
    from base
    order by
        coalesce(compatibility_score, 0) desc,
        updated_at desc,
        id desc
    limit p_limit;
$$;

-- ------------------------------------------------------------
-- Notifications triggers (likes, matches, messages)
-- ------------------------------------------------------------
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

drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like after insert on public.likes
for each row execute function public.notify_like();

drop trigger if exists trg_notify_match on public.matches;
create trigger trg_notify_match after insert on public.matches
for each row execute function public.notify_match();

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages
for each row execute function public.notify_message();
