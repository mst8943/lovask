-- Bot advanced features schema

create table if not exists public.bot_health_daily (
    id uuid primary key default gen_random_uuid(),
    bot_id uuid not null,
    day date not null,
    replies integer not null default 0,
    reply_latency_ms integer not null default 0,
    safety_flags integer not null default 0,
    created_at timestamp with time zone not null default now(),
    unique (bot_id, day)
);

create table if not exists public.bot_experiments (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    status text not null default 'active',
    target_type text not null default 'bot', -- bot | group | global
    target_id uuid,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.bot_experiment_variants (
    id uuid primary key default gen_random_uuid(),
    experiment_id uuid not null references public.bot_experiments(id) on delete cascade,
    name text not null,
    prompt text not null,
    weight integer not null default 50
);

create table if not exists public.bot_experiment_assignments (
    id uuid primary key default gen_random_uuid(),
    experiment_id uuid not null references public.bot_experiments(id) on delete cascade,
    match_id uuid not null,
    variant_id uuid not null references public.bot_experiment_variants(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    unique (experiment_id, match_id)
);

create table if not exists public.bot_safety_events (
    id uuid primary key default gen_random_uuid(),
    bot_id uuid not null,
    match_id uuid not null,
    user_id uuid not null,
    category text not null,
    content text,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.bot_memories (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null,
    bot_id uuid not null,
    memory_text text,
    last_user_message text,
    last_bot_reply text,
    updated_at timestamp with time zone not null default now(),
    unique (match_id, bot_id)
);

create table if not exists public.bot_cooldowns (
    id uuid primary key default gen_random_uuid(),
    bot_id uuid not null,
    user_id uuid not null,
    last_sent_at timestamp with time zone not null default now(),
    unique (bot_id, user_id)
);

create table if not exists public.bot_handoffs (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null,
    bot_id uuid not null,
    reason text,
    active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.bot_feedback (
    id uuid primary key default gen_random_uuid(),
    bot_id uuid not null,
    match_id uuid not null,
    message_id uuid,
    rating text not null, -- good | bad
    notes text,
    created_at timestamp with time zone not null default now()
);

create table if not exists public.bot_image_reviews (
    id uuid primary key default gen_random_uuid(),
    photo_id uuid not null,
    status text not null default 'pending',
    notes text,
    updated_at timestamp with time zone not null default now(),
    unique (photo_id)
);

create table if not exists public.bot_quarantine (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    reason text,
    active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    unique (user_id)
);

create table if not exists public.bot_cohort_metrics (
    id uuid primary key default gen_random_uuid(),
    cohort_key text not null,
    bot_id uuid,
    match_rate numeric,
    reply_rate numeric,
    report_rate numeric,
    day date not null default current_date
);

create index if not exists idx_bot_health_daily_bot_day on public.bot_health_daily(bot_id, day);
create index if not exists idx_bot_safety_events_bot_time on public.bot_safety_events(bot_id, created_at);
create index if not exists idx_bot_memories_match on public.bot_memories(match_id);
create index if not exists idx_bot_feedback_bot_time on public.bot_feedback(bot_id, created_at);
create index if not exists idx_bot_quarantine_user on public.bot_quarantine(user_id);

alter table public.bot_health_daily enable row level security;
alter table public.bot_experiments enable row level security;
alter table public.bot_experiment_variants enable row level security;
alter table public.bot_experiment_assignments enable row level security;
alter table public.bot_safety_events enable row level security;
alter table public.bot_memories enable row level security;
alter table public.bot_cooldowns enable row level security;
alter table public.bot_handoffs enable row level security;
alter table public.bot_feedback enable row level security;
alter table public.bot_image_reviews enable row level security;
alter table public.bot_quarantine enable row level security;
alter table public.bot_cohort_metrics enable row level security;

create policy "Admin access bot_health_daily" on public.bot_health_daily for all using (is_admin());
create policy "Admin access bot_experiments" on public.bot_experiments for all using (is_admin());
create policy "Admin access bot_experiment_variants" on public.bot_experiment_variants for all using (is_admin());
create policy "Admin access bot_experiment_assignments" on public.bot_experiment_assignments for all using (is_admin());
create policy "Admin access bot_safety_events" on public.bot_safety_events for all using (is_admin());
create policy "Admin access bot_memories" on public.bot_memories for all using (is_admin());
create policy "Admin access bot_cooldowns" on public.bot_cooldowns for all using (is_admin());
create policy "Admin access bot_handoffs" on public.bot_handoffs for all using (is_admin());
create policy "Admin access bot_feedback" on public.bot_feedback for all using (is_admin());
create policy "Admin access bot_image_reviews" on public.bot_image_reviews for all using (is_admin());
create policy "Admin access bot_quarantine" on public.bot_quarantine for all using (is_admin());
create policy "Admin access bot_cohort_metrics" on public.bot_cohort_metrics for all using (is_admin());
