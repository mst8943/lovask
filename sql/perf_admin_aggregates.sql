-- Admin aggregates for live dashboards

-- Supporting indexes
create index if not exists idx_bank_transfers_created_at on public.bank_transfers (created_at desc);
create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_user_verifications_created_at on public.user_verifications (created_at desc);
create index if not exists idx_support_tickets_created_at on public.support_tickets (created_at desc);
create index if not exists idx_likes_created_at on public.likes (created_at desc);
create index if not exists idx_passes_created_at on public.passes (created_at desc);
create index if not exists idx_transactions_created_at on public.transactions (created_at desc);

-- Dashboard counts
create or replace function public.admin_dashboard_counts()
returns table (
  pending_transfers int,
  pending_reports int,
  pending_verifications int,
  pending_tickets int,
  bot_count int,
  user_count int,
  banned_count int,
  active_stories int,
  ai_usage_24h int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - interval '24 hours';
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.bank_transfers where status = 'pending')::int,
    (select count(*) from public.reports where status = 'pending')::int,
    (select count(*) from public.user_verifications where status = 'pending')::int,
    (select count(*) from public.support_tickets where status = 'open')::int,
    (select count(*) from public.profiles where is_bot = true)::int,
    (select count(*) from public.users)::int,
    (select count(*) from public.users where is_banned = true)::int,
    (select count(*) from public.stories where expires_at > now())::int,
    (select count(*) from public.ai_usage where created_at >= since)::int;
end;
$$;

-- Dashboard trends
create or replace function public.admin_dashboard_trends(p_hours int, p_buckets int)
returns table (
  category text,
  bucket_start timestamptz,
  value int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  start_ts timestamptz := now() - make_interval(hours => p_hours);
  end_ts timestamptz := now();
  bucket_seconds int := greatest(1, floor((extract(epoch from (end_ts - start_ts)) / greatest(1, p_buckets)))::int);
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with buckets as (
    select generate_series(start_ts, end_ts, (bucket_seconds || ' seconds')::interval) as bucket_start
  )
  select 'transfers'::text as category, b.bucket_start,
    (select count(*) from public.bank_transfers t
      where t.created_at >= b.bucket_start
        and t.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::int as value
  from buckets b
  union all
  select 'reports'::text, b.bucket_start,
    (select count(*) from public.reports r
      where r.created_at >= b.bucket_start
        and r.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::int
  from buckets b
  union all
  select 'verifications'::text, b.bucket_start,
    (select count(*) from public.user_verifications v
      where v.created_at >= b.bucket_start
        and v.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::int
  from buckets b
  union all
  select 'tickets'::text, b.bucket_start,
    (select count(*) from public.support_tickets s
      where s.created_at >= b.bucket_start
        and s.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::int
  from buckets b;
end;
$$;

-- Insights summary (top + trends)
create or replace function public.admin_insights_summary(p_hours int, p_buckets int)
returns table (
  top_likes jsonb,
  top_passes jsonb,
  top_spends jsonb,
  trend_likes jsonb,
  trend_passes jsonb,
  trend_spends jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  start_ts timestamptz := now() - make_interval(hours => p_hours);
  end_ts timestamptz := now();
  day_ts timestamptz := now() - interval '24 hours';
  bucket_seconds int := greatest(1, floor((extract(epoch from (end_ts - start_ts)) / greatest(1, p_buckets)))::int);
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with buckets as (
    select generate_series(start_ts, end_ts, (bucket_seconds || ' seconds')::interval) as bucket_start
  ),
  like_trend as (
    select b.bucket_start,
      (select count(*) from public.likes l
        where l.created_at >= b.bucket_start
          and l.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::int as value
    from buckets b
  ),
  pass_trend as (
    select b.bucket_start,
      (select count(*) from public.passes p
        where p.created_at >= b.bucket_start
          and p.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::int as value
    from buckets b
  ),
  spend_trend as (
    select b.bucket_start,
      (select coalesce(sum(abs(t.amount)),0) from public.transactions t
        where t.type = 'spend'
          and t.created_at >= b.bucket_start
          and t.created_at < b.bucket_start + (bucket_seconds || ' seconds')::interval)::numeric as value
    from buckets b
  )
  select
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
     from (
        select from_user as user_id, count(*) as count
        from public.likes
        where created_at >= start_ts
        group by from_user
        order by count(*) desc
        limit 10
     ) x),
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
     from (
        select from_user as user_id, count(*) as count
        from public.passes
        where created_at >= start_ts
        group by from_user
        order by count(*) desc
        limit 10
     ) x),
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
     from (
        select user_id, sum(abs(amount)) as amount
        from public.transactions
        where type = 'spend' and created_at >= day_ts
        group by user_id
        order by sum(abs(amount)) desc
        limit 10
     ) x),
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (select bucket_start as start, value from like_trend) x),
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (select bucket_start as start, value from pass_trend) x),
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) from (select bucket_start as start, value from spend_trend) x);
end;
$$;

-- Economy summary
create or replace function public.admin_economy_summary()
returns table (
  coins_total bigint,
  premium_count int,
  pending_transfers int,
  daily_spend numeric,
  daily_earn numeric,
  weekly_spend numeric,
  top_spenders jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  day_ts timestamptz := now() - interval '24 hours';
  week_ts timestamptz := now() - interval '7 days';
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select coalesce(sum(coin_balance),0)::bigint from public.users),
    (select count(*) from public.users where is_premium = true)::int,
    (select count(*) from public.bank_transfers where status = 'pending')::int,
    (select coalesce(sum(abs(amount)),0)::numeric from public.transactions where amount < 0 and created_at >= day_ts),
    (select coalesce(sum(amount),0)::numeric from public.transactions where amount > 0 and created_at >= day_ts),
    (select coalesce(sum(abs(amount)),0)::numeric from public.transactions where amount < 0 and created_at >= week_ts),
    (select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
     from (
        select user_id, sum(abs(amount))::numeric as amount
        from public.transactions
        where amount < 0 and created_at >= week_ts
        group by user_id
        order by sum(abs(amount)) desc
        limit 10
     ) x);
end;
$$;
