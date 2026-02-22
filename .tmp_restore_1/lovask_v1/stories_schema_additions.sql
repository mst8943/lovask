-- Stories features

alter table public.stories add column if not exists media_type text default 'image' check (media_type in ('image','video'));
alter table public.stories add column if not exists highlight boolean default false;

create table if not exists public.story_views (
  id uuid default uuid_generate_v4() primary key,
  story_id uuid references public.stories on delete cascade,
  viewer_id uuid references public.users on delete set null,
  created_at timestamptz default now(),
  unique(story_id, viewer_id)
);

alter table public.story_views enable row level security;

drop policy if exists "Story views insert" on public.story_views;
drop policy if exists "Story views select for owner" on public.story_views;

create policy "Story views insert" on public.story_views
  for insert with check (auth.uid() = viewer_id);

create policy "Story views select for owner" on public.story_views
  for select using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    ) or public.is_admin()
  );
