# Helyszínek manuális sorrendezése (drag & drop)

## Cél
Az admin `Helyszínek` oldalon a `cgi_admin` húzással beállíthatja a venue-k sorrendjét. Ez a sorrend minden megjelenésnél (admin lista + nyilvános/consumer lista) felülírja a jelenlegi `created_at desc` és távolság-alapú rendezést.

## Mit építünk

### 1. Adatbázis
- Új oszlop: `venues.display_order INTEGER NOT NULL DEFAULT 0`
- Index: `idx_venues_display_order ON venues(display_order ASC, created_at DESC)`
- Backfill: meglévő venue-k `display_order` = sor szám `created_at desc` szerint (10, 20, 30… — 10-es lépésekkel, hogy könnyű legyen később beszúrni).
- RLS: meglévő `cgi_admin` update policy elég, nem kell új.

### 2. Admin Venues oldal (`src/pages/Venues.tsx`)
- `orderBy: 'display_order', orderDir: 'asc'` (másodlagos: `created_at desc`).
- Új "Sorrend szerkesztése" toggle gomb a fejlécben. Aktiváláskor:
  - Drag handle (≡ ikon) jelenik meg minden kártya/sor bal oldalán.
  - `@dnd-kit/core` + `@dnd-kit/sortable` (már bevett React DnD lib) használata grid és table view-ban is.
  - Drop után optimistic update a UI-ban, majd új edge function hívás vagy közvetlen Supabase update batch: az érintett venue-knek új `display_order` érték (10-es lépésekben újraszámolva).
- Mobile view (cards): hosszú nyomás + drag handle ikon szintén.

### 3. Edge function: `reorder-venues`
- Input: `{ ordered_ids: string[] }`
- Auth: csak `cgi_admin` (is_admin = true).
- Logika: tranzakcióban a megadott sorrend alapján `display_order` = (index+1) * 10 update-elése.
- Audit log bejegyzés (`audit_logs`).

### 4. Nyilvános venue lista
- `supabase/functions/get-public-venues/index.ts`: rendezés `display_order asc, created_at desc` szerint (jelenleg csak `created_at desc`).
- A `distance` mezőt továbbra is visszaadjuk (info célból), de NEM rendezünk rá. Ha a kliens (Rork app) jelenleg távolság szerint utólag rendez, az is felülírható egy `respect_admin_order: true` flag-gel — alapból a server-rendezett sorrendet kell követni.
- `src/hooks/usePublicVenues.ts` és admin getList: ugyanaz a rendezés.

### 5. UX részletek
- Toggle ki/be a "Sorrend szerkesztése" módnál — szerkesztés módban a kártya kattintás (navigálás a detail oldalra) ki van kapcsolva, csak a húzás működik.
- Toast visszajelzés sikeres mentés után ("Sorrend frissítve").
- Keresés/szűrés alatt a drag mód letiltva (mert csak részhalmazt látsz — félrevezető lenne).

## Technikai bontás

```text
1. supabase--migration   → display_order column + backfill + index
2. supabase/functions/reorder-venues/index.ts  (új)
3. src/pages/Venues.tsx  → DnD wrapper, edit toggle, drag handles
4. src/hooks/usePublicVenues.ts  → orderBy display_order
5. supabase/functions/get-public-venues/index.ts  → order display_order asc
6. src/lib/dataProvider/supabaseProvider.ts  → getList default order for venues
```

## Kérdés
- A consumer (mobile Rork) app jelenleg a `distance` mezőt használja kliens-oldali rendezéshez. Az admin sorrend felülírása csak a server response sorrendjén keresztül történik — a kliensben (Rork) is le kell tiltani a távolság szerinti utólagos rendezést? **Ha igen, az külön Rork PR lesz, csak jelzem.** Jelenleg csak a web/admin + a `get-public-venues` server-side sorrendet rendezem át, és a Rork csapatnak szólunk, hogy ne sortolja át.
