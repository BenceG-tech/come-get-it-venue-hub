-- Cleanup previous demo rows
DELETE FROM public.free_drink_windows
 WHERE venue_id IN (SELECT id FROM public.venues WHERE name LIKE 'Come Get It %');
DELETE FROM public.venue_drinks
 WHERE venue_id IN (SELECT id FROM public.venues WHERE name LIKE 'Come Get It %');
DELETE FROM public.venue_images
 WHERE venue_id IN (SELECT id FROM public.venues WHERE name LIKE 'Come Get It %');
DELETE FROM public.venues WHERE name LIKE 'Come Get It %';

-- Insert 5 venues
WITH hours_24 AS (
  SELECT jsonb_build_object(
    'byDay', jsonb_build_object(
      '1', jsonb_build_object('open','00:00','close','23:59'),
      '2', jsonb_build_object('open','00:00','close','23:59'),
      '3', jsonb_build_object('open','00:00','close','23:59'),
      '4', jsonb_build_object('open','00:00','close','23:59'),
      '5', jsonb_build_object('open','00:00','close','23:59'),
      '6', jsonb_build_object('open','00:00','close','23:59'),
      '7', jsonb_build_object('open','00:00','close','23:59')
    ),
    'specialDates', '[]'::jsonb
  ) AS h
),
ins AS (
  INSERT INTO public.venues (
    name, address, description, plan, is_paused, tags,
    coordinates, opening_hours, category, price_tier, rating,
    participates_in_points, points_per_visit,
    image_url, hero_image_url, formatted_address, google_maps_url,
    owner_profile_id
  )
  SELECT v.name, v.address, v.description, 'premium'::venue_plan, false, v.tags,
         v.coords, (SELECT h FROM hours_24), v.category, v.price_tier, v.rating,
         true, 10,
         'https://nrxfiblssxwzeziomlvc.supabase.co/storage/v1/object/public/venue-images/seed/' || v.img,
         'https://nrxfiblssxwzeziomlvc.supabase.co/storage/v1/object/public/venue-images/seed/' || v.img,
         v.address,
         'https://www.google.com/maps/search/?api=1&query=' || (v.coords->>'lat') || ',' || (v.coords->>'lng'),
         '46b15f9d-ed46-41b0-aa6a-5aa2334c407e'::uuid
  FROM (VALUES
    ('Come Get It Bistro',     '1111 Budapest, Lumen köz 4.',       'Nyári hangulatú városi bisztró kerthelyiséggel, fényfüzérekkel és friss italokkal. Ideális könnyed vacsorához, baráti találkozóhoz vagy afterwork programhoz.', ARRAY['Bisztró','Kerthelyiség','Koktél','Limonádé','Afterwork'], jsonb_build_object('lat', 47.4795, 'lng', 19.0524), 'Bisztró',   2, 4.8, 'cgi-bistro.png'),
    ('Come Get It Romkocsma',  '1075 Budapest, Kertész udvar 12.',  'Karakteres budapesti romkocsma belső udvarral, fényfüzérekkel, lazább hangulattal és spontán esti találkozásokkal.',                                            ARRAY['Romkocsma','Udvar','Craft italok','Barátok','Belváros'],  jsonb_build_object('lat', 47.4988, 'lng', 19.0634), 'Romkocsma', 2, 4.6, 'cgi-romkocsma.png'),
    ('Come Get It Restaurant', '1051 Budapest, Október 6. utca 18.','Modern belvárosi étterem elegáns, sötét tónusú enteriőrrel, prémium vacsorahanggal és letisztult italválasztékkal.',                                              ARRAY['Étterem','Vacsora','Bor','Prémium','Belváros'],           jsonb_build_object('lat', 47.4994, 'lng', 19.0507), 'Étterem',   3, 4.9, 'cgi-restaurant.png'),
    ('Come Get It Bar',        '1061 Budapest, Hajós utca 9.',      'Prémium koktélbár fekete márvánnyal, Come Get It kék fényekkel, elegáns italokkal és modern nightlife hangulattal.',                                              ARRAY['Koktélbár','Lounge','Prémium','Afterwork','Randi'],       jsonb_build_object('lat', 47.5031, 'lng', 19.0597), 'Koktélbár', 3, 4.8, 'cgi-bar.png'),
    ('Come Get It Club',       '1093 Budapest, Duna parti sétány 21.','Modern klubhelyszín sötét enteriőrrel, kék fényekkel, DJ-pulttal és erős esti energiával.',                                                                    ARRAY['Klub','DJ','Tánc','Éjszaka','Duna-part'],                 jsonb_build_object('lat', 47.4829, 'lng', 19.0612), 'Klub',      3, 4.7, 'cgi-club.png')
  ) AS v(name, address, description, tags, coords, category, price_tier, rating, img)
  RETURNING id, name
)
INSERT INTO public.venue_images (venue_id, url, label, is_cover, sort_order)
SELECT ins.id,
       'https://nrxfiblssxwzeziomlvc.supabase.co/storage/v1/object/public/venue-images/seed/' || img.file,
       img.label, img.is_cover, img.sort_order
FROM ins
JOIN (VALUES
  ('Come Get It Bistro',      'cgi-bistro.png',      'Kerthelyiség',   true,  0),
  ('Come Get It Romkocsma',   'cgi-romkocsma.png',   'Belső udvar',    true,  0),
  ('Come Get It Romkocsma',   'cgi-restaurant.png',  'Enteriőr',       false, 1),
  ('Come Get It Restaurant',  'cgi-restaurant.png',  'Belső tér',      true,  0),
  ('Come Get It Restaurant',  'cgi-restaurant2.png', 'Terítés',        false, 1),
  ('Come Get It Bar',         'cgi-bar.png',         'Bárpult',        true,  0),
  ('Come Get It Bar',         'cgi-bar2.png',        'Italválaszték',  false, 1),
  ('Come Get It Club',        'cgi-club.png',        'Táncparkett',    true,  0),
  ('Come Get It Club',        'cgi-club2.png',       'Neon hangulat',  false, 1)
) AS img(venue_name, file, label, is_cover, sort_order)
  ON img.venue_name = ins.name;

-- Insert 12 drink rows and matching 0-24 windows
WITH d(venue_name, drink_name, category, abv, description) AS (
  VALUES
    ('Come Get It Bistro',     'Azure Garden Spritz',   'cocktail', 8.0::numeric,  'Frissítő, nyári spritz citrusos jegyekkel, jéggel és Come Get It azúrkék tónussal.'),
    ('Come Get It Bar',        'Azure Garden Spritz',   'cocktail', 8.0::numeric,  'Frissítő, nyári spritz citrusos jegyekkel, jéggel és Come Get It azúrkék tónussal.'),
    ('Come Get It Bistro',     'Duna Blue Lemonade',    'soft',     0.0::numeric,  'Látványos, alkoholmentes kék limonádé citrusokkal, jéggel és friss mentával.'),
    ('Come Get It Romkocsma',  'Duna Blue Lemonade',    'soft',     0.0::numeric,  'Látványos, alkoholmentes kék limonádé citrusokkal, jéggel és friss mentával.'),
    ('Come Get It Restaurant', 'Duna Blue Lemonade',    'soft',     0.0::numeric,  'Látványos, alkoholmentes kék limonádé citrusokkal, jéggel és friss mentával.'),
    ('Come Get It Romkocsma',  'Come Get It Craft Beer','beer',     4.8::numeric,  'Könnyen iható, arany színű craft beer Come Get It hangulatban, logózott pohárban vagy korsóban.'),
    ('Come Get It Bar',        'Come Get It Craft Beer','beer',     4.8::numeric,  'Könnyen iható, arany színű craft beer Come Get It hangulatban, logózott pohárban vagy korsóban.'),
    ('Come Get It Club',       'Come Get It Craft Beer','beer',     4.8::numeric,  'Könnyen iható, arany színű craft beer Come Get It hangulatban, logózott pohárban vagy korsóban.'),
    ('Come Get It Restaurant', 'Midnight Tonic',        'cocktail', 10.0::numeric, 'Elegáns, citrusos tonic ital visszafogott kék fényjátékkal, prémium vacsorákhoz.'),
    ('Come Get It Bar',        'Midnight Tonic',        'cocktail', 10.0::numeric, 'Elegáns, citrusos tonic ital visszafogott kék fényjátékkal, prémium vacsorákhoz.'),
    ('Come Get It Bar',        'Electric Blue Shot',    'spirit',   35.0::numeric, 'Rövid, intenzív, elektromos kék shot klubestékhez és nightlife hangulatú app bemutatókhoz.'),
    ('Come Get It Club',       'Electric Blue Shot',    'spirit',   35.0::numeric, 'Rövid, intenzív, elektromos kék shot klubestékhez és nightlife hangulatú app bemutatókhoz.')
),
img_map(drink_name, file) AS (
  VALUES
    ('Azure Garden Spritz',    'cgi-drinks.png'),
    ('Duna Blue Lemonade',     'cgi-drinks.png'),
    ('Come Get It Craft Beer', 'cgi-bar2.png'),
    ('Midnight Tonic',         'cgi-restaurant2.png'),
    ('Electric Blue Shot',     'cgi-drinks.png')
),
inserted_drinks AS (
  INSERT INTO public.venue_drinks (
    venue_id, drink_name, category, abv, is_sponsored, is_free_drink,
    description, image_url
  )
  SELECT v.id, d.drink_name, d.category, d.abv, false, true,
         d.description,
         'https://nrxfiblssxwzeziomlvc.supabase.co/storage/v1/object/public/venue-images/seed/' || im.file
  FROM d
  JOIN public.venues v ON v.name = d.venue_name
  JOIN img_map im ON im.drink_name = d.drink_name
  RETURNING id, venue_id
)
INSERT INTO public.free_drink_windows (venue_id, drink_id, days, start_time, end_time, timezone)
SELECT venue_id, id, ARRAY[1,2,3,4,5,6,7], '00:00'::time, '23:59:59'::time, 'Europe/Budapest'
FROM inserted_drinks;
