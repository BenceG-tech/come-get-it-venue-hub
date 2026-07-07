# Rejtett helyszínek javítása a Rork mobilappban

## A probléma

Az admin webappban rejtettként (`is_paused = true`) megjelölt helyszínek továbbra is megjelennek a Rork mobilappban.

## A backend állapota (2026-07-07)

A szerver oldal **helyesen működik**. Ellenőrzött viselkedés:

```bash
# 1) A publikus lista NEM tartalmazza a rejtett helyszíneket
curl 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues'
# → 7 helyszín, egyik rejtett sem szerepel

# 2) Egy rejtett helyszín ID-jára 404 jön
curl -i 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue?id=<rejtett-id>'
# → HTTP 404 { "error": "Venue not found" }

# 3) Aktív helyszín ID-jára 200 jön
curl -i 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue?id=<aktiv-id>'
# → HTTP 200 + a helyszín JSON-ja
```

Ha a Rork appban mégis megjelennek rejtett helyszínek (pl. Márkus Étterem, Bartl Janos, A KERT Bisztró, BuBu), akkor a probléma **kizárólag a Rork projekten belül** van.

## A 3 lehetséges ok a Rork oldalon

### 1. Cache

A Rork app (React Query / SWR / AsyncStorage / MMKV / Zustand persist) elmentette a régi listát és nem frissíti.

**Ellenőrzés:** Töröld az app adatait a telefonon (Beállítások → App → Storage → Clear data) vagy indíts fresh buildet, és nézd meg, hogy eltűnnek-e a rejtett helyek.

**Javítás React Query esetén:**
```ts
useQuery({
  queryKey: ['public-venues'],
  queryFn: fetchVenues,
  staleTime: 60_000,       // max 1 perc friss
  gcTime: 5 * 60_000,      // 5 perc után dobja
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
})
```

**Javítás AsyncStorage esetén:** app indulásakor `AsyncStorage.removeItem('venues-cache')` vagy verziózd a kulcsot (`venues-cache-v2`).

### 2. Rossz endpoint

A Rork nem a `get-public-venues` edge funkciót hívja, hanem közvetlenül a `venues` táblát a Supabase kliensen keresztül (`supabase.from('venues').select(...)`).

Az `anon` szerep **már nem tudja olvasni** közvetlenül a `venues` táblát (biztonsági megkeményítés), tehát ez most üres tömböt adna vissza. Ha a Rork mégis mutat helyszíneket ilyen módon, az nem lehet más, csak **cache vagy mock adat** (lásd 1. és 3. pont).

**A helyes hívás:**
```ts
const res = await fetch('https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues')
const venues = await res.json()
```

Egy helyszín részleteire:
```ts
const res = await fetch(`https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue?id=${venueId}`)
if (res.status === 404) {
  // A helyszín rejtett vagy nem létezik → NAVIGÁLJ VISSZA / mutass hibaüzenetet
  return
}
const venue = await res.json()
```

### 3. Beégetett mock / seed adat

Nézd meg a Rork projekt fájljait, keresd ezekre:
- `mockVenues`, `SAMPLE_VENUES`, `DEMO_VENUES`, `initialVenues`
- `venues.json`, `seed.ts`, `constants/venues.ts`
- `Márkus`, `Bartl`, `BuBu` string-ek a forráskódban

Ha ilyet találsz, **töröld** vagy csak fejlesztői módban használd (`__DEV__` guard).

## Szerver oldali megerősítés

Az edge funkciókhoz hozzáadtuk a `Cache-Control: no-store` headert, hogy semmilyen köztes CDN vagy proxy ne őrizhesse meg a régi választ. Így ha a Rork app friss hívást indít, garantáltan friss adatot kap.

## Debug checklist a Rork csapatnak

- [ ] Fresh install után is látszanak a rejtett helyek? → mock/seed adat a bundle-ben
- [ ] Csak régi installon látszanak, friss installon nem? → cache probléma
- [ ] A Network tab-en látszik a `get-public-venues` hívás? → mit ad vissza?
- [ ] A `get-public-venues` válaszban benne van a rejtett helyszín ID-ja? → szólj (backend bug)
- [ ] A válaszban NINCS benne, de az UI-ben mégis megjelenik? → cache vagy state-management bug a Rork oldalon

## Kapcsolódó dokumentumok
- [Venue List API](./RORK_VENUE_LIST_API.md)
- [REST Endpoints](./REST_ENDPOINTS.md)
