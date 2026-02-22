-- RLS AUDIT HELPERS
-- Run these queries in Supabase SQL editor to verify RLS coverage.

-- 1) Tables in public schema WITHOUT RLS enabled
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and tablename not like 'pg_%'
  and tablename not like 'sql_%'
  and tablename not like 'schema_migrations'
  and tablename not like 'supabase_%'
  and tablename not like '_realtime_%'
  and tablename not like 'jwt_%'
  and tablename not like 'storage%'
  and tablename not like 'spatial_%'
  and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = pg_tables.tablename
      and c.relrowsecurity = true
  )
order by tablename;

-- 2) Policy coverage overview per table
select
  n.nspname as schema,
  c.relname as table,
  c.relrowsecurity as rls_enabled,
  count(p.oid) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname not like 'pg_%'
  and c.relname not like 'sql_%'
  and c.relname not like 'schema_migrations'
  and c.relname not like 'supabase_%'
  and c.relname not like '_realtime_%'
  and c.relname not like 'jwt_%'
  and c.relname not like 'storage%'
  and c.relname not like 'spatial_%'
group by n.nspname, c.relname, c.relrowsecurity
order by c.relname;

-- 3) List policies with command types
select
  n.nspname as schema,
  c.relname as table,
  p.polname as policy,
  p.polcmd as command
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, p.polname;

-- 4) Quick check for tables missing INSERT or UPDATE policies
with t as (
  select
    c.oid,
    n.nspname as schema,
    c.relname as table
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = true
)
select
  t.schema,
  t.table,
  bool_or(p.polcmd = 'a') as has_insert,
  bool_or(p.polcmd = 'w') as has_update,
  bool_or(p.polcmd = 'r') as has_select,
  bool_or(p.polcmd = 'd') as has_delete
from t
left join pg_policy p on p.polrelid = t.oid
group by t.schema, t.table
having not bool_or(p.polcmd = 'r')
   or not bool_or(p.polcmd = 'a')
   or not bool_or(p.polcmd = 'w')
order by t.table;
