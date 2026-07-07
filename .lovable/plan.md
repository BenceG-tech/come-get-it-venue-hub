
## Áttekintés

Három funkció:
1. **Több kép egyszerre feltöltése** a helyszín szerkesztőben (Képek tab).
2. **Sorrend állítása** — már létezik a `/venues` adminban (drag-and-drop, `display_order`), de a mobilappnak biztos oda kell adnia a beállított sorrendet.
3. **Távolság szerinti rendezés** — kapcsolható opció, ami a felhasználó GPS pozíciója alapján a legközelebbi helyszíneket dobja először.

---

## 1. Több kép egyszerre feltöltése

**Fájlok:**
- `src/components/ImageUploadInput.tsx` — hozzáadok `multiple` prop-ot, párhuzamos feltöltéssel és `onUploaded` callback-et minden sikeres képre hívja.
- `src/components/VenueFormModal.tsx` — a Képek tabon lévő "Kép feltöltése" gombot `multiple`-re állítom, hogy egyszerre több fájl kijelölhető legyen; minden feltöltött kép `addImageWithUrl(url)`-lal automatikusan bekerül a galériába. Progress toast: "3/5 kép feltöltve...".

Meglévő drag-and-drop sorrend, cover kép választás és törlés változatlan.

## 2. Sorrend a mobilappban

Az admin oldali `display_order` alapú rendezés már működik (`/venues` drag-and-drop). Ellenőrzés:
- `get-public-venues` edge function **már** `.order('display_order', asc)`-t használ → mobilapp automatikusan a beállított sorrendet kapja.
- `get_public_venues` DB függvény szintén `display_order` szerint rendez.

Nincs itt teendő azon kívül, hogy a mobilapp fejlesztőinek jelezzük: ha a `?sort=custom` (alapértelmezett), a Rork app a `display_order`-t tiszteletben tartja.

## 3. Távolság szerinti rendezés (opcionális)

**Backend — `supabase/functions/get-public-venues/index.ts`:**
Új query paraméterek:
- `sort=distance|default` (default: `default`)
- `lat`, `lng` (felhasználó pozíciója, ha `sort=distance`)

Ha `sort=distance` és van `lat`/`lng`:
- Kiszámoljuk minden helyszínre a Haversine távolságot a `coordinates` alapján.
- Rendezés: `distance` növekvő; koordináta nélküli helyszínek a végére.
- A visszaadott `distance_km` mezőt minden helyszínre elhelyezzük.

Nincs adatbázis migráció — a `coordinates` JSONB már megvan.

**Rork mobilapp integráció (dokumentum frissítés):**
`docs/RORK_VENUE_LIST_API.md` — hozzáadok egy szekciót:
```
GET /get-public-venues?sort=distance&lat=47.5&lng=19.05
```
A Rork oldalon egy kapcsoló ("Rendezés távolság szerint") a `useCurrentLocation` hookkal kikéri a GPS-t és így hívja az endpointot. Ha a kapcsoló ki van, a `display_order` (admin által beállított sorrend) érvényesül.

Ezt a kapcsolót **nem** ebben a projektben (admin) valósítom meg — a mobilapp UI a Rork repóban van; a backend viszont készen áll rá.

---

## Összefoglaló változtatások

| Fájl | Változás |
|---|---|
| `src/components/ImageUploadInput.tsx` | `multiple` prop + több fájl párhuzamos feltöltés |
| `src/components/VenueFormModal.tsx` | Képek tab: multi-upload engedélyezése |
| `supabase/functions/get-public-venues/index.ts` | `sort=distance&lat=&lng=` támogatás Haversine távolsággal |
| `docs/RORK_VENUE_LIST_API.md` | Új `sort=distance` szekció + Rork oldali példakód |

Migráció nincs. RLS változás nincs.
