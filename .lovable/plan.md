
# Grafikon Háttér, Felhasználói Áttekintés és Tooltip Javítások

## Összefoglaló

Ez a terv három fő területet fed le:
1. **Grafikon háttérszín javítása** - A BarChart/AreaChart cursor-ánál megjelenő fehér háttér kijavítása egységes stílussal
2. **Felhasználói áttekintés egyszerűsítése** - A UserDetail "Áttekintés" tab átszervezése érthetőbb, kompaktabb formába
3. **Helyszínenkénti bontás újratervezése** - A UserRevenueImpact komponens venue breakdown részének vizuális javítása
4. **Tooltip bővítés** - Magyarázó tooltip-ek hozzáadása a metrikákhoz

---

## 1. GRAFIKON HÁTTÉR JAVÍTÁS

### Probléma
A Recharts BarChart és egyéb grafikonoknál a kijelölt (hover) oszlop mögött fehér háttér jelenik meg a sötét témában, mert a `cursor` prop nincs explicit beállítva.

### Megoldás: Központi Chart Stílus Definíció

**Új fájl:** `src/lib/chartStyles.ts`

```typescript
// Egységes Recharts stílusok a sötét témához
export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--cgi-surface))",
    border: "1px solid hsl(var(--cgi-muted))",
    borderRadius: "8px",
    color: "hsl(var(--cgi-surface-foreground))",
  },
  labelStyle: { 
    color: "hsl(var(--cgi-surface-foreground))" 
  },
  itemStyle: { 
    color: "hsl(var(--cgi-muted-foreground))" 
  },
};

// BarChart cursor (hover háttér) - átlátszó sötét
export const barChartCursor = { 
  fill: "rgba(31, 177, 183, 0.1)" // cgi-primary 10% opacity
};

// AreaChart cursor - vékony vonal
export const areaChartCursor = {
  stroke: "hsl(var(--cgi-primary))",
  strokeWidth: 1,
  strokeDasharray: "3 3"
};
```

### Érintett Fájlok és Módosítások

| Fájl | Probléma | Javítás |
|------|----------|---------|
| `AdminDashboard.tsx` (87-95, 135-142) | Tooltip jó, de BarChart cursor hiányzik | `cursor={barChartCursor}` hozzáadása |
| `DataInsights.tsx` (330-336, 424-430) | Tooltip-ból hiányzik color | `chartTooltipStyle` import + használat |
| `NotificationAnalyticsDashboard.tsx` (207-211, 264-268) | `hsl(var(--card))` lehet fehér | Cserélni `chartTooltipStyle`-ra |
| `UserWeeklyTrends.tsx` (66-74) | Hiányzik cursor beállítás | `cursor={barChartCursor}` |
| `UserPointsFlow.tsx` (119-125, 162-168) | Hiányzik labelStyle | `chartTooltipStyle` |
| `UserDrinkPreferences.tsx` (74-81) | Hiányzik labelStyle | `chartTooltipStyle` |
| `RedemptionTrendsChart.tsx` (50-62) | cursor nincs kezelve | `cursor={barChartCursor}` |
| `UserActivityChart.tsx` (76-85) | AreaChart cursor | `cursor={areaChartCursor}` |

---

## 2. FELHASZNÁLÓI ÁTTEKINTÉS EGYSZERŰSÍTÉS

### Jelenlegi Probléma
A UserDetail "Áttekintés" tab túl sok komponenst tartalmaz egymás alatt:
1. ChurnWarningPanel (feltételes)
2. UserRevenueImpact 
3. UserComparison
4. UserBehaviorStory
5. UserWeeklyTrends + UserDrinkPreferences grid
6. UserPredictions
7. UserActivityHeatmap

Ez információs túlterhelést okoz.

### Megoldás: Kompakt Összefoglaló Kártya + Accordion

**Változtatások a `src/pages/UserDetail.tsx` fájlban:**

1. **Új összefoglaló szekció** az "Áttekintés" tab tetején:
   - Kompakt grid a legfontosabb metrikákkal
   - "Főbb jellemzők" lista: kedvenc hely, ital, időpont, státusz

2. **Collapsible (Accordion) layout** a részletes komponensekhez:
   - "Bevétel Hatás" - alapból nyitva
   - "Platform Összehasonlítás" - összecsukva
   - "Viselkedés & Trendek" - összecsukva
   - "Előrejelzések" - összecsukva

```text
JAVASOLT LAYOUT:

┌─────────────────────────────────────────────────────────────────┐
│  GYORS ÁTTEKINTÉS                                               │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                            │
│ │67 nap│ │12 db │ │34.5k │ │3.2x  │                            │
│ │ tag  │ │bevált│ │ Ft   │ │ ROI  │                            │
│ └──────┘ └──────┘ └──────┘ └──────┘                            │
│                                                                 │
│ 💡 Kedvenc: Vinozza (8×) • 🍺 Peroni • ⏰ Péntek 17-19          │
│                                                                 │
│ [Engagement: 72] [Churn: Alacsony ✓] [LTV: 45.2k Ft]           │
└─────────────────────────────────────────────────────────────────┘

▼ Bevétel Hatás (Részletek)
  [UserRevenueImpact - átdolgozott]

▶ Platform Összehasonlítás (+15% vs átlag)
  
▶ Viselkedési Minták
  [Trends + Preferences + Heatmap]

▶ AI Előrejelzések
```

### Új Komponens: `UserOverviewSummary.tsx`

```typescript
interface UserOverviewSummaryProps {
  stats: UserStats;
  scores: UserScores;
  predictions: UserPredictions | null;
}

// Megjelenít:
// - 4 fő KPI kártya (tag óta, beváltások, költés, ROI)
// - "Főbb jellemzők" sor ikonokkal
// - Engagement/Churn/LTV badge-ek
```

---

## 3. HELYSZÍNENKÉNTI BONTÁS ÁTDOLGOZÁS

### Jelenlegi Probléma
A `UserRevenueImpact.tsx` venue breakdown szekciója:
- Túl sok badge egy sorban (Ma, Heti, Havi, Összes)
- Nem egyértelmű a "free drinks" vs "költés" kapcsolat
- ROI érték nem magyarázott

### Megoldás: Vizuális Progress Bar Layout

**Módosítás:** `src/components/user/UserRevenueImpact.tsx`

```text
JAVASOLT ÚJ LAYOUT:

┌────────────────────────────────────────────────────────────────┐
│  📍 VINOZZA                                          🔥 +3.2x  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Ingyen italok értéke:                                         │
│  [█████░░░░░░░░░░░░░░░░░░░░░░░░░] 3,000 Ft (2 db)  ℹ️          │
│                                                                │
│  Többletköltés:                                                │
│  [█████████████████████████████░░░░░░░░] 9,600 Ft  ℹ️          │
│                                                                │
│  ─────────────────────────────────────────────                 │
│  ✨ Tiszta profit: +6,600 Ft                                   │
│     (Az ingyen italra 3.2x megtérülés) ℹ️                      │
│                                                                │
│  📊 Összesen 8 látogatás (2 ezen a héten)                      │
└────────────────────────────────────────────────────────────────┘
```

**Főbb Változtatások:**

1. **Vizuális progress bar** a költés és free drink értékhez
2. **"Tiszta profit" sor** - egyértelműen mutatja az eredményt
3. **Egyszerűsített látogatás** - 1 sor, nem 4 badge
4. **InfoTooltip minden metrikához**

**Új helper komponens:** `VenueROICard`

```typescript
interface VenueROICardProps {
  venue: VenueRevenue;
  maxSpend: number; // A progress bar skálázásához
}

// Progress bar számítás:
// freeDrinkBar = (free_drinks_value / maxSpend) * 100
// spendBar = (pos_spend / maxSpend) * 100
```

---

## 4. TOOLTIP BŐVÍTÉSEK

### Hiányzó Tooltip-ek és Javasolt Szövegek

#### UserRevenueImpact.tsx

| Elem | Tooltip Szöveg |
|------|----------------|
| Ingyen italok | "Az ingyen italok becsült értéke (1 ital ≈ 1,500 Ft)" |
| Többletköltés | "A vendég által a helyszínen elköltött összeg (POS/banki adatból)" |
| ROI badge | "ROI = Költés ÷ Ingyen italok értéke. 2x felett nyereséges!" |
| Tiszta profit | "Többletköltés - Ingyen italok értéke = A helyszín profitja" |
| Látogatások | "Összes látogatás a regisztráció óta / ezen a héten" |

#### UserComparison.tsx

| Metrika | Tooltip Szöveg |
|---------|----------------|
| Beváltások/hó | "Havi átlagos beváltások száma. Magasabb = aktívabb felhasználó." |
| Költés/beváltás | "Átlagos költés minden beváltás után. Ez mutatja a vendég értékét." |
| Látogatott helyek | "Hány különböző helyszínen volt aktív a platformon." |
| ROI | "Megtérülés: a vendég által generált bevétel vs. az ingyen italok költsége." |

#### QuickOverviewCard.tsx

| Elem | Tooltip Szöveg |
|------|----------------|
| MA szekció | "A mai napi aktivitás. Szabály: max 1 beváltás/nap összesen." |
| Heti VIP | "A felhasználó 'VIP' státuszt kapott egy helyszínen, ahol 5+ alkalommal járt a héten." |

#### AdminDashboard.tsx (Chart tengelyek)

| Elem | Módosítás |
|------|-----------|
| X tengely | Tooltip a dátumhoz |
| Y tengely | "Beváltások száma" vagy "Bevétel (Ft)" |

---

## 5. IMPLEMENTÁCIÓS TERV

### Fázis 1: Chart Stílus Központosítás (1 óra)

1. Létrehozni `src/lib/chartStyles.ts` fájlt
2. Módosítani az összes chart komponenst:
   - AdminDashboard.tsx
   - DataInsights.tsx
   - NotificationAnalyticsDashboard.tsx
   - UserWeeklyTrends.tsx
   - UserPointsFlow.tsx
   - UserDrinkPreferences.tsx
   - RedemptionTrendsChart.tsx
   - UserActivityChart.tsx

### Fázis 2: UserRevenueImpact Átdolgozás (2 óra)

1. Venue breakdown új layout (progress bar)
2. Egyszerűsített látogatás sor
3. "Tiszta profit" sor hozzáadása
4. Tooltip-ek minden metrikához

### Fázis 3: User Overview Egyszerűsítés (2-3 óra)

1. Létrehozni `UserOverviewSummary.tsx` komponenst
2. Accordion layout implementálása az "Áttekintés" tab-ra
3. Komponensek átrendezése logikus csoportokba

### Fázis 4: Tooltip Bővítés (1 óra)

1. UserComparison.tsx - metrika tooltip-ek
2. QuickOverviewCard.tsx - szekció tooltip-ek
3. AdminDashboard.tsx - chart tooltip-ek

---

## 6. FÁJL VÁLTOZÁSOK ÖSSZEFOGLALÓ

### Új Fájlok
| Fájl | Leírás |
|------|--------|
| `src/lib/chartStyles.ts` | Központi Recharts stílus definíciók |
| `src/components/user/UserOverviewSummary.tsx` | Kompakt összefoglaló kártya |

### Módosított Fájlok
| Fájl | Változás Típusa |
|------|-----------------|
| `src/components/dashboard/AdminDashboard.tsx` | Chart cursor + tooltip |
| `src/pages/DataInsights.tsx` | Tooltip stílus |
| `src/components/NotificationAnalyticsDashboard.tsx` | Tooltip stílus |
| `src/components/user/UserWeeklyTrends.tsx` | Chart cursor |
| `src/components/user/UserPointsFlow.tsx` | Tooltip stílus |
| `src/components/user/UserDrinkPreferences.tsx` | Tooltip stílus |
| `src/components/RedemptionTrendsChart.tsx` | Chart cursor |
| `src/components/UserActivityChart.tsx` | Chart cursor |
| `src/components/user/UserRevenueImpact.tsx` | Teljes átdolgozás |
| `src/components/user/UserComparison.tsx` | Tooltip hozzáadás |
| `src/components/user/QuickOverviewCard.tsx` | Tooltip hozzáadás |
| `src/pages/UserDetail.tsx` | Overview tab átszervezés |

---

## 7. BECSÜLT IDŐ

| Fázis | Idő |
|-------|-----|
| Chart stílus javítás | 1 óra |
| UserRevenueImpact átdolgozás | 2 óra |
| User Overview egyszerűsítés | 2-3 óra |
| Tooltip bővítés | 1 óra |
| **Összesen** | **6-7 óra** |
