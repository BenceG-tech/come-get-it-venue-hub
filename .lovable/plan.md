## Mit fogok csinálni

### 1. Képek drag & drop sorrendezés
- **DB migráció**: új `sort_order INTEGER` oszlop a `venue_images` táblához (default 0, indexelve).
- **Backend (`supabaseProvider.ts`)**:
  - `fetchVenueImages` → `ORDER BY sort_order ASC, created_at ASC`
  - `replaceVenueImages` → mentésnél a tömb indexét írja a `sort_order`-be
- **Form UI (`VenueFormModal.tsx`, Képek tab)**:
  - `@dnd-kit/core` + `@dnd-kit/sortable` használatával minden képkártyához fogantyú (grip ikon)
  - Húzással átrendezhető sorrend, mentéskor új sorrend perzisztálódik
- **Galéria (`VenueImageGallery.tsx`)**: a sorrendet a backendből kapja, nincs külön rendezés szükséges

### 2. „A3" kép miért nem jelenik meg
A DB-ben 6 kép van ennél a helyszínnél, de **3 sornak üres az URL-je** (a felhasználó valószínűleg „Kép hozzáadása" gombbal létrehozta a kártyát, de soha nem töltötte fel a fájlt és nem mentette le az URL-t). A galéria thumbnail sorban ezért jelennek meg az ajándék-doboz placeholder ikonok.

**Megoldás**:
- A galéria és a form **szűrje ki az üres URL-ű képeket** (`images.filter(i => i.url?.trim())`)
- A modal mentési logikája is dobja el az üres URL-ű kártyákat (ne mentsen üres sort a DB-be)
- Egyszeri DB takarítás: az üres sorok törlése a `venue_images` táblából

### 3. Ár-kategória ($) ikonok
A `price_tier` mező már létezik a `venues` táblán (1–4 közötti érték). Csak megjelenítés és szerkesztés kell:
- **Új komponens** `PriceTierBadge.tsx`: 4 dollár-ikon, az aktívak teltek (`text-cgi-primary`), a többi halvány (`text-cgi-muted`). Példa: `$$$ $`
- **Megjelenítés**:
  - `VenueDetail.tsx` header (név alatt, a tagek mellett)
  - `Venues.tsx` lista/kártya nézet (cím mellé)
  - `PublicVenueCard.tsx` és `PublicVenueListItem.tsx` (publikus oldal)
- **Szerkesztés**: `VenueFormModal.tsx` → „Alapok" tab végére kattintható 1–4 csillag-szerű választó (Nincs / $ / $$ / $$$ / $$$$)

## Technikai részletek

- **Új csomag**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (Drag-and-Drop, akadálymentes, jól bevált React-ben)
- **Migráció**:
  ```sql
  ALTER TABLE venue_images ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX idx_venue_images_sort ON venue_images(venue_id, sort_order);
  -- Üres URL-ű képek takarítása:
  DELETE FROM venue_images WHERE url IS NULL OR trim(url) = '';
  ```
- **`PriceTierBadge` props**: `tier?: number` (1–4), `size?: 'sm' | 'md'` — visszafelé kompatibilis (ha `null`/`undefined`, nem renderel semmit)
- **TypeScript**: `VenueImage` típus kap egy opcionális `sortOrder?: number` mezőt
- **Nincs változás**: a Rork mobil app oldalon, mert a `price_tier` és a képek API-ja nem törik (csak új mező + sorrend)

## Érintett fájlok
- `supabase/migrations/...` (új)
- `src/lib/dataProvider/supabaseProvider.ts`
- `src/lib/types.ts`
- `src/components/VenueFormModal.tsx`
- `src/components/VenueImageGallery.tsx`
- `src/components/PriceTierBadge.tsx` (új)
- `src/pages/VenueDetail.tsx`
- `src/pages/Venues.tsx`
- `src/components/PublicVenueCard.tsx`, `PublicVenueListItem.tsx`
- `package.json` (dnd-kit)
