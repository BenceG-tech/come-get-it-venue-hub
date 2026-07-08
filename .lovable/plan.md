
## Cél

1. A beváltás azonnal működjön demo/videó rögzítéshez — a Rork szimulátorban a "túl messze vagy" hiba ne akadályozzon.
2. Hosszabb távon konfigurálható legyen: helyszínenkénti radius + admin bypass + globális kapcsoló.
3. Ezután: Felhasználók lista és QuickView modal mobil használhatóság javítása.

---

## 1. rész — Beváltás azonnali demózhatósága

### 1.1 Globális "distance check" kapcsoló (feature flag)
- Új rekord `platform_settings` táblában (ha nincs, létrehozzuk): `enforce_redemption_radius` (boolean, default `false` amíg demózol, később `true`).
- Admin felületen új kapcsoló a **Beállítások** oldalon: „Beváltásnál távolság-ellenőrzés kényszerítése" — egy kattintással ki/be.
- A Rork app és az edge functionok innen olvassák a beállítást.

### 1.2 Helyszínenkénti radius mező
- Új oszlop: `venues.redemption_radius_m` (integer, default 100, nullable).
- `VenueFormModal`-ban új mező „Beváltási sugár (m)" — üresen hagyva a globális default (100 m) érvényes.
- Rork app ezt olvassa a helyszín rekordból távolság-check során.

### 1.3 Admin JWT bypass a Rork appban
- `issue-redemption-token` már tud `test_mode`-ot (előző körben megcsináltuk). Kiegészítjük egy `skip_distance` flaggel, amit csak `cgi_admin` állíthat.
- Rork oldalra rövid dokumentáció (`docs/RORK_FREE_DRINKS_INTEGRATION.md` frissítés): ha admin user van bejelentkezve, a kliens automatikusan `skip_distance: true`-t küld.

### 1.4 Demo-mód (a videózáshoz — azonnal használható)
- A globális kapcsoló `enforce_redemption_radius = false`-ra állítása → a Rork app kihagyja a távolság-checket az összes usernél, amíg vissza nem kapcsoljuk.
- Így most **egyszerűen kikapcsolod, videózol, majd visszakapcsolod**.
- Rork felé rövid instrukció, hogy a kliens az `enforce_redemption_radius` értékét figyelje induláskor és beváltás előtt.

### 1.5 Nap-migráció most kihagyva
- A Rork logja szerint az élő free_drink_windows sorok mind `[1..7]` napra érvényesek, tehát a nap-check átmegy.
- A migrációt (régi vasárnap=0 → ISO hétfő=1) most kihagyjuk, később nyugodtan lefuttatjuk.

---

## 2. rész — Felhasználók lista + QuickView mobil optimalizálás

### 2.1 Felhasználók lista (mobil)
- Már van kártya-alapú mobil layout — átnézzük és tömörítjük:
  - Kisebb avatar (40 → 32 px), egysoros név + tag chip.
  - Másodlagos sor: pontok · beváltások · utolsó aktivitás — kompakt ikonokkal.
  - Bulk action bar mobilon lefelé úszó (sticky bottom) — nem takarja el a listát.
- Szűrők/tabok: horizontálisan scrollolható chip-sor a jelenlegi dropdown helyett.
- Server-side pagination gomb kompaktabb (jelenleg túl sok helyet foglal).

### 2.2 QuickView modal (mobil Sheet)
- Jelenlegi modal → alulról felhúzható `Sheet` mobilon (asztali gépen marad Dialog).
- Fejléc: avatar + név + státusz chip egy sorban, közvetlenül alatta a fő KPI-ok (pontok, beváltások, utolsó aktivitás) egyetlen kompakt gridben.
- Akciógombok (`ManualNotificationModal`, `SingleBonusPointsModal`, „Részletek megnyitása") a Sheet aljára fixen — nem kell görgetni értük.
- Behavioral tag chip-ek 2 sorba tömörítve, felesleges térközök nélkül.

### 2.3 Konzisztencia
- Ugyanaz a mobil sűrítés kerül a Users detail lap tab-fejlécére is (chip-scroll, kompakt padding).

---

## Technikai részletek

**Migráció (új):**
```sql
alter table public.venues
  add column if not exists redemption_radius_m integer default 100;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);
grant select on public.platform_settings to anon, authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "anyone can read" on public.platform_settings for select using (true);
create policy "admins can write" on public.platform_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.platform_settings(key, value)
  values ('enforce_redemption_radius', 'false'::jsonb)
  on conflict (key) do nothing;
```

**Edge function változás:**
- `issue-redemption-token`: `skip_distance` paraméter elfogadása admin JWT-nél; egyébként a `platform_settings.enforce_redemption_radius` alapján dönt.

**Admin UI:**
- `src/pages/Settings.tsx` (vagy megfelelő) → új Switch komponens.
- `VenueFormModal.tsx` → új numerikus input a beváltási sugárhoz.
- `src/pages/Users.tsx` + `UserQuickViewModal.tsx` → mobil layout tömörítés, Sheet konverzió.

**Rork felé dokumentáció:**
- `docs/RORK_FREE_DRINKS_INTEGRATION.md` kiegészül:
  - Olvasd az `enforce_redemption_radius` platform_setting-et — ha `false`, ne végezz távolság-checket.
  - Olvasd a `venues.redemption_radius_m`-t — ha van, ezt használd a 100 m helyett.
  - Ha admin user van bejelentkezve (`is_admin=true`), küldj `skip_distance: true`-t.

---

## Sorrend

1. Migráció + platform_settings + venues.redemption_radius_m.
2. Admin UI: globális kapcsoló + helyszínenkénti radius mező.
3. Edge function frissítés + Rork dokumentáció.
4. Users lista + QuickView mobil tömörítés.

Az 1–3 lépés után **azonnal ki tudod kapcsolni a radius-t és felveheted a demo videót**, mielőtt a 4. lépés elkészül.
