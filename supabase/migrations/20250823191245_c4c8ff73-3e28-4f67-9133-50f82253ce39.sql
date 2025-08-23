
with u as (
  select id from auth.users where email = 'gataibence@gmail.com'
)
insert into public.profiles (id, name, is_admin)
select u.id, 'Main Admin', true from u
on conflict (id) do update
  set is_admin = true,
      name = coalesce(public.profiles.name, excluded.name),
      updated_at = now();
