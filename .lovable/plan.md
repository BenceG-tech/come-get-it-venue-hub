
# Terv: "Outside the Box" Extrém Analitika & Viselkedéselemző Rendszer

## Koncepció Összefoglaló

A jelenlegi rendszer jó alapokat ad (engagement score, churn risk, LTV), de a következő szintre léphetünk **prediktív viselkedéselemzéssel** és **akcionálható insight-okkal**. Olyan funkciókat javaslok, amelyek nem csak megmutatják mi történt, hanem **megmondják mit jelent és mit csináljunk vele**.

---

## 1. RÉSZ: User Behavior Analysis Engine (Viselkedéselemző Motor)

### 1.1 "Mi történt és Mit jelent?" - Action Story Generator

Minden felhasználónál egy **AI-generált narratív összefoglaló** az aktivitásáról, ami emberi nyelven elmondja mi történt és mit következtethetünk belőle.

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📖 FELHASZNÁLÓ TÖRTÉNET - Kiss Péter                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Péter 45 napja regisztrált és azóta 12-szer váltott be ingyen    │
│   italt. Az elmúlt 2 hétben azonban a viselkedése megváltozott:     │
│                                                                     │
│   📉 A heti 2 beváltásból heti 0 lett                              │
│   📍 A Vinozza helyett a BuBu-ba járt utoljára (új felfedezés?)    │
│   🔔 Az utolsó 3 push értesítést nem nyitotta meg                  │
│                                                                     │
│   ⚠️ KÖVETKEZTETÉS: Péter valószínűleg unatkozik a megszokottól,   │
│   új élményeket keres. Ajánlott: Személyre szabott új helyszín     │
│   ajánlat vagy exkluzív promóció a visszacsábításhoz."             │
│                                                                     │
│   [🤖 AI Értesítés Generálása] [📊 Részletes Elemzés]               │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Behavioral Pattern Detection (Viselkedési Minták)

Automatikus mintafelismerés az aktivitásból:

| Minta neve | Detekció | Mit jelent | Akció |
|------------|----------|------------|-------|
| **"Weekend Warrior"** | 80%+ beváltás hétvégén | Szabadidős fogyasztó | Pénteki push 16:00-kor |
| **"Happy Hour Hunter"** | 70%+ beváltás 17-19h között | Akció-vadász | Happy hour értesítések |
| **"Venue Hopper"** | 3+ különböző helyszín 30 napon belül | Felfedező típus | Új helyszín ajánlatok |
| **"Loyal Regular"** | 80%+ egy helyszínre jár | Törzsvendég | VIP jutalmak |
| **"Ghost Mode"** | App open de nincs beváltás | Passzív szemlélő | Motivációs kampány |
| **"Social Butterfly"** | Mindig csoportos beváltás | Társaságkedvelő | Group deal ajánlatok |
| **"Brand Loyal"** | 70%+ egy márka italát issza | Márka rajongó | Márka partnerség |

### 1.3 Micro-Moment Detection (Mikro-pillanat felismerés)

A felhasználó aktuális "állapotának" valós idejű felismerése:

```text
┌───────────────────────────────────────────────────────────────┐
│  ⚡ MIKRO-PILLANAT RADAR                                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  🔴 "Döntési pillanat" - 3 felhasználó böngészi a helyszínek  │
│     → Azonnali geofence push ajánlott                          │
│                                                                │
│  🟡 "Visszatérési ablak" - 8 user 13-14 napja nem aktív       │
│     → Ma az utolsó esély a reaktiválásra                       │
│                                                                │
│  🟢 "Pont-küszöb" - 5 user 50 ponton belül a jutalom          │
│     → Pont emlékeztető push                                    │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. RÉSZ: Comparative Analytics (Összehasonlító Elemzések)

### 2.1 User Similarity Clustering

Hasonló viselkedésű felhasználók csoportosítása és összehasonlítása:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👥 HASONLÓ FELHASZNÁLÓK - Kiss Péter klaszterje                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Péter a 'Craft Beer Enthusiast' klaszterbe tartozik (23 fő)"     │
│                                                                     │
│  ┌──────────────┬────────────┬────────────┬────────────┐           │
│  │              │   Péter    │ Klaszter Ø │   Top 10%  │           │
│  ├──────────────┼────────────┼────────────┼────────────┤           │
│  │ Beváltás/hó  │     4      │    6.2     │    12.5    │           │
│  │ LTV          │  45.000 Ft │  68.000 Ft │ 145.000 Ft │           │
│  │ Helyszínek   │     2      │    3.1     │    5.2     │           │
│  │ Session/hét  │    1.5     │    2.3     │    4.1     │           │
│  └──────────────┴────────────┴────────────┴────────────┘           │
│                                                                     │
│  💡 INSIGHT: Péter 35%-kal alulteljesít a klaszteréhez képest.     │
│             Potenciál: +23.000 Ft LTV növekedés célzott kampánnyal │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 "What-If" Scenario Analyzer

Mi történne, ha...? szimulációk:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔮 "MI LENNE HA...?" SZIMULÁCIÓ                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Szcenárió: "Ha minden magas churn kockázatú usernek küldünk       │
│              személyre szabott ajánlatot..."                        │
│                                                                     │
│  ┌─────────────────────┬────────────────────────────────┐          │
│  │ Érintett felhasználók │ 47 fő (magas churn risk)     │          │
│  │ Becsült reaktiváció   │ 23% (11 fő) - iparági átlag  │          │
│  │ Potenciális LTV mentés│ 385.000 Ft                    │          │
│  │ Kampány költség       │ ~15.000 Ft (push + kupon)    │          │
│  │ Becsült ROI           │ 25.6x                         │          │
│  └─────────────────────┴────────────────────────────────┘          │
│                                                                     │
│  [🚀 Kampány indítása] [📊 Részletes breakdown]                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. RÉSZ: Venue & Brand Intelligence

### 3.1 Venue Cannibalization Map

Melyik helyszínek "kannibalizálják" egymást?

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🗺️ HELYSZÍN KANNIBALIZÁCIÓ TÉRKÉP                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    Vinozza  ◄──── 34% közös user ────►  A KERT Bisztró             │
│       │                                        │                    │
│       │ 12% közös                    28% közös │                    │
│       ▼                                        ▼                    │
│    BuBu     ◄──── 8% közös user ─────►   Kiscsibe                  │
│                                                                     │
│  ⚠️ INSIGHT: Vinozza és A KERT Bisztró erősen versenyez ugyanazért │
│              a közönségért. Ajánlott: Differenciált promóciók.     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Drink Affinity Matrix

Melyik italokat fogyasztják együtt?

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🍺 ITAL AFFINITÁS MÁTRIX                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Akik Peroni-t ittak, 67%-ban később IPA-t is próbáltak"          │
│  "Bodzás limonádé → 45% eséllyel Aperol Spritz a következő"        │
│                                                                     │
│  🔗 CROSS-SELL LEHETŐSÉGEK:                                         │
│  1. Peroni + Craft IPA bundle: +23% konverzió esély               │
│  2. Limonádé → Koktél upsell: +18% bevételnövelés                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Brand Exposure Timeline

Márkák expozíciójának időbeli elemzése:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📊 PERONI MÁRKA EXPOZÍCIÓ - Elmúlt 30 nap                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Impressziók:    2,340 (helyszín megtekintésnél látták)            │
│  Beváltások:       187                                              │
│  Konverzió:        8.0%                                             │
│  Trend:            ↗️ +12% vs előző hónap                           │
│                                                                     │
│  Top helyszín:     Vinozza (45% részesedés)                         │
│  Legjobb nap:      Péntek (32% beváltás)                            │
│  Legjobb óra:      19:00 (18% beváltás)                             │
│                                                                     │
│  💡 AJÁNLÁS: Szombat délutáni kampány indítása a konverzió         │
│              növelésére (jelenleg alulteljesít: 12% vs 18% Péntek) │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. RÉSZ: Predictive Analytics

### 4.1 "Next Action Predictor"

Mire számíthatunk a felhasználótól?

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔮 KÖVETKEZŐ AKCIÓ ELŐREJELZÉS - Kiss Péter                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Predikciók (konfidencia alapján):                                  │
│                                                                     │
│  1. 🟢 78% - Vinozzába fog menni (kedvenc helyszín)                │
│  2. 🟡 45% - Pénteken 18-20h között (szokásos időpont)             │
│  3. 🔴 23% - Kipróbál egy új helyszínt (felfedező trend)           │
│                                                                     │
│  📅 Becsült következő beváltás: 3-5 napon belül                     │
│  🎯 Optimális push időpont: Péntek 16:30                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Revenue Forecasting

Bevétel előrejelzés user szinten:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💰 BEVÉTEL ELŐREJELZÉS - Következő 30 nap                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Baseline (ha semmit nem csinálunk):                                │
│  - Várható beváltások: 320                                          │
│  - Várható bevétel: 480.000 Ft                                      │
│                                                                     │
│  Optimista (célzott kampányokkal):                                  │
│  - Várható beváltások: 410 (+28%)                                   │
│  - Várható bevétel: 615.000 Ft (+28%)                               │
│                                                                     │
│  Pesszimista (jelenlegi churn folytatódik):                         │
│  - Várható beváltások: 245 (-23%)                                   │
│  - Várható bevétel: 367.500 Ft (-23%)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. RÉSZ: Gamification & Engagement Boosters

### 5.1 User Achievement System

Badge-ek és mérföldkövek:

```text
Badges:
🥇 "First Timer" - Első beváltás
🏃 "Streak Master" - 7 napos streak
🌟 "VIP" - 50+ beváltás
🔥 "On Fire" - 5 beváltás egy héten
🗺️ "Explorer" - 5+ különböző helyszín
🍺 "Beer Connoisseur" - 10 különböző sör
```

### 5.2 Leaderboard & Challenges

Heti kihívások:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🏆 HETI KIHÍVÁS                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Fedezd fel!" - Látogass meg 3 különböző helyszínt ezen a héten!  │
│                                                                     │
│  Jutalom: 100 bónusz pont                                           │
│  Résztvevők: 45 fő | Teljesítették: 12 fő                          │
│  Hátralévő idő: 3 nap                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Technikai Implementáció

### Új Edge Functions

| Funkció | Leírás |
|---------|--------|
| `analyze-user-behavior` | Viselkedési minták felismerése |
| `generate-user-story` | AI narratíva generálás |
| `get-user-predictions` | Következő akció előrejelzés |
| `get-similar-users` | Klaszter elemzés |
| `get-venue-cannibalization` | Helyszín átfedés térkép |
| `get-drink-affinity` | Ital affinitás mátrix |
| `run-what-if-scenario` | Szimuláció futtatás |

### Új UI Komponensek

| Komponens | Hely |
|-----------|------|
| `UserBehaviorStory` | UserDetail - Áttekintés tab |
| `BehaviorPatternBadges` | UserDetail - Áttekintés tab |
| `MicroMomentRadar` | Dashboard vagy Users oldal |
| `UserSimilarityCard` | UserDetail - új tab |
| `WhatIfSimulator` | Analytics vagy külön oldal |
| `VenueCannibalizationMap` | DataInsights - Venues tab |
| `DrinkAffinityMatrix` | DataInsights - Brands tab |
| `NextActionPredictor` | UserDetail - Áttekintés tab |
| `UserAchievements` | UserDetail - új tab |

### Adatbázis Bővítések

```sql
-- Viselkedési minták cache
CREATE TABLE user_behavior_patterns (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  patterns JSONB NOT NULL,
  cluster_id TEXT,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- Predikciók log
CREATE TABLE user_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  prediction_type TEXT NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  was_correct BOOLEAN
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  achievement_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);
```

---

## 7. Implementációs Prioritás

| Prioritás | Funkció | Komplexitás |
|-----------|---------|-------------|
| **P0** | User Behavior Story (AI narratíva) | Magas |
| **P0** | Viselkedési minta badge-ek | Közepes |
| **P1** | User Similarity Clustering | Magas |
| **P1** | Venue Cannibalization Map | Közepes |
| **P1** | Next Action Predictor | Magas |
| **P2** | What-If Scenario Simulator | Magas |
| **P2** | Drink Affinity Matrix | Közepes |
| **P2** | Micro-Moment Radar (real-time) | Magas |
| **P3** | Gamification (badges, challenges) | Közepes |
| **P3** | Revenue Forecasting | Magas |

---

## 8. Üzleti Érték Összefoglaló

| Feature | Venue Érték | Brand Érték |
|---------|-------------|-------------|
| User Behavior Story | Személyre szabott kampányok | N/A |
| Pattern Detection | Célzott marketing | Fogyasztói insight |
| Similarity Clustering | VIP program optimalizálás | Szegmens célzás |
| Venue Cannibalization | Versenytárs elemzés | Helyszín stratégia |
| Drink Affinity | Cross-sell lehetőségek | Bundle ajánlatok |
| Next Action Predictor | Proaktív engagement | Kampány időzítés |
| What-If Simulator | ROI előrejelzés | Budget optimalizálás |
| Gamification | User engagement +40% | Márka lojalitás |

---

## 9. Összefoglalás

A terv 4 fő pillérre épül:

1. **Viselkedéselemzés** - Nem csak adat, hanem **értelmezés** és **akció**
2. **Összehasonlítás** - User vs klaszter, Venue vs Venue, What-If
3. **Predikció** - Következő lépés előrejelzés, bevétel forecast
4. **Gamification** - Engagement növelés játékosítással

Ez a megközelítés a nyers adatokat **akcionálható üzleti intelligenciává** alakítja.
