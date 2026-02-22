-- Feature Pack 1: Realtime calls, advanced discovery, compatibility, location, events, verification, profiles, rich chat, safety

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.haversine_km(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
returns numeric
language sql
immutable
as $$
  select
    2 * 6371 * asin(
      sqrt(
        power(sin(radians((lat2 - lat1) / 2)), 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        power(sin(radians((lon2 - lon1) / 2)), 2)
      )
    );
$$;

-- ------------------------------------------------------------
-- Profile Enhancements (Intent, Dealbreakers, Values, Languages)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists intent text;
alter table public.profiles add column if not exists relationship_goal text;
alter table public.profiles add column if not exists work_title text;
alter table public.profiles add column if not exists education_level text;
alter table public.profiles add column if not exists languages text[] default '{}';
alter table public.profiles add column if not exists dealbreakers text[] default '{}';
alter table public.profiles add column if not exists values text[] default '{}';
alter table public.profiles add column if not exists family_plans text;
alter table public.profiles add column if not exists pets text;
alter table public.profiles add column if not exists fitness text;

-- ------------------------------------------------------------
-- Location Intelligence
-- ------------------------------------------------------------
alter table public.profiles add column if not exists location_updated_at timestamptz;
alter table public.profiles add column if not exists location_visibility text default 'approx'
  check (location_visibility in ('public','approx','hidden'));

-- ------------------------------------------------------------
-- User Settings Extensions (Last active visibility, message requests, harassment mode)
-- ------------------------------------------------------------
alter table public.user_settings add column if not exists last_active_visibility text default 'matches'
  check (last_active_visibility in ('everyone','matches','hidden'));
alter table public.user_settings add column if not exists message_request_mode text default 'open'
  check (message_request_mode in ('open','request','verified_only'));
alter table public.user_settings add column if not exists harassment_mode boolean default false;
alter table public.user_settings add column if not exists quiet_hours_enabled boolean default false;
alter table public.user_settings add column if not exists quiet_hours_start text default '22:00';
alter table public.user_settings add column if not exists quiet_hours_end text default '08:00';
alter table public.user_settings add column if not exists quiet_hours_tz text default 'UTC';
alter table public.user_settings add column if not exists priority_only boolean default false;

-- ------------------------------------------------------------
-- Call Sessions (Voice/Video)
-- ------------------------------------------------------------
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  created_by uuid not null references public.users on delete cascade,
  call_type text not null check (call_type in ('voice','video')),
  status text not null default 'ringing' check (status in ('ringing','active','ended','missed','declined','canceled')),
  provider text default 'webrtc',
  room_id text null,
  started_at timestamptz null,
  ended_at timestamptz null,
  coins_spent int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  role text default 'participant' check (role in ('caller','callee','participant')),
  joined_at timestamptz null,
  left_at timestamptz null,
  accepted boolean default false,
  created_at timestamptz default now(),
  unique(call_id, user_id)
);

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions on delete cascade,
  from_user uuid not null references public.users on delete cascade,
  to_user uuid not null references public.users on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','candidate','bye')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions on delete cascade,
  user_id uuid references public.users on delete set null,
  event text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_signals enable row level security;
alter table public.call_events enable row level security;

drop policy if exists "Call sessions select" on public.call_sessions;
drop policy if exists "Call sessions insert" on public.call_sessions;
drop policy if exists "Call sessions update" on public.call_sessions;

create policy "Call sessions select" on public.call_sessions
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    ) or public.is_admin()
  );

create policy "Call sessions insert" on public.call_sessions
  for insert with check (
    auth.uid() = created_by and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Call sessions update" on public.call_sessions
  for update using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    ) or public.is_admin()
  );

drop policy if exists "Call participants select" on public.call_participants;
drop policy if exists "Call participants insert" on public.call_participants;
drop policy if exists "Call participants update" on public.call_participants;

create policy "Call participants select" on public.call_participants
  for select using (
    exists (
      select 1 from public.call_sessions c
      join public.matches m on m.id = c.match_id
      where c.id = call_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    ) or public.is_admin()
  );

create policy "Call participants insert" on public.call_participants
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.call_sessions c
      join public.matches m on m.id = c.match_id
      where c.id = call_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "Call participants update" on public.call_participants
  for update using (
    auth.uid() = user_id or public.is_admin()
  );

drop policy if exists "Call signals select" on public.call_signals;
drop policy if exists "Call signals insert" on public.call_signals;

create policy "Call signals select" on public.call_signals
  for select using (
    auth.uid() = from_user or auth.uid() = to_user or public.is_admin()
  );

create policy "Call signals insert" on public.call_signals
  for insert with check (
    auth.uid() = from_user and
    exists (
      select 1 from public.call_sessions c
      join public.matches m on m.id = c.match_id
      where c.id = call_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

drop policy if exists "Call events select" on public.call_events;
drop policy if exists "Call events insert" on public.call_events;

create policy "Call events select" on public.call_events
  for select using (public.is_admin());

create policy "Call events insert" on public.call_events
  for insert with check (
    exists (
      select 1 from public.call_sessions c
      join public.matches m on m.id = c.match_id
      where c.id = call_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create index if not exists idx_call_sessions_match on public.call_sessions(match_id);
create index if not exists idx_call_participants_call on public.call_participants(call_id);
create index if not exists idx_call_signals_call on public.call_signals(call_id);

-- ------------------------------------------------------------
-- Compatibility & Discovery Scoring
-- ------------------------------------------------------------
create table if not exists public.compatibility_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  other_id uuid not null references public.users on delete cascade,
  score int not null default 0,
  breakdown jsonb default '{}'::jsonb,
  computed_at timestamptz default now(),
  unique(user_id, other_id)
);

create table if not exists public.discovery_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  profile_id uuid not null references public.users on delete cascade,
  source text default 'feed',
  created_at timestamptz default now(),
  unique(user_id, profile_id, created_at)
);

create table if not exists public.profile_quality_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  score int not null default 0,
  reasons jsonb default '{}'::jsonb,
  computed_at timestamptz default now(),
  unique(user_id)
);

alter table public.compatibility_scores enable row level security;
alter table public.discovery_impressions enable row level security;
alter table public.profile_quality_scores enable row level security;

drop policy if exists "Compatibility select own" on public.compatibility_scores;
drop policy if exists "Compatibility insert admin" on public.compatibility_scores;

create policy "Compatibility select own" on public.compatibility_scores
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Compatibility insert admin" on public.compatibility_scores
  for insert with check (public.is_admin());

drop policy if exists "Discovery impressions insert" on public.discovery_impressions;
drop policy if exists "Discovery impressions select own" on public.discovery_impressions;

create policy "Discovery impressions insert" on public.discovery_impressions
  for insert with check (auth.uid() = user_id);

create policy "Discovery impressions select own" on public.discovery_impressions
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Profile quality admin" on public.profile_quality_scores;
create policy "Profile quality admin" on public.profile_quality_scores
  for select using (public.is_admin());

drop policy if exists "Profile quality admin insert" on public.profile_quality_scores;
create policy "Profile quality admin insert" on public.profile_quality_scores
  for insert with check (public.is_admin());

create index if not exists idx_compatibility_user on public.compatibility_scores(user_id);

create or replace function public.compute_compatibility_scores(
  p_user_id uuid,
  p_limit int default 200
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_user_id is null then
    raise exception 'missing user';
  end if;

  if auth.uid() is null or (auth.uid() <> p_user_id and not public.is_admin()) then
    raise exception 'not authorized';
  end if;

  with me as (
    select *
    from public.profiles
    where id = p_user_id
  ),
  candidates as (
    select p.*
    from public.profiles p
    where p.id <> p_user_id
      and p.hide_from_discovery = false
    order by p.updated_at desc
    limit p_limit
  ),
  scored as (
    select
      c.id as other_id,
      (
        coalesce((
          select count(*) from (
            select unnest(coalesce(c.interests, '{}'::text[]))
            intersect
            select unnest(coalesce(m.interests, '{}'::text[]))
          ) s
        ), 0) * 12
        + case when c.city is not null and m.city is not null and lower(c.city) = lower(m.city) then 10 else 0 end
        + case when c.relationship_type is not null and c.relationship_type = m.relationship_type then 10 else 0 end
        + case when c.intent is not null and c.intent = m.intent then 10 else 0 end
        + case when c.lifestyle is not null and c.lifestyle = m.lifestyle then 6 else 0 end
        + case when c.smoking is not null and c.smoking = m.smoking then 4 else 0 end
        + case when c.alcohol is not null and c.alcohol = m.alcohol then 4 else 0 end
        + case when c.kids_status is not null and c.kids_status = m.kids_status then 4 else 0 end
        + case when c.religion is not null and c.religion = m.religion then 4 else 0 end
        + case
            when c.age is not null and m.age is not null then
              case
                when abs(c.age - m.age) <= 2 then 10
                when abs(c.age - m.age) <= 5 then 6
                when abs(c.age - m.age) <= 10 then 3
                else 0
              end
            else 0
          end
        + case
            when c.location_lat is not null and c.location_lng is not null
             and m.location_lat is not null and m.location_lng is not null then
              case
                when public.haversine_km(m.location_lat, m.location_lng, c.location_lat, c.location_lng) <= 10 then 8
                when public.haversine_km(m.location_lat, m.location_lng, c.location_lat, c.location_lng) <= 30 then 4
                when public.haversine_km(m.location_lat, m.location_lng, c.location_lat, c.location_lng) <= 60 then 2
                else 0
              end
            else 0
          end
      )::int as score
    from candidates c
    cross join me m
  )
  insert into public.compatibility_scores (user_id, other_id, score, breakdown)
  select
    p_user_id,
    other_id,
    score,
    jsonb_build_object(
      'version', 'v1',
      'interests', coalesce((
        select count(*) from (
          select unnest(coalesce(c.interests, '{}'::text[]))
          intersect
          select unnest(coalesce(m.interests, '{}'::text[]))
        ) s
      ), 0),
      'same_city', case when c.city is not null and m.city is not null and lower(c.city) = lower(m.city) then true else false end,
      'intent', case when c.intent is not null and c.intent = m.intent then true else false end,
      'relationship_type', case when c.relationship_type is not null and c.relationship_type = m.relationship_type then true else false end,
      'lifestyle', case when c.lifestyle is not null and c.lifestyle = m.lifestyle then true else false end,
      'smoking', case when c.smoking is not null and c.smoking = m.smoking then true else false end,
      'alcohol', case when c.alcohol is not null and c.alcohol = m.alcohol then true else false end,
      'kids_status', case when c.kids_status is not null and c.kids_status = m.kids_status then true else false end,
      'religion', case when c.religion is not null and c.religion = m.religion then true else false end
    )
  from scored
  on conflict (user_id, other_id)
  do update set score = excluded.score, computed_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Discovery RPC v2 with distance + compatibility
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
-- Events / Theme Matching
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean default true,
  created_by uuid references public.users on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events on delete cascade,
  user_id uuid references public.users on delete cascade,
  status text default 'going' check (status in ('going','maybe','not_going')),
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create table if not exists public.event_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events on delete cascade,
  user_a uuid references public.users on delete cascade,
  user_b uuid references public.users on delete cascade,
  created_at timestamptz default now(),
  unique(event_id, user_a, user_b)
);

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_matches enable row level security;

drop policy if exists "Events select" on public.events;
drop policy if exists "Events insert admin" on public.events;
drop policy if exists "Events update admin" on public.events;

create policy "Events select" on public.events
  for select using (auth.uid() is not null);

create policy "Events insert admin" on public.events
  for insert with check (public.is_admin());

create policy "Events update admin" on public.events
  for update using (public.is_admin());

drop policy if exists "Event participants select" on public.event_participants;
drop policy if exists "Event participants insert" on public.event_participants;

create policy "Event participants select" on public.event_participants
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Event participants insert" on public.event_participants
  for insert with check (auth.uid() = user_id);

drop policy if exists "Event matches select" on public.event_matches;
create policy "Event matches select" on public.event_matches
  for select using (
    auth.uid() = user_a or auth.uid() = user_b or public.is_admin()
  );

-- ------------------------------------------------------------
-- Verification Extensions (KYC & Liveness)
-- ------------------------------------------------------------
alter table public.user_verifications
  drop constraint if exists user_verifications_type_check;
alter table public.user_verifications
  add constraint user_verifications_type_check
  check (type in ('email','device','photo','selfie','kyc','video'));

alter table public.user_verifications add column if not exists provider text;
alter table public.user_verifications add column if not exists metadata jsonb default '{}'::jsonb;

-- ------------------------------------------------------------
-- Rich Messaging (audio, stickers, polls, reactions)
-- ------------------------------------------------------------
alter table public.messages
  drop constraint if exists messages_type_check;
alter table public.messages
  add constraint messages_type_check
  check (type in ('text','image','audio','sticker','poll','call'));

alter table public.messages add column if not exists media_duration_s int;
alter table public.messages add column if not exists audio_waveform jsonb;
alter table public.messages add column if not exists sticker_id uuid;

create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages on delete cascade,
  user_id uuid references public.users on delete cascade,
  reaction text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, reaction)
);

create table if not exists public.message_polls (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  multiple boolean default false,
  expires_at timestamptz null,
  created_at timestamptz default now()
);

create table if not exists public.message_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.message_polls on delete cascade,
  user_id uuid references public.users on delete cascade,
  option_index int not null,
  created_at timestamptz default now(),
  unique(poll_id, user_id, option_index)
);

alter table public.stickers enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_polls enable row level security;
alter table public.message_poll_votes enable row level security;

drop policy if exists "Stickers select" on public.stickers;
create policy "Stickers select" on public.stickers
  for select using (auth.uid() is not null);

drop policy if exists "Message reactions select" on public.message_reactions;
drop policy if exists "Message reactions insert" on public.message_reactions;

create policy "Message reactions select" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      join public.matches ma on ma.id = m.match_id
      where m.id = message_id and (ma.user_a = auth.uid() or ma.user_b = auth.uid())
    )
  );

create policy "Message reactions insert" on public.message_reactions
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.messages m
      join public.matches ma on ma.id = m.match_id
      where m.id = message_id and (ma.user_a = auth.uid() or ma.user_b = auth.uid())
    )
  );

drop policy if exists "Message polls select" on public.message_polls;
drop policy if exists "Message polls insert" on public.message_polls;

create policy "Message polls select" on public.message_polls
  for select using (
    exists (
      select 1 from public.messages m
      join public.matches ma on ma.id = m.match_id
      where m.id = message_id and (ma.user_a = auth.uid() or ma.user_b = auth.uid())
    )
  );

create policy "Message polls insert" on public.message_polls
  for insert with check (
    exists (
      select 1 from public.messages m
      join public.matches ma on ma.id = m.match_id
      where m.id = message_id and (ma.user_a = auth.uid() or ma.user_b = auth.uid())
    )
  );

drop policy if exists "Message poll votes select" on public.message_poll_votes;
drop policy if exists "Message poll votes insert" on public.message_poll_votes;

create policy "Message poll votes select" on public.message_poll_votes
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Message poll votes insert" on public.message_poll_votes
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Safety Controls (Message requests & gating)
-- ------------------------------------------------------------
create table if not exists public.message_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches on delete cascade,
  requester_id uuid references public.users on delete cascade,
  recipient_id uuid references public.users on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined','expired')),
  message_preview text,
  created_at timestamptz default now(),
  responded_at timestamptz null,
  unique(match_id, requester_id, recipient_id)
);

alter table public.message_requests enable row level security;

drop policy if exists "Message requests select" on public.message_requests;
drop policy if exists "Message requests insert" on public.message_requests;
drop policy if exists "Message requests update" on public.message_requests;

create policy "Message requests select" on public.message_requests
  for select using (
    auth.uid() = requester_id or auth.uid() = recipient_id or public.is_admin()
  );

create policy "Message requests insert" on public.message_requests
  for insert with check (auth.uid() = requester_id);

create policy "Message requests update" on public.message_requests
  for update using (auth.uid() = recipient_id or public.is_admin());

create or replace function public.can_send_message(p_match_id uuid, p_sender uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with m as (
    select * from public.matches
    where id = p_match_id and (user_a = p_sender or user_b = p_sender)
  ),
  other as (
    select case when user_a = p_sender then user_b else user_a end as other_id
    from m
  ),
  has_msgs as (
    select exists (select 1 from public.messages where match_id = p_match_id) as ok
  ),
  req as (
    select exists (
      select 1 from public.message_requests r
      where r.match_id = p_match_id and r.status = 'accepted'
    ) as ok
  ),
  setting as (
    select coalesce(us.message_request_mode, 'open') as mode
    from public.user_settings us
    join other o on o.other_id = us.user_id
  ),
  sender_verified as (
    select coalesce(p.is_verified, false) as ok
    from public.profiles p
    where p.id = p_sender
  )
  select
    exists (select 1 from m)
    and (
      (select ok from has_msgs)
      or (select ok from req)
      or (
        (select mode from setting) = 'open'
      )
      or (
        (select mode from setting) = 'verified_only' and (select ok from sender_verified)
      )
    );
$$;

drop policy if exists "Users can insert messages to their matches" on public.messages;
create policy "Users can insert messages to their matches" on public.messages
  for insert with check (
    auth.uid() = sender_id and public.can_send_message(match_id, auth.uid())
  );

create index if not exists idx_message_requests_match on public.message_requests(match_id);
create index if not exists idx_message_reactions_message on public.message_reactions(message_id);
create index if not exists idx_message_polls_message on public.message_polls(message_id);
create index if not exists idx_message_poll_votes_poll on public.message_poll_votes(poll_id);
