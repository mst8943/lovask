-- Profile preference field for "Kimi ariyorsun?"
alter table public.profiles
add column if not exists looking_for_genders text[] default '{}'::text[];

-- Backfill basic defaults for existing users with empty preference.
update public.profiles
set looking_for_genders = case
  when gender = 'Male' then array['Female']
  when gender = 'Female' then array['Male']
  else array['Male', 'Female']
end
where coalesce(array_length(looking_for_genders, 1), 0) = 0;

