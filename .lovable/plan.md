
## Cél

A Rork mobil app már tartalék („teszt") módban működik, mert két konkrét nevű edge function hiányzik. Ezeket telepítjük pontosan a Rork spec szerint, hogy a sárga „Teszt mód" címke eltűnjön és a beváltás élesben, szerveroldali rögzítéssel menjen.

## Új edge functionök

### 1. `supabase/functions/create-redemption-window/index.ts`

**Auth:** JWT kötelező (`Authorization: Bearer <user_jwt>`), 401 ha hiányzik/érvénytelen.

**Body:** `{ venue_id: UUID (required), drink_id?: UUID, user_latitude?: number, user_longitude?: number }`

**Folyamat:**
1. Venue lekérés → 404 ha nincs, 403 `VENUE_PAUSED` ha `is_paused`.
2. **Távolság-ellenőrzés (globális kapcsolóval):**
   - Beolvassa `platform_settings.enforce_redemption_radius` (default `true` ha nincs).
   - Ha `false` → kihagyja.
   - Ha `true` ÉS mindkét koordináta megvan (venue_locations elsődleges, fallback `venues.lat/lng`) → Haversine távolság; ha > `venues.redemption_radius_m` (default 100) → 403 `TOO_FAR` `{ distance_m, allowed_m }`.
   - Ha koordináta hiányzik → átengedi.
   - **Admin bypass:** ha a felhasználó `profiles.is_admin = true`, a távolság-ellenőrzés kimarad.
3. **Ital kiválasztás:** ha `drink_id` megadva, azt használja; különben `venue_drinks` első `is_free_drink = true` sora. 400 `NO_FREE_DRINK` ha nincs.
4. **Időablak-ellenőrzés:** `free_drink_windows` ahol `drink_id` egyezik.
   - Ha nincs egyetlen sor sem → bármikor beváltható.
   - Ha van → Europe/Budapest szerint mai ISO nap (1=hétfő..7=vasárnap) benne a `days` tömbben ÉS `start_time <= now <= end_time` valamelyik sornál. Ha nem → 400 `NO_ACTIVE_WINDOW` `{ windows: [...] }`.
5. **Napi globális limit:** meglévő szabály (1/nap/user Europe/Budapest a `redemptions` táblán) — ha admin, kihagyja.
6. **Token gyártás:** `CGI-{6char}-{32char}`; SHA-256 hash; insert `redemption_tokens` (token_hash, token_prefix, user_id, venue_id, drink_id, device_fingerprint (opcionális, ha jön), issued_at=now, expires_at=now+120s, status='issued').
7. **Response 200:**
   ```json
   {
     "success": true,
     "token": "CGI-ABC123-...",
     "token_id": "...",
     "token_prefix": "ABC123",
     "expires_at": "...",
     "expires_in_seconds": 120,
     "qr_payload": "CGI-ABC123-...",
     "venue": { "id", "name" },
     "drink": { "id", "name", "image_url", "category" }
   }
   ```

### 2. `supabase/functions/confirm-redemption/index.ts`

**Auth:** JWT kötelező (a beváltó felhasználó, nem staff — a Rork „guest button" flow-hoz).

**Body:** `{ token: string }`

**Folyamat:**
1. Token formátum validáció (`CGI-[A-Z0-9]{6}-[A-Za-z0-9]{32}`) → 400 `INVALID_FORMAT`.
2. SHA-256 hash, keresés `redemption_tokens`-ben → 404 `NOT_FOUND`.
3. Ellenőrzés: `user_id === auth.uid()` (kivéve admin) → 403 `NOT_OWNER`.
4. Státusz: `consumed` → 409 `ALREADY_CONSUMED`; `expired`/`revoked` → 410 `INVALID_STATUS`; lejárt (`expires_at < now`) → státusz frissítés + 410 `EXPIRED`.
5. Token frissítés: `status='consumed'`, `consumed_at=now`, `consumed_by_staff_id=user_id` (guest flow-ban a user maga).
6. Drink + venue adatok lekérése.
7. Insert `redemptions`: `venue_id, user_id, drink (név), drink_id, value: 0, token_id, redeemed_at, status: 'redeemed', metadata: { flow: 'guest_button' }`.
8. **CSR bónusz:** ha `venues.csr_enabled = true` ÉS `default_charity_id` van → insert `csr_donations` `amount_huf = venues.donation_per_redemption || 250`, `charity_id`, `user_id`, `venue_id`, `redemption_id`.
9. **Impact üzenet:** összes `csr_donations` a `default_charity_id`-nál (vagy `charities.impact_per_unit` szerint) → `total_impact_units` számolás; `impact_delta = 1`; `impact_message` a `charities.impact_unit_label`-ből vagy fix `'+1 ember kap ma tiszta vizet'`.
10. Async trigger `match-redemption-transaction` (meglévő).
11. **Response 200:**
    ```json
    {
      "success": true,
      "redemption_id": "...",
      "impact_delta": 1,
      "impact_message": "+1 ember kap ma tiszta vizet",
      "total_impact_units": 42
    }
    ```

### 3. `supabase/config.toml`

Két új blokk:
```toml
[functions.create-redemption-window]
verify_jwt = true

[functions.confirm-redemption]
verify_jwt = true
```
(Rork spec kifejezetten kéri a `verify_jwt = true`-t.)

### 4. CORS

Mindkét function: OPTIONS preflight, `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`, minden válaszban (hibában is).

### 5. Dokumentáció

`docs/RORK_FREE_DRINKS_INTEGRATION.md` frissítése: az új két endpoint leírása, mikor melyiket hívja a Rork app (create → QR kijelzés; confirm → „BEVÁLTOM" gomb megnyomásakor), példa payloadok és hibakódok.

## Amit NEM változtatunk

- Meglévő `issue-redemption-token` és `consume-redemption-token` marad (staff-scanner flow).
- Nincs adatbázis-migráció — minden szükséges oszlop és tábla létezik (`redemption_tokens`, `redemptions`, `csr_donations`, `platform_settings.enforce_redemption_radius`, `venues.redemption_radius_m`).

## Ellenőrzés

Deploy után:
1. Supabase dashboard → Edge Functions → mindkettő megjelenik és `active`.
2. Rork app-ban a beváltás sárga „Teszt mód" címkéje eltűnik.
3. Log ellenőrzés: `create-redemption-window` és `confirm-redemption` hívások sikeresek.

## Érintett fájlok

- `supabase/functions/create-redemption-window/index.ts` (új)
- `supabase/functions/confirm-redemption/index.ts` (új)
- `supabase/config.toml` (2 blokk)
- `docs/RORK_FREE_DRINKS_INTEGRATION.md` (kiegészítés)
