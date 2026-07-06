## Audit: Come Get It backend a hétfői Vinozza demóhoz

Nincs változtatás végrehajtva. Ez read-only audit Rork-AI számára. (Plan mode-ban vagyok, ez az audit a tervezett "deliverable" — semmi nem fut le elfogadáskor; a következő körben Rork-AI ezekre alapozva ír konkrét backend-fix tervet.)

---

### A) Executive summary

- **Vinozza venue létezik** a DB-ben (`id = 46e22a84-b299-4896-8b23-4f294e1d3d58`, `is_paused=false`, `plan=premium`), de a koordinátái **`{lat:0, lng:0}`** → GPS-validáció jelenleg lehetetlen.
- A `venues` táblában **NINCS `latitude`/`longitude` oszlop**; helyette egy `coordinates jsonb` mező van (`{lat, lng}` struktúrával). Az admin form ezt kezeli, nem külön numeric oszlopokat.
- **`visit_history`, `user_csr_impact`, `user_stats`, `missions`, `reward_categories` táblák NEM léteznek.** A Rork mobil által várt sémák hiányoznak. A CSR impact ténylegesen a `csr_donations` táblából számolódik.
- **Nincs auth → user_csr_impact / user_stats trigger.** Az `auth.users → public.profiles` trigger (`handle_new_user`) létrejön, de impact row nem.
- `get-user-csr-impact` **0-s fallbacket ad** üres `csr_donations` esetén, NEM dob hibát → "failed to fetch" valószínűleg CORS, network, vagy mobil hibás base URL, NEM backend exception. A response shape eltér Rork mobil által várttól (`stats.*` vs. `total_donations_huf` flat).
- `get-rewards` `venue_id`-t **UUID-ként** szűr `.eq("venue_id", venue_id)` és `.or(...partner_id.eq.${venue_id})` formában. Ha a frontend `"global"` stringet küld → PostgREST UUID parse error 400/500. A "global" jutalmakat a `is_global=true` flag jelöli, nem külön scope ID.
- `issue-redemption-token` a **régi QR-flow** alapja: `device_fingerprint` (16–256 char regex) **KÖTELEZŐ**, 5 perces device rate limit, 2 perces token TTL, `free_drink_windows` aktív ablak ellenőrzés. Ha nincs aktív window vagy `is_free_drink=true` drink Vinozzához → 400 `NO_ACTIVE_WINDOW` / "No free drink configured". Nem alkalmas a "vendég telefonján nagy gomb" flow-ra.
- Pultos confirm flow (`consume-redemption-token`) **staff JWT-t és `venue_memberships` rowot** vár → demó-on a vendég telefonjáról nem hívható. **Új function kell** a "vendég nyom Beváltom" flow-hoz.
- Daily cap modell részben létezik (`caps.daily/hourly/per_user_daily`), és az `issue-redemption-token` user szinten globálisan enforce-ol 1/nap limitet — **ez a hétfői demón problémát okozhat ha többször demózzák ugyanazzal a userrel**.

---

### B) Edge functions

#### B.1 `get-user-csr-impact` — `supabase/functions/get-user-csr-impact/index.ts`
- **Auth:** user JWT (Authorization header). 401 ha hiányzik, 401 ha `auth.getUser()` hibázik.
- **Body:** nincs (GET-szerű, de POST is működik).
- **DB read:** `csr_donations` (user_id szerint), `charities` (top charity name).
- **Response (success 200):**
  ```json
  {
    "total_donations_huf": 0,
    "donation_count": 0,
    "favorite_charity": null,
    "recent_donations": []
  }
  ```
- **Fresh user fallback:** ✅ van — üres lista esetén 0-s értékek. Nem 404, nem dob.
- **UUID validation:** nincs explicit, de user.id Supabase JWT-ből jön → biztonságos.
- **Hardcoded "global":** nincs.
- **Eltérés Rork által várt shape-től:**
  - Várt: `{ stats: { total_impact_units, people_helped, water_days_provided } }`
  - Adott: `total_donations_huf` (flat), nincs `people_helped`, nincs `water_days_provided`.
  - **Fix javaslat:** shape mapping a függvényben (pl. `people_helped = donation_count`, `water_days_provided = floor(total_donations_huf / 250)` vagy domain szabály szerint), kiegészítő `stats` blokk visszafelé kompatibilisen.
- **"failed to fetch" gyanú:** nem a függvény hibája. Vagy CORS preflight (header lista hiányos? — `x-supabase-client-*` headerek engedélyezve vannak, OK), vagy a mobil rossz URL-re hív, vagy nincs Authorization header → 401 amit Rork "failed to fetch"-ként logol.
- **Logok:** `supabase--edge_function_logs` üres → a függvény **24-48 órán belül nem futott le egyszer sem**. Ez maga is jelzés: a mobil valószínűleg nem éri el a function endpoint-ot (rossz URL vagy auth header miss).

#### B.2 `get-rewards` — `supabase/functions/get-rewards/index.ts`
- **Auth:** SEMMI (csak service role belül). Bárki hívhatja.
- **Body:** `{ venue_id: string }` — kötelező.
- **DB read:** `rewards` (`.eq(active, true)`, `.gte(valid_until, today)`, `.or(venue_id.eq.${venue_id}, is_global.eq.true, partner_id.eq.${venue_id})`), `venues` (partner-enrichment).
- **Response success:** `{ success: true, rewards: [...] }`
- **"global" UUID error gyökér:** a `.or()` string interpolációval rakja be `venue_id`-t. Ha a mobil `"global"`-t küld → három feltételből kettő (`venue_id.eq.global`, `partner_id.eq.global`) UUID parse hibát dob PostgREST oldalon → 400 / 500 message-ben `invalid input syntax for type uuid: "global"`.
- **"global" mint koncepció:** `rewards.is_global boolean` flag létezik. NEM külön scope ID. A frontend nem `venue_id="global"`-t kéne küldjön, hanem konkrét venue UUID-t (akkor a backend visszaadja a venue saját + globális + partner rewardjait).
- **Legbiztonságosabb fix demó előtt:** function eleján validálni a `venue_id`-t UUID regex-szel; ha nem UUID, csak `is_global=true` jutalmakat adni vissza, **és nem futtatni az `.or()`-t**. Frontend nem küldheti a "global" stringet.
- **Hardcoded global venue/kategória:** nincs ID szinten, csak a `is_global` flag.
- **UUID validation:** nincs.

#### B.3 `issue-redemption-token` — `supabase/functions/issue-redemption-token/index.ts`
- **Auth:** NEM ellenőrzi a JWT-t (service role-lal dolgozik). `user_id` body-ban érkezhet opcionálisan.
- **Body kötelező:** `venue_id` (UUID), `device_fingerprint` (16–256 char, `^[a-zA-Z0-9\-]+$`). Opcionális: `drink_id`, `user_id`.
- **400 forrásai (sorrendben):**
  1. `venue_id` vagy `device_fingerprint` hiányzik.
  2. `device_fingerprint` regex nem stimmel (pl. ha a mobil rövid stringet küld vagy `_`-t/`.`-ot tartalmaz).
  3. `free_drink_windows`-ban nincs aktív window Vinozzára → `NO_ACTIVE_WINDOW` (400).
  4. Nincs `is_free_drink=true` drink Vinozza-hoz a `venue_drinks` táblában → "No free drink configured" (400).
  - Egyéb státuszok: 403 ha venue paused / user már beváltott ma / cap elérve, 404 ha venue nincs, 429 ha rate limited.
- **DB read/write:** `venues`, `free_drink_windows`, `venue_drinks`, `caps`, `redemptions`, `redemption_tokens` (insert), `token_rate_limits` (insert).
- **UUID validation:** nincs explicit, de Supabase query maga validál (400-as PostgREST hiba ha nem UUID).
- **Régi QR-flow?** Igen — az output a `token` (CGI-XXXXXX-… formátum) és 2 perces TTL, kifejezetten arra tervezve hogy pultos QR-scanner-rel beolvassa.
- **Új flow-ban használható-e?** A "venue + window + drink + cap + rate limit + user daily limit" logika **újrahasznosítható**, csak a token formátum, a 2 perces TTL, és a pultos consume oldal cserélendő.

#### B.4 `consume-redemption-token` — `supabase/functions/consume-redemption-token/index.ts`
- **Auth:** Bearer JWT KÖTELEZŐ; a hívónak `venue_memberships`-ben kell lennie vagy `is_admin=true` a `profiles`-ban.
- **Body:** `{ token: string }`.
- **Demó alkalmasság:** **NEM JÓ** a "vendég nyom Beváltom" flow-hoz, mert a vendég JWT-je nincs `venue_memberships`-ben → 403 `VENUE_UNAUTHORIZED`. A pultos nem fog a vendég telefonján bejelentkezni.

#### B.5 Egyéb releváns functionök (összegezve)
- `redeem-reward`, `void-redemption`, `match-redemption-transaction`, `get-venue-free-drink-stats`, `generate-user-qr`, `validate-user-qr` — mind a régi QR-alapú vagy POS-integrációs flow-hoz tartozik. Hétfői Dusk-stílusú flow szempontjából **nem kritikus**, kivéve `match-redemption-transaction` ami `consume-redemption-token`-ből triggerelődik (POS attribution).
- `get-user-stats-extended`, `get-user-points`, `get-user-stats` — analytikai functionök, demó szempontjából másodlagosak. Ezeket nem nyitottam meg, ha kell külön bemegyek.

---

### C) DB schema audit

| Tábla | Létezik? | Megjegyzés |
|---|---|---|
| `venues` | ✅ | **Nincs `latitude`/`longitude`**. Van `coordinates jsonb` (`{lat,lng}`), `distance`, `google_maps_url`, `formatted_address`, `category`, `price_tier`, `is_paused`, `participates_in_points`, `csr_enabled`, `default_charity_id`, `donation_per_redemption`. |
| `profiles` | ✅ | `id` (= auth.users.id), `name`, `is_admin`, `email`, `phone`, `avatar_url`, `last_seen_at`, `signup_source`, `device_info jsonb`, `points`. |
| `rewards` | ✅ | `venue_id` NOT NULL, `is_global bool`, `partner_id uuid`, `priority`, `max_redemptions`, `current_redemptions`, `valid_until date`, `active bool`. |
| `redemption_tokens` | ✅ | `token_hash`, `token_prefix`, `user_id`, `venue_id`, `drink_id`, `device_fingerprint`, `issued_at`, `expires_at`, `consumed_at`, `consumed_by_staff_id`, `status` (enum). |
| `redemptions` | ✅ | `venue_id`, `user_id`, `drink text`, `drink_id`, `value int`, `token_id`, `staff_id`, `redeemed_at`, `external_order_id`, `status text`, `metadata jsonb`. |
| `visit_history` | ❌ | NEM létezik. |
| `user_csr_impact` | ❌ | NEM létezik. Az adatot a `csr_donations` aggregálásából számoljuk runtime. |
| `user_stats` | ❌ | NEM létezik. |
| `missions` | ❌ | NEM létezik. |
| `reward_categories` | ❌ | NEM létezik (a `rewards.category text` szabad szöveg). |
| `reward_redemptions` | ✅ (a táblalista szerint, részleteket nem kértem) | |
| `csr_donations` | ✅ | `redemption_id`, `user_id`, `venue_id`, `charity_id`, `amount_huf int`. |
| `charities` | ✅ | `name`, `description`, `logo_url`, `website_url`, `is_active`, `total_received_huf`. |
| `free_drink_windows` | ✅ | `venue_id`, `days int[]` (ISO 1-7), `start_time`, `end_time`, `timezone`, `drink_id`. |
| `venue_drinks` | ✅ | `venue_id`, `drink_name`, `category`, `is_free_drink bool`, `is_sponsored`, `image_url`. |
| `caps` | ✅ | `venue_id`, `daily`, `hourly`, `monthly`, `per_user_daily`, `on_exhaust`, `alt_offer_text`. |
| `user_points` | ✅ | `user_id`, `balance`, `lifetime_earned/spent`, `total_spend`. |

**Hiányzó oszlopok a Dusk-stílusú flow-hoz:**
- `venues.latitude numeric`, `venues.longitude numeric` — **vagy** maradunk a `coordinates jsonb`-nél és az admin formot ellenőrizzük (lásd E pont).
- Új vagy átalakított "redemption_windows" táblára nincs feltétlen szükség, a `redemption_tokens` újrahasznosítható egy új token-formátummal és 120s TTL-lel.

---

### D) Vinozza adatok

| Mező | Érték |
|---|---|
| `id` | `46e22a84-b299-4896-8b23-4f294e1d3d58` |
| `name` | `Vinozza` |
| `address` | `1148. Budapest, Vezér u 180` |
| `coordinates` | `{ "lat": 0, "lng": 0 }` ← **placeholder, NEM valós koordináta** |
| `is_paused` | `false` (= aktív) |
| `plan` | `premium` |
| `category` | `null` |
| `formatted_address`, `google_maps_url`, `latitude/longitude külön` | nem megállapítható ebből a query-ből / nem létezik külön |

**Külön kérdésre:**
- `latitude`/`longitude` mint külön oszlop: **NINCS**. `coordinates jsonb` van.
- Vinozza koordinátája: `{lat:0,lng:0}` → **hibás**. A valódi 1148 Vezér u 180 ~ `47.4972°, 19.1395°` (geokódolás külön függvénnyel ellenőrzendő, nem teszem most).
- **Javasolt SQL (csak javaslat, ne futtasd):**
  ```sql
  -- Opció A: maradunk a jsonb-nél, csak adatfix
  UPDATE public.venues
  SET coordinates = jsonb_build_object('lat', 47.4972, 'lng', 19.1395)
  WHERE id = '46e22a84-b299-4896-8b23-4f294e1d3d58';

  -- Opció B: külön numeric oszlopok hozzáadása (ha Rork mobil ezt várja)
  ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS latitude  numeric(9,6),
    ADD COLUMN IF NOT EXISTS longitude numeric(9,6);
  CREATE INDEX IF NOT EXISTS venues_latlng_idx
    ON public.venues (latitude, longitude);
  ```
  **Ajánlás:** Opció B + dual-write (jsonb és külön oszlop is) hétfőig, hogy mind a meglévő admin form, mind a Rork mobil dolgozhasson belőle.
- **Admin form, ami tölti:** `src/components/VenueFormModal.tsx` + `src/components/VenueLocationManager.tsx` + `src/components/VenueMapPreview.tsx`. Ezek a `coordinates jsonb`-t kezelik (Mapbox geokódolóval, `MAPBOX_ACCESS_TOKEN` secret megvan). Külön `latitude/longitude` UI mezőt nem találtam — ha hozzáadjuk az oszlopokat, az admin formot ki kell egészíteni vagy DB triggerrel `coordinates → lat/lng` szinkronizálni.

---

### E) Fresh user flow (first login → home load)

Mi történik egy teljesen friss user első bejelentkezésekor:

1. **`auth.users` INSERT** (Supabase Auth kezeli).
2. **`handle_new_user` trigger** (SECURITY DEFINER) → `public.profiles` row beszúrása `{id, name, is_admin=false}`. ✅ Létezik.
3. **`user_points` row:** NEM jön létre automatikusan. A `modify_user_points` RPC oldja meg "INSERT … ON CONFLICT DO NOTHING"-gal **első ponttranzakciónál**.
4. **`user_csr_impact`:** nincs ilyen tábla, nem releváns.
5. **`user_stats`:** nincs ilyen tábla, nem releváns.
6. **Mobil home load várt requestjei** (Rork tényleg ezeket kéri-e, nem megállapítható innen):
   - `get-user-csr-impact` → működik, 0-s fallbacket ad → "failed to fetch" valószínűleg URL/auth probléma a kliens oldalon.
   - `get-rewards` `{venue_id:"global"}` → **400-at fog adni** UUID parse miatt.
   - `get-user-points` / `get-user-stats` → külön audit kell, nem nyitottam meg.
- **Hol törhet el:** ha a mobil `venue_id="global"`-t küld bárhova, ha a `Authorization` headerből hiányzik a `Bearer ` prefix, ha a Rork app rossz Supabase URL-t/anon key-t használ, ha a mobil az új userhez azonnal akar `redemption_tokens` insertet hívni JWT nélkül.

---

### F) Redemption flow recommendation

**Ne írjunk teljesen újat semmiből; használjuk fel az `issue-redemption-token` üzleti logikát, és adjunk hozzá két új vékony function-t a Dusk-flow-hoz:**

- **F.1 `create-redemption-window`** (új function)
  - **Input:** `{ venue_id: uuid, user_latitude: number, user_longitude: number, demo_mode?: boolean }`
  - **Auth:** user JWT KÖTELEZŐ (vendég azonosítása → `redemptions.user_id` és daily limit).
  - **Lépések:**
    1. `auth.getUser()` → vendég `user_id`.
    2. Venue lookup (`is_paused=false`).
    3. Ha `demo_mode=false` ÉS NEM `EXPO_PUBLIC_DEMO_MODE` (vagy server-side `DEMO_MODE` env): Haversine ≤ 100 m. Demo bypass.
    4. `free_drink_windows` aktív window — **demó miatt opcionálisan átléphető**, ha admin Vinozza-hoz létrehoz egy 0:00–23:59 hétfői ablakot, nem kell kódot változtatni.
    5. (Daily cap mezők előkészítve, NEM enforce.)
    6. Token generálás (CGI-XXXXXX-… maradhat) **120s TTL**.
    7. `redemption_tokens` insert (`status='issued'`).
    8. Visszaad: `{ token, expires_at, expires_in_seconds: 120, venue: {id,name}, drink: {…} }`.
  - **Táblák:** `venues`, `free_drink_windows`, `venue_drinks`, `redemption_tokens`. Új tábla **NEM kell**.

- **F.2 `confirm-redemption`** (új function, a `consume-redemption-token` mintájára DE staff-auth NÉLKÜL)
  - **Input:** `{ token: string }`
  - **Auth:** user JWT KÖTELEZŐ (= a vendég JWT-je, aki a Beváltom-ot nyomja).
  - **Lépések:**
    1. Token hash lookup, `status='issued'`, nem lejárt, `user_id === auth.uid()` (vendég csak a saját tokenjét válthatja be — ez kivédi a token-lopást).
    2. `redemption_tokens` update `status='consumed'`, `consumed_at=now()`. (Itt nincs `consumed_by_staff_id`, mert nincs pultos — vagy hagyjuk `null`-ra.)
    3. `redemptions` insert (`venue_id, user_id, drink, drink_id, value=0, token_id, redeemed_at`).
    4. Ha `venues.csr_enabled` és `default_charity_id` → `csr_donations` insert `amount_huf = venues.donation_per_redemption`. (Ettől fog működni az "+1 ember kap ma tiszta vizet".)
    5. `match-redemption-transaction` fire-and-forget (POS attribution, opcionális demón).
    6. Visszaad: `{ success: true, redemption: {…}, impact_delta: 1, impact_message: "+1 ember kap ma tiszta vizet" }`.
  - **Új tábla:** nem szükséges.

- **A meglévő `issue-redemption-token` és `consume-redemption-token` MARADHAT** a régi POS/QR flow-hoz a partner dashboardon belül; a Dusk-flow külön endpoint-eken megy. Így nincs regressziós kockázat.

---

### G) SQL javaslatok (NE futtasd, csak javaslat)

```sql
-- G.1 Vinozza koordináta-fix (jsonb-ben maradva)
UPDATE public.venues
SET coordinates = jsonb_build_object('lat', 47.4972, 'lng', 19.1395)
WHERE id = '46e22a84-b299-4896-8b23-4f294e1d3d58'
  AND coordinates ->> 'lat' = '0';

-- G.2 Opcionális: külön numeric oszlopok mobilnak (ha Rork így várja)
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS latitude  numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);
CREATE INDEX IF NOT EXISTS venues_latlng_idx
  ON public.venues (latitude, longitude);

-- G.3 Backfill jsonb → numeric (egyszer)
UPDATE public.venues
SET latitude  = NULLIF((coordinates->>'lat')::numeric, 0),
    longitude = NULLIF((coordinates->>'lng')::numeric, 0)
WHERE coordinates ? 'lat';

-- G.4 Daily cap mező a hétfői modellhez (előkészítés, NEM enforce)
-- (per_user_daily már létezik a caps táblában → nem kell új oszlop.)

-- G.5 Vinozza-hoz aktív free_drink_window hétfőre 0–23:59 (demo enabler)
-- (Adminból is létrehozható a meglévő ScheduleGrid UI-on át.)
INSERT INTO public.free_drink_windows
  (venue_id, days, start_time, end_time, timezone, drink_id)
SELECT '46e22a84-b299-4896-8b23-4f294e1d3d58',
       ARRAY[1,2,3,4,5,6,7]::int[],
       '00:00'::time,
       '23:59'::time,
       'Europe/Budapest',
       (SELECT id FROM public.venue_drinks
        WHERE venue_id='46e22a84-b299-4896-8b23-4f294e1d3d58'
          AND is_free_drink=true
        LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.free_drink_windows
  WHERE venue_id='46e22a84-b299-4896-8b23-4f294e1d3d58'
);

-- G.6 Legalább egy is_free_drink=true drink Vinozza-hoz (ha nincs)
-- Az issue-redemption-token egyébként hibázni fog "No free drink configured"-tal.
-- Adminból a DrinkEditor / VenueFormModal-on át létrehozható.

-- G.7 RLS — meglévők elegendőek a két új function-höz, mert mindkettő
-- service_role-lal ír; a user JWT csak az auth.getUser()-hez kell.
```

---

### H) Konkrét kérdések Rork-AI felé

1. A mobil tényleg **`venue_id="global"`**-t küld a `get-rewards`-nak? Ha igen, hol és miért? (Frontend fix vs backend tolerancia kérdés.)
2. A "failed to fetch" `get-user-csr-impact`-nél: a mobil **küld-e `Authorization: Bearer <jwt>`** headert? Ha nem, az 401, nem network error.
3. A demón a vendég **be van jelentkezve** (Supabase auth), vagy anonim? (A javasolt `confirm-redemption` vendég JWT-t feltételez. Ha anonim, a token-binding `device_fingerprint`-re fog működni a `user_id` helyett.)
4. A `EXPO_PUBLIC_DEMO_MODE` csak kliens-oldali bypass, vagy a backend is kapjon **`DEMO_MODE` env flag-et**, hogy a GPS-check szerver-oldalon is bypass-olható legyen?
5. Az "+1 ember kap ma tiszta vizet" copyban a "+1" a `csr_donations` count vagy `amount_huf / X` képletből jön? (`venues.donation_per_redemption` int, jelenleg nem tudjuk az egységét.)
6. Maradjunk a `coordinates jsonb`-nél, vagy adjunk hozzá külön `latitude/longitude numeric` oszlopokat? (Admin form `jsonb`-vel dolgozik, mobil ismeretlen.)
7. Hétfőre a `per_user_daily` és a globális 1/nap user limit (az `issue-redemption-token`-ben hard-coded) **enforce-olódjon vagy bypass-olódjon** a demó-userekre? (Jelenlegi kód enforce-ol → ha kétszer demózzák ugyanazzal a userrel, a második 403-at kap.)

---

### I) Redacted logs

- **`get-user-csr-impact` (utolsó 24-48h):** üres — **0 hívás logolva**. A mobil valószínűleg el sem éri a function-t.
- **`get-rewards`:** üres — 0 hívás logolva.
- **`issue-redemption-token`:** üres — 0 hívás logolva.
- **`get-dashboard-stats`** (admin webapp háttéraktivitás): csak sikeres logok, hibák nélkül (`[get-dashboard-stats] Returning stats for admin: [...]`). Nincs releváns hiba.
- **Konkrét stack trace / 4xx body nem áll rendelkezésre**, mert a function-ök nem futottak. Rork felől kell részletes kliensoldali log a tényleges hibákról (HTTP status, response body, request URL).

---

### Kockázatlista — javítva

| Prio | Tétel | Megjegyzés |
|---|---|---|
| **P0** | Vinozza `coordinates {lat:0,lng:0}` → valós koordináta | DB UPDATE 1 sor. Blokkolja a GPS validációt. |
| **P0** | Vinozza-hoz `is_free_drink=true` `venue_drinks` row + `free_drink_windows` aktív window | Egyébként minden token kérés 400. |
| **P0** | Új `create-redemption-window` + `confirm-redemption` function (Dusk-flow) | A meglévő `consume-redemption-token` staff-only, nem alkalmas. |
| **P0** | `get-user-csr-impact` response shape map-elés Rork által várt `stats.*` formára | Backward compatible bővítés, low-risk. |
| **P0** | A globális 1/nap user limit lekapcsolása `DEMO_MODE` env mellett az issue/create function-ben | Különben demó közben 403. |
| **P1** | `get-rewards` UUID guard: ha `venue_id` nem UUID, csak `is_global=true`-t adjon vissza | Vagy frontend ne küldjön "global"-t. |
| **P1** | `coordinates jsonb` → külön `latitude/longitude` oszlopok (csak ha Rork mobil így várja) | Backfill kérdés, ALTER TABLE biztonságos. |
| **P2** | Igazi POS attribution (`match-redemption-transaction`) | Demón nem látszik, későbbi sprint. |
| **P2** | Plus subscription enforcement | Most minden Plus, OK. |
| **P2** | True daily cap enforce + admin UI | Modell már megvan (`caps.per_user_daily`). |
| **P2** | Real charity partner naming + dynamic copy | "+1 ember kap ma tiszta vizet" hardcode-olható egyelőre. |

Eltérés a Te listádtól: a `get-user-csr-impact` is **P0 shape-mismatch szempontjából** (nem "failed to fetch" backend bug, hanem várt struktúra eltérés). A `get-rewards` lehet **P1** (workaroundolható a frontend oldalon, nem blokkolja a happy path-t).

Várom Rork-AI következő körét a konkrét fix-tervvel; minden módosítást ezután fogok implementálni külön plan körben.