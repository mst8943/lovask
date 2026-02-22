-- Admin required features schema (RBAC, incidents, assignments, risk, refunds, support threads)

create table if not exists public.admin_case_assignments (
    case_type text not null,
    case_id uuid not null,
    assigned_to uuid,
    assigned_by uuid,
    status text not null default 'active',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    primary key (case_type, case_id)
);

create table if not exists public.admin_incidents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    severity text not null default 'medium',
    status text not null default 'open',
    notes text,
    created_by uuid,
    created_at timestamp with time zone not null default now(),
    closed_at timestamp with time zone
);

create table if not exists public.admin_incident_events (
    id uuid primary key default gen_random_uuid(),
    incident_id uuid not null references public.admin_incidents(id) on delete cascade,
    actor_id uuid,
    action text not null,
    notes text,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.admin_access_logs (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid,
    ip text,
    user_agent text,
    path text,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.admin_permissions (
    key text primary key,
    description text
);

create table if not exists public.admin_role_permissions (
    role text not null,
    permission_key text not null references public.admin_permissions(key) on delete cascade,
    primary key (role, permission_key)
);

create table if not exists public.admin_user_roles (
    user_id uuid primary key,
    role text not null
);

create table if not exists public.admin_action_logs (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null,
    action text not null,
    created_at timestamp with time zone not null default now()
);

create or replace function public.check_admin_rate_limit(
    p_admin_id uuid,
    p_action text,
    p_window_seconds integer,
    p_max_count integer
) returns boolean
language plpgsql
security definer
as $$
declare
    v_count integer;
begin
    select count(*)
    into v_count
    from public.admin_action_logs
    where admin_id = p_admin_id
      and action = p_action
      and created_at >= now() - (p_window_seconds || ' seconds')::interval;

    if v_count >= p_max_count then
        return false;
    end if;

    insert into public.admin_action_logs(admin_id, action)
    values (p_admin_id, p_action);
    return true;
end;
$$;

create table if not exists public.admin_profile_snapshots (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    snapshot jsonb not null,
    created_by uuid,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.refunds (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid,
    user_id uuid,
    amount numeric,
    reason text,
    status text not null default 'open',
    created_by uuid,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists public.chargebacks (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid,
    user_id uuid,
    amount numeric,
    reason text,
    status text not null default 'open',
    created_by uuid,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create table if not exists public.support_messages (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.support_tickets(id) on delete cascade,
    sender_id uuid,
    sender_role text not null default 'user',
    body text not null,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.admin_sla_settings (
    queue text primary key,
    sla_hours integer not null default 24,
    updated_at timestamp with time zone not null default now()
);

create table if not exists public.admin_risk_scores (
    user_id uuid primary key,
    score integer not null default 0,
    reason jsonb,
    updated_at timestamp with time zone not null default now()
);

create index if not exists idx_admin_action_logs_action_time on public.admin_action_logs(action, created_at);
create index if not exists idx_admin_access_logs_admin_time on public.admin_access_logs(admin_id, created_at);
create index if not exists idx_admin_incident_events_incident on public.admin_incident_events(incident_id, created_at);
create index if not exists idx_support_messages_ticket on public.support_messages(ticket_id, created_at);

alter table public.admin_case_assignments enable row level security;
alter table public.admin_incidents enable row level security;
alter table public.admin_incident_events enable row level security;
alter table public.admin_access_logs enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.admin_action_logs enable row level security;
alter table public.admin_profile_snapshots enable row level security;
alter table public.refunds enable row level security;
alter table public.chargebacks enable row level security;
alter table public.support_messages enable row level security;
alter table public.admin_sla_settings enable row level security;
alter table public.admin_risk_scores enable row level security;

create policy "Admin access admin_case_assignments" on public.admin_case_assignments
for all using (is_admin());
create policy "Admin access admin_incidents" on public.admin_incidents
for all using (is_admin());
create policy "Admin access admin_incident_events" on public.admin_incident_events
for all using (is_admin());
create policy "Admin access admin_access_logs" on public.admin_access_logs
for all using (is_admin());
create policy "Admin access admin_permissions" on public.admin_permissions
for all using (is_admin());
create policy "Admin access admin_role_permissions" on public.admin_role_permissions
for all using (is_admin());
create policy "Admin access admin_user_roles" on public.admin_user_roles
for all using (is_admin());
create policy "Admin access admin_action_logs" on public.admin_action_logs
for all using (is_admin());
create policy "Admin access admin_profile_snapshots" on public.admin_profile_snapshots
for all using (is_admin());
create policy "Admin access refunds" on public.refunds
for all using (is_admin());
create policy "Admin access chargebacks" on public.chargebacks
for all using (is_admin());
create policy "Admin access support_messages" on public.support_messages
for all using (is_admin());
create policy "Admin access admin_sla_settings" on public.admin_sla_settings
for all using (is_admin());
create policy "Admin access admin_risk_scores" on public.admin_risk_scores
for all using (is_admin());

insert into public.admin_permissions (key, description) values
('ops.view', 'Ops hub view'),
('users.manage', 'User management'),
('reports.manage', 'Reports moderation'),
('support.manage', 'Support management'),
('payments.manage', 'Payments & transactions'),
('incidents.manage', 'Incident management'),
('risk.view', 'Risk scoring')
on conflict do nothing;

insert into public.admin_role_permissions (role, permission_key) values
('admin', 'ops.view'),
('admin', 'users.manage'),
('admin', 'reports.manage'),
('admin', 'support.manage'),
('admin', 'payments.manage'),
('admin', 'incidents.manage'),
('admin', 'risk.view')
on conflict do nothing;

insert into public.admin_sla_settings (queue, sla_hours) values
('support', 6),
('reports', 2),
('verifications', 24),
('payments', 12)
on conflict do nothing;
