
# Terv: Teszt Adatok + Extrém Analitika Bővítés

## 1. RÉSZ: Teszt Adatok Feltöltése

### Jelenlegi Helyzet
- **0 redemption** a redemptions táblában
- **0 user_activity_logs** bejegyzés
- **0 user_points** rekord
- **0 points_transactions** rekord
- **1 profiles** (gataibence@gmail.com)
- **5 venues** (Bartl Janos, BuBu, A KERT Bisztró, Kiscsibe, Vinozza)
- **4 venue_drinks** (Limonádé, Peroni x2, Bodzás Limonádé)

### Generálandó Teszt Adatok

| Tábla | Mennyiség | Leírás |
|-------|-----------|--------|
| `profiles` | +15 új | Változatos regisztrációs dátumokkal (1-60 nap) |
| `redemptions` | +200 | 30 napra elosztva, csúcsidőkkel |
| `user_activity_logs` | +500 | App megnyitás, venue nézés, QR generálás |
| `user_points` | +16 | Minden userhez egyenleg |
| `points_transactions` | +100 | Pont mozgások |

### Adatok Mintázatai (Reális Szimulációhoz)
- **Hétfő-Csütörtök**: 40% aktivitás
- **Péntek-Szombat**: 90% aktivitás (csúcs)
- **Vasárnap**: 30% aktivitás
- **Csúcsidők**: 17:00-21:00 (Happy Hour)
- **Visszatérő felhasználók**: 60% (hűségesek)
- **Power userek**: 3-4 fő 20+ beváltással

---

## 2. RÉSZ: Extrém Analitika Funkciók (Javaslatok)

### A) Felhasználó Szintű Mély Analitika

#### 1. **User Lifetime Journey Map**
```text
Regisztráció → Első beváltás → Aktív szakasz → Csökkenés? → Reaktiváció?
     ↓              ↓              ↓              ↓              ↓
   Jan 5        Jan 7 (2 nap)    8 beváltás    14 nap szünet   Geofence push
```
- Minden felhasználó vizuális "életút" idővonala
- Kritikus pillanatok jelölése (első beváltás, leghűségesebb hét, lemorzsolódási kockázat)

#### 2. **Predictive Churn Score (AI)**
```text
Kockázati faktorok:
- 14+ nap inaktivitás: +40%
- Csökkenő beváltási frekvencia: +25%
- Nincs kedvenc helyszín: +15%
- Alacsony pont egyenleg: +10%
- Nincs push engedély: +10%
-----------------------------------
Összesített churn kockázat: 78% (MAGAS)
```

#### 3. **User Cohort Analysis**
```text
        Week 0   Week 1   Week 2   Week 3   Week 4
Jan 1    100%     72%      58%      45%      38%
Jan 8    100%     68%      52%      41%       -
Jan 15   100%     75%      60%       -        -
Jan 22   100%     70%       -        -        -
```
- Regisztrációs kohortok retention rátája
- Melyik héten regisztráltak a leghűségesebbek?

#### 4. **User Segment Clustering**
```text
Szegmensek:
🏆 Power Users (top 10%): 20+ beváltás/hó, 500+ pont
🔄 Regulars (30%): 5-19 beváltás/hó, rendszeres
🌱 Newbies (25%): <30 nap, 1-4 beváltás
😴 Sleepers (20%): 14+ nap inaktív
👻 Ghosts (15%): 30+ nap inaktív
```

#### 5. **User vs User Comparison**
- Két felhasználó direkt összehasonlítása
- Radar chart: aktivitás, pontok, beváltások, helyszínek, lojalitás
- "Ki a jobb ügyfél?" score

---

### B) Venue Szintű Extrém Metrikák

#### 6. **Venue Health Score**
```text
Pontrendszer (0-100):
- Napi beváltások: 25 pont
- Visszatérő arány: 25 pont
- Átl. kosárérték: 20 pont
- Növekedési trend: 15 pont
- Értékelés: 15 pont
-----------------------------------
Blue Lagoon: 87/100 (KIVÁLÓ)
```

#### 7. **Venue vs Venue Battle**
```text
           Blue Lagoon    vs    Jazz Bar
Beváltás/nap:    12              8
Visszatérők:     65%            48%
Átl. kosár:    3200 Ft        2800 Ft
Csúcsidő:      19:00          21:00
Top ital:       IPA          Mojito
-----------------------------------
Győztes: Blue Lagoon (+3 kategória)
```

#### 8. **Venue Cannibalization Analysis**
- Melyik helyszínek "lopják" egymás felhasználóit?
- Ha X helyszín nyit, Y helyszín forgalma csökken?

#### 9. **Optimal Staffing Predictor**
```text
Péntek 19:00-21:00:
- Előrejelzett beváltások: 45
- Ajánlott személyzet: 3 fő
- Kapacitás kihasználtság: 87%
```

---

### C) Platform Szintű Szuper Metrikák

#### 10. **Real-Time Platform Pulse**
```text
🟢 LIVE Dashboard
- Aktív felhasználók most: 127
- Beváltások az elmúlt 5 percben: 8
- Legforróbb helyszín: Blue Lagoon (23 aktív)
- Trending ital: Aperol Spritz (+45%)
```

#### 11. **Revenue Attribution Model**
```text
Bevétel forrása:
- Organikus visszatérők: 45%
- Push értesítésből: 22%
- Geofence triggersből: 18%
- Promóciókból: 12%
- Social share: 3%
```

#### 12. **Seasonality & Weather Correlation**
```text
Időjárás hatás:
- Esős nap: -35% outdoor helyszín forgalom
- 25°C+: +40% terasz helyszínek
- Péntek + jó idő: +60% általános
```

#### 13. **Drink Trend Analysis**
```text
📈 Felfelé menők:
1. Aperol Spritz (+120% MoM)
2. Natural Wine (+45%)
3. Craft IPA (+38%)

📉 Lefelé menők:
1. Vodka Shots (-25%)
2. Long Island (-18%)
```

#### 14. **Network Effect Score**
```text
Felhasználói hálózat:
- Átl. megosztások/user: 2.3
- Referral konverzió: 34%
- Virális együttható: 1.4 (növekvő)
```

---

### D) AI-Powered Insights

#### 15. **Anomaly Detection**
```text
⚠️ Szokatlan aktivitás észlelve:
- Blue Lagoon: Hétfő 14:00 +180% vs átlag
  → Ok: Céges rendezvény?
- User X: 8 beváltás 2 órán belül
  → Ok: Csoport szervezés?
```

#### 16. **Next Best Action (NBA) Engine**
```text
User: Kiss Péter
Ajánlott akció: "Személyre szabott push"
Időzítés: Péntek 16:45
Tartalom: "Kedvenc helyszíned, Blue Lagoon, most happy hour-t tart!"
Becsült konverzió: 68%
```

#### 17. **Churn Prevention Automation**
```text
Automatikus szabály:
IF churn_risk > 70% AND last_activity > 14 days:
  → Küldj 15% kedvezmény kupont
  → Geofence trigger aktiválása
  → AI notification javaslat
```

---

### E) Összehasonlító & Benchmark Metrikák

#### 18. **Industry Benchmark Comparison**
```text
Come Get It vs Iparági átlag:
- DAU/MAU: 23% (iparág: 18%) ✅
- Retention D7: 45% (iparág: 35%) ✅
- Avg. redemption/user: 4.2 (iparág: 3.1) ✅
```

#### 19. **Time-to-Value Analysis**
```text
Új felhasználó optimalizáció:
- Regisztráció → Első beváltás: Átl. 2.3 nap
- Első beváltás → Visszatérés: Átl. 5.1 nap
- Power user státusz elérése: Átl. 28 nap
```

#### 20. **LTV Prediction Model**
```text
User: Kiss Péter
- Eddigi érték: 45.000 Ft
- Becsült hátralévő LTV: 120.000 Ft
- Konfidencia: 78%
- Recommendation: VIP program meghívás
```

---

## 3. TECHNIKAI IMPLEMENTÁCIÓ

### 3.1 Teszt Adat Generálás (Edge Function)
Új edge function: `seed-test-data`
- Admin-only hozzáférés
- Egyszeri futtatás
- Reális mintázatok generálása

### 3.2 Bővített Analitika Edge Functions

| Edge Function | Cél |
|---------------|-----|
| `get-platform-metrics` | Real-time platform pulse |
| `get-cohort-analysis` | Retention kohortok |
| `get-user-segments` | AI szegmentáció |
| `get-venue-health` | Venue egészségi pontszám |
| `get-anomaly-report` | Szokatlan aktivitások |
| `get-drink-trends` | Ital trend elemzés |

### 3.3 Új UI Komponensek

| Komponens | Oldal |
|-----------|-------|
| `PlatformPulse` | Dashboard |
| `CohortHeatmap` | Users |
| `UserSegmentPie` | Users |
| `VenueHealthCard` | Venues |
| `DrinkTrendChart` | Analytics |
| `AnomalyAlertList` | Dashboard |

### 3.4 Adatbázis Bővítések (Opcionális)

```sql
-- Anomaly log
CREATE TABLE anomaly_logs (
  id UUID PRIMARY KEY,
  entity_type TEXT, -- 'user' | 'venue' | 'drink'
  entity_id UUID,
  anomaly_type TEXT,
  severity TEXT,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB
);

-- User segments (cache)
CREATE TABLE user_segments (
  user_id UUID PRIMARY KEY,
  segment TEXT,
  score NUMERIC,
  computed_at TIMESTAMPTZ
);
```

---

## 4. IMPLEMENTÁCIÓS PRIORITÁS

### P0 - Alapok (Most)
1. **Teszt adatok generálása** (seed-test-data edge function)
2. Analytics oldal működésének ellenőrzése valós adatokkal

### P1 - Felhasználó Analitika
3. User Cohort Analysis
4. User Segment Clustering
5. Churn Prediction Score

### P2 - Venue Analitika
6. Venue Health Score
7. Venue vs Venue Comparison
8. Drink Trend Analysis

### P3 - Platform Szint
9. Real-time Platform Pulse
10. Anomaly Detection
11. Industry Benchmarks

---

## 5. TESZT ADATOK RÉSZLETEI

### Generálandó Profiles (15 új)
```text
ID    | Név              | Regisztráció | Típus
------+------------------+--------------+-------
p01   | Kovács Anna      | 45 nap       | Power user
p02   | Nagy Béla        | 38 nap       | Regular
p03   | Szabó Csilla     | 30 nap       | Regular
p04   | Tóth Dániel      | 28 nap       | Newbie aktív
p05   | Kiss Eszter      | 25 nap       | Sleeper
p06   | Horváth Ferenc   | 22 nap       | Regular
p07   | Varga Gábor      | 20 nap       | Power user
p08   | Molnár Hanna     | 18 nap       | Newbie
p09   | Farkas István    | 15 nap       | Ghost
p10   | Balogh Judit     | 12 nap       | Regular
p11   | Papp Károly      | 10 nap       | Newbie aktív
p12   | Lakatos Laura    | 7 nap        | Newbie
p13   | Simon Márton     | 5 nap        | Newbie
p14   | Fekete Nóra      | 3 nap        | Newbie
p15   | Oláh Péter       | 1 nap        | Newbie
```

### Redemptions Eloszlás (200 db)
- **Kovács Anna**: 28 beváltás (power user)
- **Varga Gábor**: 24 beváltás (power user)
- **Szabó Csilla**: 18 beváltás
- **Nagy Béla**: 15 beváltás
- **Horváth Ferenc**: 14 beváltás
- **Balogh Judit**: 12 beváltás
- **Tóth Dániel**: 10 beváltás
- **Többi**: 1-8 beváltás

### Venue Eloszlás
- **Vinozza**: 35% (legnépszerűbb)
- **Bartl Janos**: 25%
- **A KERT Bisztró**: 20%
- **BuBu**: 12%
- **Kiscsibe**: 8%

### Időbeli Eloszlás
- Elmúlt 7 nap: 40% redemptions
- 8-14 napja: 25%
- 15-21 napja: 20%
- 22-30 napja: 15%

---

## 6. ÖSSZEFOGLALÁS

A terv két fő részből áll:
1. **Teszt adatok**: 15 új felhasználó, 200 beváltás, 500 aktivitás log reális mintázatokkal
2. **Extrém analitika**: 20 új metrika/funkció javaslat prioritás szerint

Az implementáció lépésenként halad, először a teszt adatokkal, majd a P0-P3 prioritási sorrendben az új analitika funkciókkal.
