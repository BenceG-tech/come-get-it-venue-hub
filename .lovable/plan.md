
# Terv: Felhasználók UX Fejlesztés + Adat Exportálás

## Azonosított Problémák

A UserDetail oldal és kapcsolódó komponensek áttekintése után a következő fejlesztési lehetőségeket azonosítottam:

### 1. Érthetőségi problémák
- **Engagement Score**: Mit jelent pontosan? 0-100 skála de nincs magyarázat
- **LTV (Élettartam Érték)**: Hogyan számítódik? 
- **Viselkedési minták**: Badge-ek vannak, de nincs kontextus
- **ROI**: Mit jelent a "Return on Investment" ebben a kontextusban?

### 2. "1 free drink / nap / helyszín" szabály nem látható
- A rendszerben van `per_user_daily` limit a `caps` táblában
- DE ez nincs vizualizálva a felhasználó profiljában
- Nem látszik, hogy "ma már váltott itt ingyen italt" vagy "még nem váltott"

### 3. Hiányzó Export funkciók
- Users oldalon nincs export gomb
- UserDetail oldalon nincs export
- Redemptions oldalon nincs export
- Analytics adatok nem exportálhatók

### 4. Navigációs és kontextus hiányok
- Beváltásoknál nincs kattintható venue link
- Pontok tabon nincs venue kapcsolat

---

## Megoldási Terv

### 1. RÉSZ: "Szabályok" Info Panel

Új panel a UserDetail oldalon, ami elmagyarázza a rendszer működését:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ℹ️ RENDSZER SZABÁLYOK                                          [Bezárás ✕] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🍺 INGYEN ITAL SZABÁLYOK:                                                  │
│  • Egy felhasználó naponta 1 ingyen italt válthat be helyszínenként        │
│  • Az ingyen ital csak az aktív időablakokban érhető el                    │
│  • 5 perc várakozás szükséges két token kérés között                       │
│                                                                             │
│  📊 METRIKÁK MAGYARÁZATA:                                                   │
│  • Engagement Score: Aktivitási szint 0-100 (beváltások + app használat)   │
│  • LTV: Becsült élettartam érték (eddigi + várható költés)                 │
│  • ROI: Megtérülés = Tényleges költés / Ingyen italok értéke               │
│  • Churn Risk: Lemorzsolódási kockázat az inaktivitás alapján              │
│                                                                             │
│  🏆 LOJALITÁS MÉRFÖLDKÖVEK:                                                 │
│  • Heti VIP: 5+ látogatás / hét ugyanazon helyszínen                       │
│  • Havi VIP: 10+ látogatás / hónap ugyanazon helyszínen                    │
│  • Platina: 50+ összesített látogatás egy helyszínen                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. RÉSZ: "Mai állapot" kártya (per helyszín)

A UserDetail Helyszínek tabján minden venue mellett látható:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🥇 Vinozza                                                      23 beváltás │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 MAI ÁLLAPOT:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ Ma már beváltott: 14:32-kor (Peroni)                            │   │
│  │  ❌ Következő lehetőség: holnap                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  VAGY ha még nem váltott:                                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⏳ Ma még nem váltott be ingyen italt                              │   │
│  │  🕐 Következő ablak: 16:00 - 18:00                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. RÉSZ: CSV/Excel Export Funkciók

#### 3.1 Users Lista Export
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  FELHASZNÁLÓK                                    [🔍 Keresés] [📥 Export ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
                                                            │
                                                   ┌────────┴────────┐
                                                   │ 📊 CSV Export   │
                                                   │ 📑 Excel Export │
                                                   │ 📋 Csak kijelölt│
                                                   └─────────────────┘
```

Export tartalom:
- Név, Email, Telefon
- Regisztráció dátuma
- Pont egyenleg, Lifetime pontok
- Összes beváltás
- Státusz (aktív/inaktív)
- Utolsó aktivitás

#### 3.2 UserDetail Export
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Vissza     Kiss Péter                             [📥 Export] [⚙️]      │
├─────────────────────────────────────────────────────────────────────────────┤
                                          │
                                 ┌────────┴────────────────┐
                                 │ 📊 Teljes profil (CSV)  │
                                 │ 🍺 Csak beváltások      │
                                 │ 📊 Csak pontok          │
                                 │ 📈 Analitikai adatok    │
                                 └─────────────────────────┘
```

#### 3.3 Redemptions Export
A meglévő Redemptions oldal export gomb hozzáadása.

### 4. RÉSZ: Tooltipek Kiegészítése

| Komponens | Hely | Hiányzó Tooltip |
|-----------|------|-----------------|
| UserScorecard | Engagement Score | ✅ Már van |
| UserScorecard | LTV | Képlet hozzáadása |
| UserRevenueImpact | ROI | Mit jelent, hogyan számítjuk |
| UserPointsFlow | Források | Mi az egyes típusok jelentése |
| UserVenueAffinity | "Beváltás" szám | Ez a free drink beváltások száma |
| BehaviorPatternBadges | Klaszter | Mi az a klaszter, miért fontos |

### 5. RÉSZ: Beváltások tab javítása

A jelenlegi beváltások tab a UserDetail-on eléggé egyszerű. Bővítések:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🍺 Ingyen italok (12)                                      [📥 Export]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 🍻 Peroni                              📍 Vinozza →               │    │
│  │ 2024.01.15 14:32                       1.500 Ft                    │    │
│  │                                                                     │    │
│  │ 📊 KONTEXTUS:                                                       │    │
│  │ [3. ezen a héten] [8. ebben a hónapban] [45. összesen]             │    │
│  │                                                                     │    │
│  │ 💳 KAPCSOLÓDÓ KÖLTÉS: 8.500 Ft (ROI: 5.7x)                         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6. RÉSZ: Összefoglaló Dashboard Kártya

Új "Gyors áttekintés" kártya a UserDetail tetején:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 GYORS ÁTTEKINTÉS                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ 🗓️ TAG     │ │ 🍺 BEVÁLTÁS│ │ 💰 KÖLTÉS  │ │ 📊 ROI     │ │ 🎯 KEDVENC ││
│  │ 45 napja  │ │ 23 db      │ │ 48.500 Ft  │ │ 2.7x       │ │ Vinozza    ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                                             │
│  ⚡ MA: 2 beváltás (Vinozza, BuBu) | 📍 3 helyszínen aktív | 🔥 Heti VIP   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technikai Implementáció

### Új Komponensek

| Komponens | Leírás |
|-----------|--------|
| `SystemRulesPanel.tsx` | Összecsukható info panel a szabályokkal |
| `TodayRedemptionStatus.tsx` | Per-venue mai beváltás állapot |
| `ExportDropdown.tsx` | Újrahasználható export menü |
| `QuickOverviewCard.tsx` | Gyors összefoglaló kártya |
| `EnhancedRedemptionList.tsx` | Bővített beváltás lista kontextussal |

### Export Utility Függvények

```typescript
// src/lib/exportUtils.ts
export function exportToCSV(data: any[], filename: string): void;
export function exportUsersToCSV(users: UserListItem[]): void;
export function exportUserProfileToCSV(userData: ExtendedUserStats): void;
export function exportRedemptionsToCSV(redemptions: Redemption[]): void;
export function exportAnalyticsToCSV(analytics: AnalyticsData): void;
```

### Módosítandó Komponensek

1. **UserDetail.tsx**
   - "Szabályok" info gomb header-be
   - "Export" dropdown a header-be
   - QuickOverviewCard beillesztése

2. **UserVenueAffinity.tsx**
   - TodayRedemptionStatus hozzáadása minden venue-hoz
   - Tooltip kiegészítések

3. **Users.tsx**
   - Export gomb hozzáadása
   - Bulk export lehetőség

4. **Redemptions.tsx**
   - Export gomb hozzáadása

5. **UserScorecard.tsx** / egyéb komponensek
   - Tooltipek bővítése részletesebb magyarázatokkal

### API Bővítések

A `get-user-stats-extended` edge function bővítése:
- `today_redemptions_by_venue`: Per-venue mai beváltások
- `can_redeem_today`: Per-venue lehet-e még ma váltani

---

## Implementációs Prioritás

| Prioritás | Feladat | Komplexitás |
|-----------|---------|-------------|
| **P0** | Export utility + Users CSV export | Alacsony |
| **P0** | UserDetail Export dropdown | Alacsony |
| **P0** | SystemRulesPanel (info gomb) | Alacsony |
| **P1** | TodayRedemptionStatus per venue | Közepes |
| **P1** | QuickOverviewCard | Közepes |
| **P1** | Tooltipek bővítése | Alacsony |
| **P2** | EnhancedRedemptionList kontextussal | Közepes |
| **P2** | Redemptions export | Alacsony |

---

## Várható Eredmény

1. **Érthetőbb rendszer**: A "Szabályok" panel elmagyarázza hogyan működik minden
2. **Napi limit átláthatóság**: Látszik, melyik helyszínen váltott már ma
3. **Adat hozzáférhetőség**: Minden fontos adat exportálható CSV-be
4. **Jobb UX**: Tooltipek mindenhol, kontextus minden adatnál
5. **Gyorsabb áttekintés**: Összefoglaló kártya a legfontosabb adatokkal
