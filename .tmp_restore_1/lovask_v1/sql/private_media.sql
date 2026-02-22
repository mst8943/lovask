-- Private media support for chat messages
-- Adds view-once and expiry columns

begin;

alter table public.messages
  add column if not exists media_view_once boolean default false,
  add column if not exists media_expires_at timestamptz,
  add column if not exists media_viewed_at timestamptz;

create index if not exists idx_messages_media_view
  on public.messages (media_view_once, media_viewed_at);

commit;
