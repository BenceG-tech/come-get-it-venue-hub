
# Cél

Az admin webappban (come-get-it-venue-hub) legyen minden mező, ami a 5 fiktív Come Get It hely és 5 ital rendes felviteléhez kell, majd ezeket seedeljük is fel — ugyanazon a Supabase adatstruktúrán keresztül, amit a mobilapp is olvas (`get-public-venues`, `get-venue-free-drink-stats`). Semmi hardcode a mobilappban.

# Mit találtam a jelenlegi kódban

- `venues` táblában már megvan: `category`, `price_tier`, `rating`, `tags`, `opening_hours` (jsonb), `coordinates` (jsonb), `participates_in_points`, `points_per_visit`, `is_paused`, `image_url`, `hero_image_url`.
- `VenueFormModal.tsx` már kezeli: tags, business_hours, price_tier, koordináták, képek, pontgyűjtés.
- **Hiányzik a form-ból:** `category` és `rating` mező — jelenleg nem lehet UI-ból beállítani. Ezt pótolni kell.
- `venue_drinks` táblában `venue_id` kötelező → egy ital = egy sor egy venue-höz. Több helyszínhez rendelt ital = több sor (ugyanaz a név/kép/leírás). Ez a projektben már használt minta, ezt követjük.
- `free_drink_windows` (venue_id, drink_id, days[], start_time, end_time, timezone) vezérli, hogy egy ital ingyen elérhető-e — a `get-venue-free-drink-stats` ezt olvassa és ez alapján jelenik meg a mobilban az „Ingyen ital elérhető”.

# Lépések

### 1. Admin form kiegészítése

`src/components/VenueFormModal.tsx`:
- Új **Kategória** select (Bisztró, Romkocsma, Étterem, Koktélbár, Klub, Kávézó, Egyéb) → `formData.category`.
- Új **Értékelés (rating)** number input 0–5, 0.1 lépésköz → `formData.rating`.
- Mentéskor mindkettőt átadjuk az `upsert`-nek.

Nem nyúlunk máshoz, a többi funkció (képek, tag, nyitvatartás, koordináta, pontgyűjtés, ingyen ital manager) már működik.

### 2. Képek feltöltése a `venue-images` bucketbe

A user által feltöltött 9 hangulatkép (`/mnt/user-uploads/…`) közül minden helyhez 1–2 hero + 1–2 galéria kép, italokhoz szintén 1-1:

- Bistro → `441A0468…` (kerthelyiség)
- Romkocsma → `183BC467…` (belső udvar) + `4450A50F…`
- Restaurant → `4450A50F…` + `77E0C0A4…`
- Bar → `901F52BB…` + `AF5F0F97…`
- Club → `BE0F23BD…` + `9FA577EA…`
- Italokhoz: `7A65F5EA…`, `AF5F0F97…`, `9FA577EA…`, `77E0C0A4…`, `183BC467…`

Feltöltés a `venue-images` public bucketbe (already exists) egyszer, script-tel, majd a public URL-eket használjuk a DB rekordokban.

### 3. Adatbázis seed (SQL migráción keresztül)

Egyetlen migrációban:

- 5× `INSERT INTO public.venues` — `is_paused=false`, `participates_in_points=true`, `points_per_visit=10`, `category`, `rating`, `price_tier`, `tags[]`, `coordinates` jsonb, `opening_hours` jsonb (minden nap 00:00–23:59), `image_url`, `hero_image_url`, `formatted_address`, `google_maps_url`.
- `venue_images` bejegyzések (hero + 1–2 galéria) minden helyszínhez.
- 5× ital `venue_drinks` — de mivel több helyhez tartoznak, összesen kb. 12 sor (Azure Garden Spritz×2, Duna Blue Lemonade×3, Craft Beer×3, Midnight Tonic×2, Electric Blue Shot×2). Mindegyik `is_free_drink=true`.
- 12× `free_drink_windows` — minden (venue, drink) párra `days={1,2,3,4,5,6,7}`, `00:00–23:59`, `timezone='Europe/Budapest'`.
- **Nem** hozunk létre `caps`, `merchant_match_rules`, geofence rekordot → nincs korlátozás.
- Owner/membership: `owner_profile_id=null` (partnerhez nem kötjük, admin által kezelt „platform” hely).

A globális napi 1 ingyen ital/user szabály (`issue-redemption-token` edge function) megmarad — ez userre vonatkozik, nem venue-ra, tehát a bemutatás során nem akaszt.

### 4. Ellenőrzés

- Admin `/venues` listában megjelenik mind az 5, státusz „Aktív”.
- Admin `/venues/:id` detail-en látszik a `FreeDrinkManager` az aktív itallal, 00–24 ablakkal.
- `get-public-venues` és `get-public-venue` edge function visszaadja őket (nincs rajta változtatás — már mindent olvas).
- Mobilapp Rork oldalon a lista + detail + „Ingyen ital elérhető” badge megjelenik. (Mobilappot nem módosítjuk.)

# Nem érintjük

- Rork mobilapp kódját.
- A landing page projektet.
- Meglévő RLS-t, edge function-öket, auth-ot.
- Bármely valós partner adatot.

# Utólag

A helyek/italok az admin `/venues` felületen bármikor törölhetők vagy szerkeszthetők (delete gomb, edit modal). Ha később valódi partner jön, ugyanezen a form-on kerül be — csak a `owner_profile_id`-t érdemes majd hozzárendelni.
