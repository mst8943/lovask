-- Admin verification for bank transfers

alter table public.bank_transfers add column if not exists coins_amount int;
alter table public.bank_transfers add column if not exists premium_months int;

create or replace function public.verify_bank_transfer(p_transfer_id uuid, p_approve boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  v_months int;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into t from public.bank_transfers where id = p_transfer_id for update;
  if not found then
    return false;
  end if;

  if t.status <> 'pending' then
    return false;
  end if;

  if not p_approve then
    update public.bank_transfers
    set status = 'rejected',
        admin_id = auth.uid(),
        verified_at = now()
    where id = p_transfer_id;
    return true;
  end if;

  update public.bank_transfers
  set status = 'verified',
      admin_id = auth.uid(),
      verified_at = now()
  where id = p_transfer_id;

  if t.kind = 'coins' then
    update public.users
    set coin_balance = coin_balance + coalesce(t.coins_amount, 0)
    where id = t.user_id;

    insert into public.transactions (user_id, amount, type, metadata)
    values (t.user_id, coalesce(t.coins_amount, 0), 'purchase', jsonb_build_object('reason','bank_transfer','transfer_id',t.id));
  end if;

  if t.kind = 'premium' then
    v_months := coalesce(t.premium_months, 1);

    update public.users
    set is_premium = true,
        premium_expires_at = greatest(coalesce(premium_expires_at, now()), now()) + make_interval(months => v_months)
    where id = t.user_id;

    insert into public.subscriptions (user_id, status, plan, provider, started_at, ends_at)
    values (
      t.user_id,
      'active',
      case when v_months >= 3 then 'quarterly' else 'monthly' end,
      'bank_transfer',
      now(),
      now() + make_interval(months => v_months)
    );

    insert into public.transactions (user_id, amount, type, metadata)
    values (t.user_id, 0, 'purchase', jsonb_build_object('reason','premium_bank_transfer','transfer_id',t.id,'months',v_months));
  end if;

  return true;
end;
$$;
