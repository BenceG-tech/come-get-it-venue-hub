## Diagnózis

A backend rendben van:

- Az adminban beállított sorrend a `venues.display_order` oszlopban helyesen mentődik (10, 20, 30, 40, 50 …).
- A `get-public-venues` edge function `ORDER BY display_order ASC, created_at DESC` sorrendben adja vissza az adatokat, `Cache-Control: no-store` fejlécekkel.
- Élő tesztkérés az endpointra megerősíti: a Rork által kapott JSON már a helyes sorrendben érkezik (Romkocsma → Bar → Restaurant → Club → Bistro).

Tehát a probléma **nem** a mi oldalunkon van — a Rork app vagy:

1. **Kliens oldalon átrendezi** a listát (pl. ábécé szerint, távolság szerint, vagy saját "featured" logika alapján), **vagy**
2. **Cache-eli** a régi választ (React Query staleTime, AsyncStorage, stb.), **vagy**
3. **A `sort=distance` módot használja** default helyett — abban az esetben nem a `display_order`, hanem a felhasználó GPS-pozíciójától mért távolság határozza meg a sorrendet.

## Terv

Két apró változtatás a Lovable oldalon, hogy a Rork csapat egyértelműen tudja mit kell javítania, és hogy a szerver válasza öndokumentáló legyen.

### 1. `get-public-venues` — `display_order` mező explicit visszaadása + `sort_mode` visszajelzés
- A response objektumokban jelenleg `display_order` már benne van, de a Rork dev nyilván nem használja. Adjunk hozzá egy top-szintű logot és response header-t: `X-Sort-Mode: default|distance`, hogy a Rork oldalon Network fülben azonnal látszódjon melyik mód aktív.
- A JSON tömb minden elemében garantáljuk a `display_order` mezőt (már ott van, csak dokumentáljuk).

### 2. Dokumentáció frissítés — `docs/RORK_VENUE_LIST_API.md`
Új szekció **„Miért nem változik a sorrend a mobilban?"** címmel, ami tételesen felsorolja:
- A szerver a helyes sorrendben adja vissza az adatokat — **ne rendezze át kliens oldalon** (`.sort()`, `orderBy`, stb. tiltva a default módban).
- Ha `sort=distance` van használatban, természetesen a távolság dominál — az admin drag & drop **csak** default módban érvényesül.
- React Query / SWR használat esetén `staleTime: 0` vagy invalidálás javasolt a venues query-nél, hogy az admin változás azonnal látsszon.
- Curl példa: hogyan lehet a telefonról tesztelni, hogy a szerver mit ad vissza.

### 3. (Opcionális) Cache-busting query paraméter támogatás
A `get-public-venues` már küld `no-store` fejlécet, de a Rork oldali fetch layer (pl. Expo `fetch` + CDN) néha ignorálja. Adjunk hozzá egy `?v=<timestamp>` támogatást (nem kell semmit tennünk — a query param automatikusan bust-olja a cache-t), és dokumentáljuk mint javasolt gyakorlat.

## Amit a Rork csapatnak kell tennie (a dokumentációban leírva)

- Ellenőrizze, hogy a venue lista fetch URL-je **nem** tartalmaz `sort=distance` paramétert (vagy csak akkor, ha a user explicit "közeliek először" gombot nyom).
- Törölje a kliens oldali sort logikát a default listánál.
- Invalidálja / töltse újra a venues cache-t a képernyő minden fókuszba kerülésénél (`useFocusEffect` + `refetch`).

## Változtatandó fájlok

- `supabase/functions/get-public-venues/index.ts` — response header + log
- `docs/RORK_VENUE_LIST_API.md` — troubleshooting szekció

Migrációra, adatbázis-változtatásra nincs szükség.
