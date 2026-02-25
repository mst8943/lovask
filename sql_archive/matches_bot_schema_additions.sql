-- Matches insert policy for mutual likes + bot match helper

alter table public.matches enable row level security;

drop policy if exists "Matches insert mutual like" on public.matches;

create policy "Matches insert mutual like" on public.matches
  for insert with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and exists (
      select 1 from public.likes l1
      where l1.from_user = user_a and l1.to_user = user_b
    )
    and exists (
      select 1 from public.likes l2
      where l2.from_user = user_b and l2.to_user = user_a
    )
  );

create or replace function public.create_bot_match(p_bot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_match_id uuid;
  v_is_bot boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select is_bot into v_is_bot from public.profiles where id = p_bot_id;
  if v_is_bot is distinct from true then
    raise exception 'target is not bot';
  end if;

  select id into v_match_id
  from public.matches
  where (user_a = v_user_id and user_b = p_bot_id) or (user_b = v_user_id and user_a = p_bot_id)
  limit 1;

  if v_match_id is not null then
    return v_match_id;
  end if;

  insert into public.matches (user_a, user_b)
  values (v_user_id, p_bot_id)
  returning id into v_match_id;

  return v_match_id;
end;
$$;
