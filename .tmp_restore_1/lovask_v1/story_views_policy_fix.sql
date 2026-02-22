-- Fix story view insert permission for authenticated users
alter table public.story_views enable row level security;

drop policy if exists "Story views insert" on public.story_views;
create policy "Story views insert" on public.story_views
  for insert
  with check (auth.uid() = viewer_id);

