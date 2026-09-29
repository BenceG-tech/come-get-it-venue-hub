-- Mobile category routes use stable English keys. Normalize the pilot row so
-- it appears in the `drink` category as well as in editor picks.
update public.rewards
set category = 'drink', updated_at = now()
where name = 'Pilot ajándék ital'
  and category = 'Ital';
