

# FreeDrinkManager Component - Implementációs Terv

## Összefoglaló

Létrehozunk egy új `FreeDrinkManager` komponenst, amely a venue owner-ek számára biztosítja a napi Welcome Drink kiválasztását, időablak beállítását és cap (limit) kezelését. A komponens egy önálló, dashboard-ba integrálható widget lesz, amely a VenueFormModal "Italok" tabjának egyszerűsített, gyors kezelői változata.

## Komponens Funkciók

### 1. Aktív Welcome Drink Kiválasztás
- Megjelenítés: aktuális aktív ital neve, képe, kategóriája
- Dropdown a `venue_drinks` tábla alapján (is_free_drink = true)
- Gyors váltás a már beállított ingyenes italok között

### 2. Időablak Kezelés
- Aktív időablakok megjelenítése
- Mai státusz: van-e aktív ablak most, mikor kezdődik/végződik
- Szerkesztés: napok (H-V checkbox), start/end time
- "Következő akció" előnézet

### 3. Cap (Limit) Beállítások
- Napi limit szám megjelenítése és módosítása
- Óránkénti limit (opcionális)
- Per-user napi limit
- Kihasználtság progress bar (mai beváltások / napi cap)
- "onExhaust" viselkedés: zárás / alternatív ajánlat mutatása

### 4. Valós Idejű Státusz
- Mai beváltások száma (redemptions táblából)
- Cap kihasználtság (%) 
- Aktív/Inaktív státusz badge

## Technikai Megvalósítás

### Fájlok

| Fájl | Típus | Leírás |
|------|-------|--------|
| `src/components/venue/FreeDrinkManager.tsx` | ÚJ | Fő komponens |
| `src/components/dashboard/OwnerDashboard.tsx` | MÓDOSÍT | Widget integráció |
| `supabase/functions/get-venue-free-drink-stats/index.ts` | ÚJ | Valós idejű statisztikák |

### Komponens Struktúra

```text
FreeDrinkManager
├── Header
│   ├── Cím + Tooltip
│   └── Aktív/Inaktív Badge
├── Aktív Ital Szekció
│   ├── Ital Kártya (kép, név, kategória)
│   └── Ital Váltó Dropdown
├── Időablak Szekció
│   ├── Mai Státusz (aktív ablak)
│   ├── Időablak Lista
│   └── "Szerkesztés" Modal/Drawer
├── Cap Beállítások Szekció
│   ├── CapProgressBar
│   ├── Limit Beállító Input
│   └── OnExhaust Selector
└── Gyors Akciók
    ├── "Mentés" gomb
    └── Link a teljes szerkesztéshez
```

### API / Adatlekérdezés

A komponens a következő adatokat kérdezi le:

1. **Venue adatok** (drinks, freeDrinkWindows, caps)
2. **Mai beváltások száma** - új edge function vagy meglévő bővítése
3. **Aktív státusz** - calculateból (isWindowActive)

### Props Interface

```typescript
interface FreeDrinkManagerProps {
  venueId: string;
  onUpdate?: (updates: Partial<Venue>) => Promise<void>;
  compact?: boolean; // Dashboard widget vs full page mode
}
```

### State Management

- React Query cache: `['venue-free-drink-config', venueId]`
- Lokális form state a szerkesztéshez
- Optimistic updates a cap módosításhoz

## UI/UX Design

### Desktop Layout (Widget)

```text
┌────────────────────────────────────────────────────────────────┐
│  🍺 NAPI ITAL BEÁLLÍTÁS                    [Aktív ⚫️]        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [IMG] Peroni Nastro Azzurro              [Váltás ▼]     │ │
│  │       Kategória: beer                                    │ │
│  │       Időablak: 14:00 - 18:00 (H-P)                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Napi kapacitás                          [Elérhető ✓]    │ │
│  │ [███████████████░░░░░░░░] 67%                           │ │
│  │ 67 / 100 beváltás                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ Napi limit │ │ Per-user   │ │ Ha elfogy  │               │
│  │    100     │ │     1      │ │  Zárás     │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│                                                                │
│  [Időablak szerkesztése]              [Mentés]               │
└────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

- Collapsible card design
- Bottom sheet for editing time windows
- Touch-friendly day selector

### Branding

- Primary: `#0d7377` (Teal Blue)
- Dark Navy: `#1a1a2e`
- Typography: Inter (body), system fonts for numbers
- CSS Classes: `cgi-card`, `cgi-input`, `cgi-button-primary`

## Edge Function: get-venue-free-drink-stats

### Request

```typescript
{
  venue_id: string;
}
```

### Response

```typescript
{
  today_redemptions: number;
  cap_usage_pct: number;
  active_free_drinks: Array<{
    id: string;
    name: string;
    image_url?: string;
    category?: string;
    windows: FreeDrinkWindow[];
  }>;
  current_active_window: FreeDrinkWindow | null;
  next_window: FreeDrinkWindow | null;
  caps: RedemptionCap;
  is_active_now: boolean;
}
```

## Implementációs Lépések

### 1. Edge Function létrehozása (30 perc)
- `get-venue-free-drink-stats` endpoint
- Mai redemption count lekérdezés
- Aktív státusz kalkuláció

### 2. FreeDrinkManager komponens (2-3 óra)
- Alap layout és styling
- Venue adatok lekérdezése
- Aktív ital megjelenítés
- CapProgressBar integráció
- Időablak megjelenítés

### 3. Szerkesztő Modal (1-2 óra)
- Cap beállítások form
- Időablak szerkesztő (újrafelhasználva EnhancedDrinkSelector logikáját)
- Ital váltó dropdown

### 4. OwnerDashboard integráció (30 perc)
- Widget hozzáadása a "Venue Menedzsment" szekcióhoz
- Responsive layout

### 5. Tesztelés és finomhangolás (1 óra)
- Mobile responsive ellenőrzés
- Loading/error states
- Edge case-ek kezelése

## Függőségek

### Meglévő Komponensek (Újrafelhasználás)
- `CapProgressBar` - kapacitás vizualizáció
- `TimeRangeInput` - idő szerkesztés
- `ScheduleGrid` / `ScheduleGridMobile` - időablak vizualizáció
- `Select`, `Input`, `Button`, `Card` - shadcn/ui

### Meglévő Típusok
- `Venue`, `VenueDrink`, `FreeDrinkWindow`, `RedemptionCap`
- `CapUsage`, `ActiveFreeDrinkStatus`

### Meglévő Business Logic
- `isWindowActive()` - ablak aktivitás
- `getActiveFreeDrinkStatus()` - aktuális státusz
- `calculateCapUsage()` - kihasználtság
- `getNextActiveWindow()` - következő ablak

## Összesen Becsült Idő: ~5-6 óra

