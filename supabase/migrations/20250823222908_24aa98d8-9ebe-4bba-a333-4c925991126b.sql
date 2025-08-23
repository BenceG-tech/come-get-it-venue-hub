
-- 1) Create a dedicated table to store images for venues
create table if not exists public.venue_images (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  url text not null,
  label text,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) Enable RLS
alter table public.venue_images enable row level security;

-- 3) Admins can manage all images
create policy "Admins can manage all venue images"
on public.venue_images
as permissive
for all
to authenticated
using (is_admin())
with check (is_admin());

-- 4) Users can view images for their venues
create policy "Users can view their venue images"
on public.venue_images
as permissive
for select
to authenticated
using (venue_id = any (get_user_venue_ids()));

-- 5) Venue owners can manage (insert/update/delete) their venue images
create policy "Venue owners can manage their venue images"
on public.venue_images
as permissive
for all
to authenticated
using (venue_id = any (get_user_venue_ids()))
with check (venue_id = any (get_user_venue_ids()));

-- Optional (commented): If you later want public pages to show images without auth,
-- you can add a public SELECT policy scoped to venues that are not paused.
-- Uncomment and adjust only if you need public access.
-- create policy "Public can view images of active venues"
-- on public.venue_images
-- as permissive
-- for select
-- to anon
-- using (exists (
--   select 1 from public.venues v
--   where v.id = venue_images.venue_id
--     and v.is_paused = false
-- ));
