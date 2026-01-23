
# Terv: UserQuickView Modal & Prediktív Analitika Panel

## Összefoglaló

Két új komponenst hozunk létre:
1. **UserQuickView Modal** - A Users listából egy kattintásra megnyíló gyorsnézet modal
2. **UserPredictions Panel** - Jövőbeli előrejelzések panel a UserDetail oldalra

---

## 1. RÉSZ: UserQuickView Modal

### Koncepció

A Users lista minden sorához egy "szem" ikont adunk, amely egy modált nyit meg a felhasználó teljes összefoglalójával - anélkül, hogy el kellene navigálni a részletes profilba.

### Modal tartalma

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 KISS PÉTER - GYORSNÉZET                                    [Bezárás ✕] │
├─────────────────────────────────────────────────────────────────────────────┤
│  PROFIL                                                                     │
│  📧 kiss.peter@email.com | 📱 +36 30 123 4567 | Tag: 45 napja              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 ALAP                    💰 PÉNZÜGYI              🎯 STÁTUSZ             │
│  ├─ 23 beváltás            ├─ 48.500 Ft költés      ├─ 🟢 Aktív            │
│  ├─ 4 helyszín             ├─ 2.7x ROI              ├─ Alacsony churn      │
│  └─ 156 pont               └─ 12.000 Ft LTV         └─ 78 engagement       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  📅 MAI ÁLLAPOT                                                            │
│                                                                             │
│  Vinozza: ✅ 14:32 (Peroni)                                                │
│  BuBu: ⏳ Még nem váltott (ablak: 16:00-18:00)                             │
│  A KERT: ⏳ Még nem váltott (ablak: 17:00-20:00)                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🏆 TOP ITALOK                                                              │
│  1. Peroni (8x) • 2. Dreher (5x) • 3. Spritzer (3x)                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [👤 Teljes profil] [📤 Push küldése] [🎁 Jutalom] [📊 Export]             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technikai megoldás

Az adatokat a már létező `get-user-stats-extended` edge function-ból töltjük be a modal megnyitásakor.

---

## 2. RÉSZ: Prediktív Analitika Panel (UserPredictions)

### Koncepció

Egy új panel a UserDetail Áttekintés tabján, ami becslést ad a felhasználó következő 30 napjára.

### Panel tartalma

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔮 JÖVŐBELI ELŐREJELZÉS (30 NAP)                         [ℹ️ Magyarázat]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ VÁRHATÓ         │  │ BECSÜLT         │  │ LEGVALÓSZÍNŰBB  │             │
│  │ BEVÁLTÁSOK      │  │ KÖLTÉS          │  │ HELYSZÍN        │             │
│  │                 │  │                 │  │                 │             │
│  │   8-12 db       │  │  32.000-45.000  │  │  Vinozza (78%)  │             │
│  │ ±3 az átlagtól  │  │       Ft        │  │  BuBu (45%)     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  🎯 OPTIMÁLIS PUSH IDŐPONT                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📅 Csütörtök 14:30                                                 │   │
│  │  💡 "Emlékeztető a holnapi happy hour-ra Vinozza-ban"               │   │
│  │                                                [📤 Push küldése]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📊 SZÁMÍTÁS ALAPJA:                                                        │
│  • Átlagos látogatások/hó: 10 db                                           │
│  • Leggyakoribb nap: Péntek (67%)                                          │
│  • Leggyakoribb időpont: 17:00-19:00 (45%)                                 │
│  • Mintázat megbízhatósága: Magas (4+ hét adat)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Predikció számítási logika

A predikció az edge function-ben a meglévő adatokból számolható:

1. **Várható beváltások (30 nap)**:
   - `redemptions_last_30_days` alapján, ±20% variancia

2. **Becsült költés**:
   - `user_spend_per_redemption × várható beváltások`

3. **Legvalószínűbb helyszín**:
   - `venue_affinity` első 3 eleme, százalékos arányban

4. **Optimális push időpont**:
   - `hourly_heatmap` és `preferred_days` alapján

---

## 3. RÉSZ: Implementálandó Fájlok

### Új fájlok

| Fájl | Leírás |
|------|--------|
| `src/components/user/UserQuickView.tsx` | Modal komponens gyorsnézethez |
| `src/components/user/UserPredictions.tsx` | Prediktív analitika panel |

### Módosítandó fájlok

| Fájl | Változás |
|------|----------|
| `src/pages/Users.tsx` | "Gyorsnézet" gomb hozzáadása minden user sorhoz + modal state |
| `src/pages/UserDetail.tsx` | UserPredictions integrálása az Áttekintés tabra |
| `src/components/user/index.ts` | Új komponensek exportálása |
| `supabase/functions/get-user-stats-extended/index.ts` | `predictions` mező hozzáadása |

---

## 4. RÉSZ: Edge Function Bővítés

### Új `predictions` mező a response-ban:

```typescript
predictions: {
  expected_redemptions_30_days: {
    min: number;
    max: number;
    average: number;
  };
  estimated_spend_30_days: {
    min: number;
    max: number;
  };
  likely_venues: Array<{
    venue_id: string;
    venue_name: string;
    probability: number;
  }>;
  likely_day: {
    day: number;
    day_name: string;
    probability: number;
  };
  likely_hour: {
    hour: number;
    probability: number;
  };
  optimal_push: {
    day_name: string;
    time: string;
    suggested_message: string;
  } | null;
  confidence: "low" | "medium" | "high";
  data_weeks: number;
}
```

### Számítási logika (edge function-ben):

```typescript
// 1. Várható beváltások
const avgPerMonth = redemptions.filter(r => 
  new Date(r.redeemed_at).getTime() > thirtyDaysAgo
).length;
const expectedRedemptions = {
  min: Math.max(0, avgPerMonth - 3),
  max: avgPerMonth + 3,
  average: avgPerMonth
};

// 2. Várható költés
const spendPerRedemption = totalSpend / totalRedemptions || 0;
const estimatedSpend = {
  min: expectedRedemptions.min * spendPerRedemption,
  max: expectedRedemptions.max * spendPerRedemption
};

// 3. Valószínű helyszínek (venue_affinity alapján)
const totalVisits = venueAffinity.reduce((s, v) => s + v.visit_count, 0);
const likelyVenues = venueAffinity.slice(0, 3).map(v => ({
  venue_id: v.venue_id,
  venue_name: v.venue_name,
  probability: Math.round((v.visit_count / totalVisits) * 100)
}));

// 4. Valószínű nap/óra (hourly_heatmap alapján)
// Megkeressük a legnagyobb értéket a heatmap-ban

// 5. Optimális push időpont
// A legvalószínűbb nap előtt 1 nappal, délután
```

---

## 5. RÉSZ: Users Oldal - Gyorsnézet Gomb

### Változások a user lista sorban:

```tsx
// Jelenlegi: Kattintás = navigálás profilba
<div onClick={() => navigate(`/users/${user.id}`)}>
  ...
  <ChevronRight />
</div>

// Új: Külön "Gyorsnézet" gomb + kattintás = navigálás
<div>
  ...
  <Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
      e.stopPropagation();
      setQuickViewUserId(user.id);
    }}
  >
    <Eye className="h-4 w-4" />
  </Button>
  <ChevronRight onClick={() => navigate(`/users/${user.id}`)} />
</div>
```

---

## 6. RÉSZ: Implementációs Sorrend

| Lépés | Feladat | Prioritás |
|-------|---------|-----------|
| 1 | `get-user-stats-extended` bővítése predictions mezővel | P0 |
| 2 | `UserPredictions.tsx` komponens létrehozása | P0 |
| 3 | `UserDetail.tsx` - UserPredictions integrálása | P0 |
| 4 | `UserQuickView.tsx` modal komponens létrehozása | P0 |
| 5 | `Users.tsx` - Gyorsnézet gomb és modal integrálása | P0 |
| 6 | `index.ts` exportok frissítése | P0 |

---

## 7. RÉSZ: UI/UX Részletek

### UserQuickView Modal
- Dialog komponens használata (már importálva van a projektben)
- Skeleton loading amíg az adatok betöltődnek
- Action gombok: "Teljes profil", "Push küldése", "Jutalom küldése"
- Ma minden venue-nál TodayRedemptionStatus komponens

### UserPredictions Panel
- Vizuális kiemelés a fő metrikáknál (gradient háttér)
- Confidence badge (Alacsony/Közepes/Magas megbízhatóság)
- Tooltip minden metrikánál a számítási módszer magyarázatával
- "Push küldése" gomb az optimális push ajánlásnál

---

## 8. RÉSZ: Várható Eredmény

1. **Gyorsabb áttekintés**: A Users listából egy kattintásra teljes összefoglaló
2. **Proaktív döntéshozatal**: A predikciók segítenek megelőzni a churn-t
3. **Célzott marketing**: Az optimális push időpontok növelik a megnyitási arányt
4. **Átláthatóság**: A számítási logika magyarázva van tooltipekben
