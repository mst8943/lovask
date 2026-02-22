-- Economy helpers

-- Daily login bonus (default 10 coins)
create or replace function public.claim_daily_bonus()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_last_login date;
  v_award int := 10;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select last_login_at::date into v_last_login
  from public.users
  where id = v_user_id;

  if v_last_login is null or v_last_login < current_date then
    update public.users
    set coin_balance = coin_balance + v_award,
        last_login_at = now()
    where id = v_user_id;

    insert into public.transactions (user_id, amount, type, metadata)
    values (v_user_id, v_award, 'bonus', jsonb_build_object('reason','daily_login'));

    return v_award;
  end if;

  return 0;
end;
$$;

-- Referral code generation helper
create or replace function public.ensure_referral_code()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_code text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select referral_code into v_code from public.users where id = v_user_id;
  if v_code is null or length(v_code) = 0 then
    update public.users
    set referral_code = substr(md5(v_user_id::text || now()::text), 1, 8)
    where id = v_user_id;
  end if;
end;
$$;

-- Apply referral (default 50 coins to both parties)
create or replace function public.apply_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_referrer_id uuid;
  v_bonus int := 50;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Prevent self-referral or repeat
  if exists (select 1 from public.users where id = v_user_id and referred_by is not null) then
    return false;
  end if;

  select id into v_referrer_id from public.users where referral_code = p_code and id <> v_user_id;
  if v_referrer_id is null then
    return false;
  end if;

  update public.users
  set referred_by = v_referrer_id,
      coin_balance = coin_balance + v_bonus
  where id = v_user_id;

  update public.users
  set coin_balance = coin_balance + v_bonus
  where id = v_referrer_id;

  insert into public.transactions (user_id, amount, type, metadata)
  values
    (v_user_id, v_bonus, 'bonus', jsonb_build_object('reason','referral')),
    (v_referrer_id, v_bonus, 'bonus', jsonb_build_object('reason','referral'));

  return true;
end;
$$;
