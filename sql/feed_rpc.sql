create or replace function public.fetch_feed_page(
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
    p_premium_only boolean default false
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
    last_active_at timestamptz
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
            u.last_active_at,
            coalesce(v.bio, p.bio) as resolved_bio,
            case
                when v.photos is not null and jsonb_array_length(v.photos) > 0 then v.photos
                else p.photos
            end as resolved_photos
        from profiles p
        left join users u on u.id = p.id
        left join profile_variants v on v.user_id = p.id and v.is_active = true
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
        last_active_at
    from base
    order by updated_at desc, id desc
    limit p_limit;
$$;
