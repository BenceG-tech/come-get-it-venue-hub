
-- When a row is inserted into public.venues without owner_profile_id,
-- set it to the current authenticated user (auth.uid()).
create or replace function public.set_owner_on_venue()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.owner_profile_id is null then
    new.owner_profile_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_owner_on_venue on public.venues;

create trigger trg_set_owner_on_venue
before insert on public.venues
for each row
execute function public.set_owner_on_venue();
