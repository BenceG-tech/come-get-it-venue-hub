-- Restrict venue image writes to CGI admins and venue owners.
-- Venue-scoped images must live under a top-level folder named after the venue UUID.
-- Admin-owned global assets may continue to use shared folders such as rewards/.

drop policy if exists "Venue owners or admins can upload venue images" on storage.objects;
drop policy if exists "Venue owners or admins can update venue images" on storage.objects;
drop policy if exists "Venue owners or admins can delete venue images" on storage.objects;

create policy "Venue owners or admins can upload venue images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'venue-images'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.venues venue_row
      where venue_row.id::text = (storage.foldername(storage.objects.name))[1]
        and private.user_can_manage_venue(venue_row.id)
    )
  )
);

create policy "Venue owners or admins can update venue images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'venue-images'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.venues venue_row
      where venue_row.id::text = (storage.foldername(storage.objects.name))[1]
        and private.user_can_manage_venue(venue_row.id)
    )
  )
)
with check (
  bucket_id = 'venue-images'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.venues venue_row
      where venue_row.id::text = (storage.foldername(storage.objects.name))[1]
        and private.user_can_manage_venue(venue_row.id)
    )
  )
);

create policy "Venue owners or admins can delete venue images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'venue-images'
  and (
    private.is_admin()
    or exists (
      select 1
      from public.venues venue_row
      where venue_row.id::text = (storage.foldername(storage.objects.name))[1]
        and private.user_can_manage_venue(venue_row.id)
    )
  )
);
