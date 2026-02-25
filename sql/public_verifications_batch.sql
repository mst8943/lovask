create or replace function public.get_public_verifications_batch(p_user_ids uuid[])
returns table(user_id uuid, type text)
language sql
security definer
set search_path = public
as $$
  select user_id, type
  from public.user_verifications
  where user_id = any(p_user_ids)
    and status = 'approved';
$$;

grant execute on function public.get_public_verifications_batch(uuid[]) to anon, authenticated;
