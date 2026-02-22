-- Feature Pack 5: Card payment fraud controls + fulfillment

-- Extend payment status enum to include review
alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending','paid','failed','canceled','review'));

create table if not exists public.payment_risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade,
  payment_id uuid references public.payments on delete set null,
  reason text not null,
  severity text not null default 'low' check (severity in ('low','medium','high')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_payment_risk_user_time
  on public.payment_risk_events (user_id, created_at desc);

create table if not exists public.payment_fulfillments (
  payment_id uuid primary key references public.payments on delete cascade,
  applied_at timestamptz default now()
);

alter table public.payment_risk_events enable row level security;
drop policy if exists "Payment risk admin" on public.payment_risk_events;
create policy "Payment risk admin" on public.payment_risk_events
  for select using (public.is_admin());

-- Apply payment when marked paid (idempotent)
create or replace function public.apply_payment_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months int;
  v_coins int;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  if exists (select 1 from public.payment_fulfillments pf where pf.payment_id = new.id) then
    return new;
  end if;

  if new.kind = 'coins' then
    v_coins := coalesce((new.metadata ->> 'coins')::int, 0);
    update public.users
      set coin_balance = coin_balance + v_coins
      where id = new.user_id;
    insert into public.transactions (user_id, amount, type, metadata)
      values (new.user_id, v_coins, 'purchase', jsonb_build_object('reason','card_payment','payment_id',new.id));
  elsif new.kind = 'premium' then
    v_months := coalesce((new.metadata ->> 'months')::int, 1);
    update public.users
      set is_premium = true,
          premium_expires_at = greatest(coalesce(premium_expires_at, now()), now()) + make_interval(months => v_months)
      where id = new.user_id;
    insert into public.subscriptions (user_id, status, plan, provider, started_at, ends_at)
      values (
        new.user_id,
        'active',
        case when v_months >= 3 then 'quarterly' else 'monthly' end,
        new.provider,
        now(),
        now() + make_interval(months => v_months)
      );
    insert into public.transactions (user_id, amount, type, metadata)
      values (new.user_id, 0, 'purchase', jsonb_build_object('reason','premium_card_payment','payment_id',new.id,'months',v_months));
  end if;

  insert into public.payment_fulfillments (payment_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists trg_apply_payment_fulfillment on public.payments;
create trigger trg_apply_payment_fulfillment
after update on public.payments
for each row execute function public.apply_payment_fulfillment();
