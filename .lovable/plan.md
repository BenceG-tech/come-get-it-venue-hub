
# Terv: Tooltip javítások, AI Ajánló fix és Értékteremtő Dashboard Bővítések

## Probléma Azonosítás

### 1. AI Notification Ajánló NEM MŰKÖDIK
**Ok**: A logokban `AI API error: 400` hiba látható - ez azt jelenti, hogy a Lovable AI Gateway 400-as hibát ad vissza.

**Hibás rész** (`supabase/functions/suggest-user-notification/index.ts`, sor 214-221):
```typescript
body: JSON.stringify({
  model: "gpt-4o-mini",  // ❌ HIBÁS MODEL NÉV!
  messages: [...],
  temperature: 0.7,
  max_tokens: 1000
})
```

**Javítás**: A megfelelő model név: `google/gemini-2.5-flash` (ahogy az `ai-venue-recommend` edge functionben is van).

### 2. Tooltipek Hiányoznak / Mobil Probléma
**Jelenlegi helyzet**: 
- A `Tooltip` komponens Radix UI-t használ, ami **hover-based** működésű
- Mobilon nincs hover - ezért a tooltipek NEM jelennek meg
- Néhány új komponensből hiányoznak a tooltip-ek (VenueDetail, UserDetail új elemei)

**Javítási megközelítés**:
- Mobil-barát tooltip viselkedés: érintésre jelenjen meg (touch event)
- Vagy: Popover komponensre cserélés mobilon
- Hiányzó tooltipek hozzáadása az új komponensekhez

### 3. Értékteremtő Dashboard Szekció - NINCS
A felhasználó szeretne egy szekciót ahol látja, hogyan szolgálják az adatok a vendéglátóhelyeket és italmárkákat. Ez jelenleg nem létezik.

---

## Részletes Implementációs Terv

### FÁZIS 1: AI Ajánló Javítás (Kritikus)

**Fájl**: `supabase/functions/suggest-user-notification/index.ts`

**Változtatások**:
1. Model csere: `gpt-4o-mini` → `google/gemini-2.5-flash`
2. Jobb error handling és debug logging
3. Változatosabb AI válaszok a `temperature` növelésével

```typescript
// Javított AI hívás
const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${lovableApiKey}`
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash", // ✅ JAVÍTOTT
    messages: [...],
    temperature: 0.9,  // Növelve a változatosságért
  })
});
```

---

### FÁZIS 2: Mobil-barát Tooltip Komponens

**Fájl**: `src/components/ui/tooltip.tsx` módosítás VAGY új `src/components/ui/mobile-tooltip.tsx`

**Megközelítés**: Egy wrapper komponens ami:
- Desktopon: eredeti Radix Tooltip (hover)
- Mobilon: Popover-szerű viselkedés (tap to open/close)

```typescript
// Új MobileTooltip komponens
export function MobileTooltip({ children, content }: Props) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    // Tap-alapú megjelenítés Dialog/Popover segítségével
    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent>{content}</PopoverContent>
      </Popover>
    );
  }
  
  // Desktop: eredeti tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
```

**Alkalmazás**:
- `KPICard.tsx` tooltip módosítása
- `ChartCard.tsx` tooltip módosítása
- `VenueDetail.tsx` info ikonok

---

### FÁZIS 3: Értékteremtő Dashboard - "Adat Érték" Szekció

Egy új oldal/szekció ami **vizualizálja hogyan szolgálják az adatok a partnereket**.

#### 3.1 Új Oldal: `/data-insights` vagy Dashboard-ba beépítve

**Struktúra**:

```text
+=========================================================================+
|                    📊 ADAT ÉRTÉKTEREMTÉS                                 |
|       "Így segítjük a vendéglátóhelyeket és italmárkákat"               |
+=========================================================================+

+-----------------------------------+------------------------------------+
|     🏠 VENDÉGLÁTÓHELYEKNEK        |      🍺 ITALMÁRKÁKNAK               |
+-----------------------------------+------------------------------------+

[Vendéglátóhelyek Szekció]
+-----------------------------------------------------------------+
| 📈 Forgalomnövelés                                               |
| "Az AI-alapú push értesítések átlagosan 23%-kal növelik          |
|  a visszatérő vendégek arányát"                                  |
| [📊 Trend chart: visszatérési ráta növekedése]                   |
+-----------------------------------------------------------------+
| 🎯 Célzott Marketing                                             |
| "A hűségprogram adatai alapján 5x pontosabb célzás érhető el"    |
| [📊 Szegmens breakdown: Power Users, Regulars, At-Risk]          |
+-----------------------------------------------------------------+
| ⏰ Optimális Időzítés                                            |
| "A heatmap adatok alapján a csúcsidők 89%-os pontossággal        |
|  előrejelezhetők"                                                |
| [📊 Heti heatmap: beváltások/óra]                                |
+-----------------------------------------------------------------+
| 💰 Bevétel Attribúció                                            |
| "A free drink kampányok által generált többletforgalom           |
|  átlagosan 3.2x a promóció költségének"                          |
| [📊 ROI kalkulátor chart]                                        |
+-----------------------------------------------------------------+

[Italmárkák Szekció]
+-----------------------------------------------------------------+
| 📊 Fogyasztói Preferenciák                                       |
| "Valós idejű betekintés a fogyasztói ízlésbe kategóriánként"     |
| [📊 Pie chart: ital kategóriák népszerűsége]                     |
| [📊 Trend chart: kategória változások heti szinten]              |
+-----------------------------------------------------------------+
| 🎯 Márka Penetráció                                              |
| "Melyik helyszíneken a legnépszerűbb az Ön márkája?"             |
| [📊 Venue heatmap: márka népszerűség helyszínenként]             |
+-----------------------------------------------------------------+
| 🆚 Versenyképesség                                               |
| "Összehasonlítás a kategória többi márkájával"                   |
| [📊 Bar chart: márka részesedés vs konkurencia]                  |
+-----------------------------------------------------------------+
| 🚀 Kampány Hatékonyság                                           |
| "Szponzorált promóciók teljesítménye mérhetően"                  |
| [📊 Line chart: szponzorált vs nem szponzorált italok]           |
+-----------------------------------------------------------------+

[Közös Értékteremtés Szekció]
+-----------------------------------------------------------------+
| 🤝 PLATFORM SZINERGIAEFFEKTUSOK                                  |
+-----------------------------------------------------------------+
| "2450 felhasználó     →    5 aktív helyszín    →   3 márka"      |
|                                                                   |
| Network Effect Score: 1.4x (növekvő)                             |
| Cross-venue látogatók: 34% (felhasználók akik 2+ helyszínt       |
|                         látogatnak)                              |
| Márka expozíció: +45% vs hagyományos marketing                   |
+-----------------------------------------------------------------+
```

#### 3.2 Technikai Implementáció

**Új Edge Function**: `get-data-value-insights`

```typescript
// Visszaadott adatok
{
  venue_insights: {
    push_notification_lift: 23,  // % visszatérés növekedés
    targeting_precision: 5,      // x pontosabb
    peak_hour_accuracy: 89,      // % előrejelzési pontosság
    free_drink_roi: 3.2          // x megtérülés
  },
  brand_insights: {
    category_breakdown: [...],   // Ital kategóriák %
    brand_penetration_by_venue: [...],
    sponsored_vs_organic: {...},
    competitor_comparison: [...]
  },
  platform_synergies: {
    network_effect_score: 1.4,
    cross_venue_visitors_pct: 34,
    brand_exposure_lift: 45
  }
}
```

**Új Frontend Komponensek**:
- `DataValueDashboard.tsx` - főkomponens
- `VenueValueCard.tsx` - vendéglátóhelyi érték kártya
- `BrandValueCard.tsx` - márka érték kártya
- `SynergyMetrics.tsx` - platform szinergia metrikák

---

### FÁZIS 4: Hiányzó Tooltipek Hozzáadása

**Érintett fájlok és tooltipek**:

| Komponens | Elem | Tooltip szöveg |
|-----------|------|----------------|
| `UserScorecard` | Engagement Score | "A felhasználó aktivitási szintje 0-100 skálán, beváltások, visszatérések és app használat alapján számítva." |
| `UserScorecard` | Churn Risk | "A lemorzsolódási kockázat becslése az utolsó aktivitás és viselkedési minták alapján." |
| `UserScorecard` | LTV | "A felhasználó becsült élettartam értéke (Lifetime Value) az eddigi és várható költések alapján." |
| `UserWeeklyTrends` | Chart | "Az elmúlt 4 hét session és beváltási trendje." |
| `UserVenueAffinity` | Venue list | "A felhasználó által látogatott helyszínek gyakoriság szerint rangsorolva." |
| `UserPointsFlow` | Balance | "A felhasználó jelenlegi beváltható pontegyenlege." |

---

## Összefoglaló - Fájl Módosítások

| Fájl | Művelet | Leírás |
|------|---------|--------|
| `supabase/functions/suggest-user-notification/index.ts` | **MÓDOSÍTÁS** | Model fix + temperature növelés |
| `src/components/ui/mobile-tooltip.tsx` | **ÚJ** | Mobil-barát tooltip wrapper |
| `src/components/KPICard.tsx` | **MÓDOSÍTÁS** | MobileTooltip használata |
| `src/components/ChartCard.tsx` | **MÓDOSÍTÁS** | MobileTooltip használata |
| `src/pages/DataInsights.tsx` | **ÚJ** | Adat értékteremtés dashboard |
| `src/components/insights/VenueValueSection.tsx` | **ÚJ** | Venue érték vizualizáció |
| `src/components/insights/BrandValueSection.tsx` | **ÚJ** | Brand érték vizualizáció |
| `src/components/insights/SynergyMetrics.tsx` | **ÚJ** | Platform szinergia |
| `supabase/functions/get-data-value-insights/index.ts` | **ÚJ** | Insights adat endpoint |
| `src/components/user/UserScorecard.tsx` | **MÓDOSÍTÁS** | Tooltip hozzáadás |
| `src/App.tsx` | **MÓDOSÍTÁS** | Új route: `/data-insights` |
| `src/components/Sidebar.tsx` | **MÓDOSÍTÁS** | Új menüpont |

---

## Prioritási Sorrend

| Prioritás | Feladat | Becsült komplexitás |
|-----------|---------|---------------------|
| P0 | AI Ajánló javítás (model fix) | Alacsony |
| P0 | Mobil tooltip komponens | Közepes |
| P1 | Data Insights dashboard | Magas |
| P1 | get-data-value-insights edge function | Közepes |
| P2 | Hiányzó tooltipek hozzáadása | Alacsony |
| P2 | Sidebar + routing bővítés | Alacsony |

---

## Adat Érték Dashboard - Részletes Koncepció

### Vendéglátóhelyeknek Bemutatott Értékek:

1. **Visszatérő Vendégek Növelése**
   - Metrika: Push notification → visszatérési konverzió
   - Vizualizáció: Before/After összehasonlítás

2. **Csúcsidő Előrejelzés**
   - Metrika: Heatmap pontosság vs valós forgalom
   - Vizualizáció: Előrejelzés vs tény overlay

3. **Free Drink ROI**
   - Metrika: Ingyen ital → többlet vásárlás
   - Vizualizáció: ROI kalkulátor

4. **Churn Prevention**
   - Metrika: At-risk userek azonosítása → visszacsábítás sikerráta
   - Vizualizáció: Funnel diagram

### Italmárkáknak Bemutatott Értékek:

1. **Fogyasztói Trend Insights**
   - Metrika: Ital kategória preferenciák időben
   - Vizualizáció: Stacked area chart

2. **Helyszín Penetráció**
   - Metrika: Márka részesedés venue-nként
   - Vizualizáció: Heatmap

3. **Kampány Hatékonyság**
   - Metrika: Szponzorált promóciók konverziója
   - Vizualizáció: A/B összehasonlítás chart

4. **Versenyképesség**
   - Metrika: Márka vs kategória átlag
   - Vizualizáció: Benchmark gauge chart
