# Cél

Ne kelljen kézzel koordinátát beírni. A cím alapján a rendszer töltse ki automatikusan.

# Mit csinálunk

## 1) Új gomb a helyszín szerkesztő űrlapban
- **"Koordináták frissítése a címből"** gomb a Cím mező mellett
- Kattintásra meghívja a meglévő `geocode-address` edge function-t (Mapbox)
- A visszakapott lat/lng bekerül a `coordinates` JSONB-be
- Sikeres frissítés után zöld visszajelzés + a térkép azonnal ráugrik az új pontra

## 2) Automatikus javítás mentéskor
- A meglévő logika már megcsinálja, ha `lat=0, lng=0` → most kiterjesztjük:
  - ha a koordináta **Budapest bounding boxon kívül esik** (lat < 47.3 vagy > 47.7, lng < 18.8 vagy > 19.4) **ÉS** a cím Budapestet tartalmaz → auto re-geocode mentéskor
  - ha a koordináta 0/0 vagy null → auto re-geocode (már van)

## 3) Kézi lat/lng mezők háttérbe tolása
- A két számmező (Szélesség / Hosszúság) egy összecsukható **"Haladó: kézi koordináta felülírás"** szekcióba kerül
- Alapból csukva — normál használatnál láthatatlan
- Így a felület azt sugallja: elég a címet megadni

## 4) Egyszeri "javítsd meg a rossz koordinátákat" akció (opcionális)
- A Helyszínek lista tetején egy **"Rossz koordináták javítása"** gomb (csak cgi_admin)
- Végigmegy az összes venue-n, ahol `coordinates` = 0/0 vagy null vagy Budapesten kívüli, és a cím alapján újra geokódolja
- Progress toast: "12/45 helyszín javítva"
- Nem kell manuális szerkesztés helyszínenként

# Nem változik

- Mobil app: továbbra is a `coordinates` JSONB-t olvassa, semmi kliens oldali változás
- DB séma: nincs új oszlop, nincs migráció
- `geocode-address` edge function: már létezik, változatlan

# Érintett fájlok

- `src/components/VenueFormModal.tsx` — új gomb, összecsukható haladó szekció, kiterjesztett auto-geocode feltétel
- `src/pages/Venues.tsx` (vagy a helyszín lista oldal) — "Rossz koordináták javítása" tömeges gomb

# Kérdés mielőtt implementálom

Kell a **4. pont** (tömeges javítás gomb az összes rossz koordinátára egyszerre), vagy elég most csak a szerkesztő űrlapba tenni a "Frissítés címből" gombot, és venue-nként egyesével megnyitod/mented?
