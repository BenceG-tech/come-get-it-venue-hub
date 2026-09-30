-- Keep venue_staff focused on POS/redemption duties. Only CGI admins,
-- direct venue owners and venue_owner members may change venue configuration.

create or replace function private.user_can_manage_venue(
  target_venue_id uuid,
  user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null
      or user_id is distinct from (select auth.uid()) then false
    else
      private.is_admin(user_id)
      or exists (
        select 1
          from public.venues v
         where v.id = target_venue_id
           and v.owner_profile_id = (select auth.uid())
      )
      or exists (
        select 1
          from public.venue_memberships vm
         where vm.venue_id = target_venue_id
           and vm.profile_id = (select auth.uid())
           and vm.role::text = 'venue_owner'
      )
  end;
$$;

revoke all on function private.user_can_manage_venue(uuid, uuid) from public, anon;
grant execute on function private.user_can_manage_venue(uuid, uuid) to authenticated, service_role;

drop policy if exists "Venue owners can manage their venue caps" on public.caps;
create policy "Venue owners can manage their venue caps"
  on public.caps for all to authenticated
  using (private.user_can_manage_venue(venue_id))
  with check (private.user_can_manage_venue(venue_id));

drop policy if exists "Venue owners can manage their venue windows" on public.free_drink_windows;
create policy "Venue owners can manage their venue windows"
  on public.free_drink_windows for all to authenticated
  using (private.user_can_manage_venue(venue_id))
  with check (private.user_can_manage_venue(venue_id));

drop policy if exists "Venue owners can manage their venue rewards" on public.rewards;
create policy "Venue owners can manage their venue rewards"
  on public.rewards for all to authenticated
  using (private.user_can_manage_venue(venue_id))
  with check (private.user_can_manage_venue(venue_id));

drop policy if exists "Venue owners can manage their venue drinks" on public.venue_drinks;
create policy "Venue owners can manage their venue drinks"
  on public.venue_drinks for all to authenticated
  using (private.user_can_manage_venue(venue_id))
  with check (private.user_can_manage_venue(venue_id));

drop policy if exists "Venue owners can manage their venue images" on public.venue_images;
create policy "Venue owners can manage their venue images"
  on public.venue_images for all to authenticated
  using (private.user_can_manage_venue(venue_id))
  with check (private.user_can_manage_venue(venue_id));

drop policy if exists "Venue owners can manage their venue locations" on public.venue_locations;
create policy "Venue owners can manage their venue locations"
  on public.venue_locations for all to authenticated
  using (private.user_can_manage_venue(venue_id))
  with check (private.user_can_manage_venue(venue_id));

drop policy if exists "Venue owners can update their venues" on public.venues;
create policy "Venue owners can update their venues"
  on public.venues for update to authenticated
  using (private.user_can_manage_venue(id))
  with check (private.user_can_manage_venue(id));
