
## Cél
A `VenueFormModal` (jelenleg 7 tab, 866 sor, sok szétszórt mező, nagy egysoros képkártyák) átalakítása letisztult, kompakt és gyorsan átlátható szerkesztővé.

## Mit változtatunk

### 1. Tabok újracsoportosítása (7 → 4)
A jelenlegi 7 tab sok és redundáns. Átcsoportosítás logikus blokkokra:

| Új tab | Mit tartalmaz |
|---|---|
| **Általános** | Név, csomag, leírás, árkategória, tag-ek, szüneteltetés, telefon, weboldal |
| **Helyszín & Nyitvatartás** | Cím + térkép, GPS koordináták (összecsukható), nyitvatartás |
| **Italok & Akciók** | Italok és ingyenes ital időablakok, limitek (caps) – egy helyen |
| **Képek** | Kompakt galéria nézet |
| **Integráció** | (Marad külön, technikai) |

Így az általános napi szerkesztés (név, leírás, kép) 1-2 tabbal megoldható, a haladó beállítások (integráció) elkülönítve.

### 2. Képek tab – kompakt grid + lightbox preview
Jelenleg minden kép egy nagy függőleges kártya. Helyette:

```text
┌──────────────────────────────────────────────────┐
│ [+ Kép feltöltése]  [+ URL hozzáadása]           │
├──────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                     │
│ │IMG │ │IMG │ │IMG │ │IMG │  ← 4–5 oszlopos     │
│ │⭐ ⋮│ │  ⋮│ │  ⋮│ │  ⋮│     square thumbnail │
│ └────┘ └────┘ └────┘ └────┘                     │
└──────────────────────────────────────────────────┘
```

- **Square thumbnail grid** (Tailwind `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`, `aspect-square`).
- Minden thumbnail-en hover-overlay: csillag (főkép), szemetes (törlés), grip ikon (drag), nagyítás (preview).
- **Drag & drop megmarad** (`@dnd-kit` már be van kötve), de a `verticalListSortingStrategy` helyett `rectSortingStrategy`-re cseréljük, hogy gridben is működjön.
- **Címke / URL / Cover** szerkesztés egy „kis ceruza" gombbal nyíló popoverben vagy a thumbnail alatti collapsible mezőkben – nem mindig láthatóan.
- **Kép preview**: thumbnail-re kattintva lightbox dialog teljes méretben.
- **Üres URL-ek vizuális jelzése**: szürke placeholder + figyelmeztető badge ("Nincs feltöltve").

### 3. Sticky fejléc + footer a modálban
- Fejléc (cím + tab sor) és footer (Mégse / Mentés gomb) **sticky**, középen csak a content scrollozik.
- Mentés gombon a változtatások számának jelzése (pl. „Mentés (3 módosítás)") opcionális.
- Mobil/Sheet variánsban a footer az alján rögzítve.

### 4. Általános tab tömörítése
- Név + Csomag + Árkategória egy sorban (3 oszlop desktop).
- Telefon + Weboldal egy sorba húzva.
- Tag-ek és Szüneteltetés alulra kompaktan.
- Leírás `Textarea` rows=2 alapból, auto-grow.

### 5. Helyszín tab – térkép nagyobb, GPS rejtve
- A cím alatt nagyobb térkép preview.
- GPS koordináták egy „Speciális" `<Collapsible>` alatt, hogy ne foglaljon helyet.

### 6. Apró kényelmi finomítások
- Minden tab tetején rövid, halvány segéd-szöveg (1 sor), hogy a felhasználó tudja, mit tehet ott.
- Nem mentett változások jelzése a footer mellett (`* Nem mentett változások`).
- A „Bezárás megerősítés" felugró kérdés, ha vannak nem mentett módosítások.

## Mit NEM változtatunk
- Üzleti logika, mentés flow, adat-szerkezet, backend, API hívások – minden marad.
- A `VenueDetail` oldal (a szerkesztőt megnyitó oldal) változatlan.
- Az italok / ingyenes italok belső szerkesztője (`EnhancedDrinkSelector`) változatlan, csak új tab alá kerül.

## Érintett fájlok
- `src/components/VenueFormModal.tsx` – tab-újraszervezés, sticky layout, általános/helyszín tömörítés
- `src/components/VenueFormModal.tsx` – `SortableImageCard` átírása grid-thumbnail komponensre (új altárgyú komponens vagy refaktor)
- (Új) `src/components/VenueImageThumbnail.tsx` – kompakt thumb + hover actions + lightbox
- Esetleg `src/components/ui/dialog.tsx` használat lightbox-hoz (már van)

## Technikai részletek
- `@dnd-kit/sortable` strategy: `verticalListSortingStrategy` → `rectSortingStrategy`.
- Lightbox: `Dialog` + `<img>` `max-h-[80vh] object-contain`.
- Sticky: `sticky top-0 z-10 bg-cgi-surface` a fejlécen, `sticky bottom-0` a footeren, `max-h-[85vh] overflow-y-auto` a középső konténeren.
- Nem mentett változások: `JSON.stringify(formData) !== JSON.stringify(initial)` referencia összehasonlítással.

## Eredmény
- 7 → 4 tab, kevesebb scrollozás.
- Képgaléria 1 oszlop helyett 4–5 oszlopos grid → ~5× több kép látszik egy képernyőn.
- Lightbox preview → ténylegesen lehet látni a képet feltöltés nélkül is.
- Sticky mentés gomb → nem kell végigscrollozni a mentéshez.
