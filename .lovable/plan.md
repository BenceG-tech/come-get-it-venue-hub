## Mit tudunk most

Ellenőriztem az adatbázist és az API-t:

- **Adatbázis állapot** (a `venues` táblában `is_paused=true`, tehát rejtettként jelölt):
  - Márkus Étterem — rejtett ✅
  - Bartl Janos — rejtett ✅
  - A KERT Bisztró — rejtett ✅
  - BuBu — rejtett ✅
- **Nem rejtett** (is_paused=false, tehát HELYESEN látszaniuk kell):
  - Vinozza, Kiscsibe Reggeliző & Étterem, valamint az 5 Come Get It demo hely

- **Az admin `get-public-venues` edge funkció helyesen szűr**: manuálisan lekérdezve csak 7 helyszínt ad vissza, a 4 rejtett közül **egyet sem**. Tehát a backend oldalról a rejtés működik.

- **RLS**: az `anon` szerep közvetlenül nem tudja olvasni a `venues` táblát (a korábbi biztonsági javítás óta), tehát csak edge funkción keresztül jöhet adat.

## Mi a probléma valószínű oka

Mivel a szerver oldali API tisztán szűr, ha a Rork mobilappban mégis megjelennek a rejtett helyszínek, annak három oka lehet — mind a **Rork projekten belül** (nem itt a Lovable admin webappban):

1. **Cache** — a Rork app lokálisan (AsyncStorage / React Query cache / SWR) elmentette a régi listát, és nem frissíti.
2. **Rossz endpoint** — a Rork nem a `get-public-venues` edge funkciót hívja, hanem közvetlenül a `venues` táblát próbálja olvasni (ez most már 0 sort ad `anon`-nal, tehát ha valamit mégis mutat, akkor mock/seed adat).
3. **Mock / seed adat a Rork projektben** — a Rork buildbe be van égetve egy statikus lista helyszínekről, ami felülírja vagy kiegészíti az API választ.

## Terv (mit fogok tenni build módban)

### 1. Diagnosztikai lépések (te végzed a Rork oldalon, én segítek)
Kérlek nézd meg a Rork projektben:
- Melyik URL-t hívja a helyszín-lista? Kell hogy legyen: `https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues`
- Van-e valahol beégetett `venues` konstans / mock lista / seed fájl?
- Van-e cache réteg (React Query `staleTime`, AsyncStorage)?

### 2. Backend oldali megerősítés (itt a Lovable admin webappban)
Ahhoz hogy a Rork biztosan ne tudjon rejtett helyet mutatni még akkor sem, ha rossz kódot futtat:

- **`get-public-venue` (egy helyszín) endpoint** — már most szűr `is_paused=false`-ra, ellenőrzöm, hogy 404-et ad ha rejtett ID-t kérnek.
- **Response cache-elés kizárása** — hozzáadok `Cache-Control: no-store` headert a `get-public-venues` és `get-public-venue` válaszokhoz, hogy semmilyen CDN/proxy ne őrizze meg a régi listát.
- **Élő teszt**: a te 4 rejtett helyszíned ID-jával hívom az API-t és megmutatom neked a nyers választ bizonyítékként.

### 3. Frissítési útmutató a Rork felé
Elkészítek egy rövid magyar nyelvű dokumentumot (`docs/RORK_HIDDEN_VENUES_FIX.md`), ami leírja:
- A `is_paused=true` szemantikát (helyszín rejtett → nem szabad megjeleníteni)
- A helyes endpointot
- Cache invalidálási példát (React Query / AsyncStorage törlés induláskor)
- Debug curl parancsokat a Rork csapat számára

## Amit NEM csinálok
- Nem nyúlok a Rork mobilapp forráskódjához (nincs itt a Lovable projektben).
- Nem módosítom a `venues` tábla sémáját vagy RLS-t — az helyes.
- Nem törlöm és nem inaktiválom újra az érintett helyszíneket az adatbázisban — az állapotuk már helyes.

## Technikai részletek

Módosítandó fájlok:
- `supabase/functions/get-public-venues/index.ts` — `Cache-Control: no-store` header
- `supabase/functions/get-public-venue/index.ts` — `Cache-Control: no-store` header + biztos 404 rejtett helyszínre
- `docs/RORK_HIDDEN_VENUES_FIX.md` — új fájl a Rork csapatnak
