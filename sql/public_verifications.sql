create or replace function public.get_public_verifications(p_user_id uuid)
returns table(user_id uuid, type text)
language sql
security definer
set search_path = public
as $$
  select user_id, type
  from public.user_verifications
  where user_id = p_user_id
    and status = 'approved';
$$;

grant execute on function public.get_public_verifications(uuid) to anon, authenticated;
