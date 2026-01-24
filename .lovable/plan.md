
# Come Get It Platform - Teljes Architektúra Audit & Fejlesztési Terv

## EXECUTIVE SUMMARY

A Come Get It platform az alábbi állapotban van:
- **85% kész** az alapvető funkciók terén (QR beváltás, pontrendszer, admin dashboard)
- **60% kész** a hibrid integráció (Goorderz működik, Salt Edge mock adat)
- **30% kész** az analitika modul ("First Glass" elemzés hiányzik)
- **Kritikus hiányosság**: Nincs venue típus megkülönböztetés (Goorderz vs Salt Edge)

---

## 1. JELENLEGI ÁLLAPOT - AMI MŰKÖDIK

### 1.1 QR Kód Alapú Beváltás (100% KÉSZ)

```text
┌─────────────┐     ┌────────────────────┐     ┌─────────────┐
│ Fogyasztó   │────>│ issue-redemption   │────>│ redemption  │
│ (Mobile App)│     │ -token             │     │ _tokens     │
└─────────────┘     └────────────────────┘     └─────────────┘
                              │
                              v
┌─────────────┐     ┌────────────────────┐     ┌─────────────┐
│ Staff       │────>│ consume-redemption │────>│ redemptions │
│ (POS/Admin) │     │ -token             │     │ (record)    │
└─────────────┘     └────────────────────┘     └─────────────┘
```

**Működő funkciók:**
- Token generálás (SHA-256 hash, `CGI-XXXXXX-xxx...` formátum)
- Free drink window validálás (napok + időablak)
- Device fingerprint rate limiting
- Token fogyasztás staff által
- Redemption rekord létrehozása

### 1.2 Goorderz POS Integráció (80% KÉSZ)

**Működő webhook:** `goorderz-webhook/index.ts`
- HMAC signature verification
- SKU-szintű tétel adatok (`GoorderzItem[]`)
- Promotion engine (category_multiplier, brand_bonus, time_bonus, spending_tier, combo_bonus)
- Pontgyűjtés (`modify_user_points` RPC)
- `pos_transactions` tábla rögzítés

**Hiányzik:**
- Venue mapping tábla (jelenleg `venue_id = transaction.venue_external_id`)
- External ID config a venues táblában

### 1.3 Admin Dashboard (75% KÉSZ)

**Létező dashboard-ok:**
| Dashboard | Státusz | Megjegyzés |
|-----------|---------|------------|
| AdminDashboard | Működik | Platform-szintű KPI-k |
| OwnerDashboard | Működik | Venue-specifikus trend, top italok |
| StaffDashboard | Működik | Mai beváltások, cap kihasználtság |
| BrandDashboard | Placeholder | Csak mock adatok |

### 1.4 Salt Edge Integráció (40% KÉSZ - MOCK)

**Létező komponensek:**
- `SaltEdgeTransactions.tsx` - UI oldal (MOCK adatokkal)
- `MerchantMatchRulesManager.tsx` - Merchant szabályok beállítása
- `saltedge_customers`, `saltedge_connections` táblák
- `merchant_match_rules` JSONB mező a `venues` táblában

**HIÁNYZIK:**
- Salt Edge webhook endpoint
- Tranzakció párosítási logika
- `saltedge_transactions` tábla feltöltése
- Valós API integráció

---

## 2. HIÁNYZÓ KRITIKUS FUNKCIÓK

### 2.1 Venue Típus Megkülönböztetés (NINCS!)

**Probléma:** Jelenleg nincs mód megkülönböztetni a Goorderz (deep) és Salt Edge (shallow) partnereket.

**Szükséges adatbázis módosítás:**
```sql
ALTER TABLE venues ADD COLUMN integration_type TEXT 
  CHECK (integration_type IN ('goorderz', 'saltedge', 'manual', 'none'))
  DEFAULT 'none';

ALTER TABLE venues ADD COLUMN goorderz_config JSONB DEFAULT '{}';
-- { "external_venue_id": "GZ-12345", "api_key": "xxx", "webhook_enabled": true }

ALTER TABLE venues ADD COLUMN saltedge_config JSONB DEFAULT '{}';
-- { "connection_id": "SE-xxxxx", "auto_match": true }
```

### 2.2 QR Beváltás + POS Tranzakció Összekapcsolás (NINCS!)

**Probléma:** A QR beváltás és a kártyás fizetés két külön esemény - nincs kapcsolat közöttük.

**Megoldás - Időablak alapú párosítás:**
```sql
CREATE TABLE redemption_transaction_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID REFERENCES redemptions(id),
  transaction_id UUID REFERENCES pos_transactions(id),
  match_confidence NUMERIC(3,2), -- 0.0 - 1.0
  match_method TEXT, -- 'time_window', 'qr_token', 'user_id'
  time_delta_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Párosítási logika (Edge Function):
-- 1. Ugyanaz a user_id + venue_id
-- 2. POS tranzakció 5-120 perccel a QR beváltás UTÁN
-- 3. Confidence score: 1.0 ha <15 perc, 0.8 ha <30 perc, 0.5 ha <120 perc
```

### 2.3 "First Glass" Hatás Elemzés (NINCS!)

**Cél:** Kimutatni, hogy az ingyen ital után mit rendel a vendég.

**Szükséges edge function: `get-first-glass-analytics`**

```typescript
// Input: venue_id, date_range
// Output:
{
  "total_free_drinks": 450,
  "total_matched_transactions": 312,  // 69% match rate
  "average_subsequent_spend": 3240,   // HUF
  "top_second_orders": [
    { "category": "Craft Beer", "count": 89, "avg_price": 1800 },
    { "category": "Cocktails", "count": 67, "avg_price": 2500 },
    { "category": "Food", "count": 54, "avg_price": 4200 }
  ],
  "upsell_rate": 0.42,  // 42% rendel még valamit
  "avg_time_to_second_order": 23  // percben
}
```

---

## 3. FRONTEND DASHBOARD TERVEZÉS - VENUE OWNER

### 3.1 Főoldal Widgetek (Módosított)

```text
┌────────────────────────────────────────────────────────────────┐
│  HELYSZÍN DASHBOARD - [Venue Name]           [Goorderz Badge] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│  │ Mai QR       │ │ Free Drink   │ │ Extra        │ │ ROI    ││
│  │ Beváltások   │ │ Költség      │ │ Bevétel      │ │        ││
│  │    47        │ │   23,500 Ft  │ │   78,400 Ft  │ │ 3.3x   ││
│  │    ▲ +12%    │ │              │ │   ▲ +18%     │ │        ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘│
│                                                                │
│  ┌─────────────────────────────────┐ ┌────────────────────────┐│
│  │ FIRST GLASS HATÁS              │ │ TOP UPSELL KATEGÓRIÁK  ││
│  │                                 │ │                        ││
│  │ [===========] 69% match rate   │ │ 1. Craft Beer  (89 db) ││
│  │                                 │ │ 2. Cocktails   (67 db) ││
│  │ Átlag +3,240 Ft / vendég       │ │ 3. Étel        (54 db) ││
│  │ Átlag 23 perc a 2. rendelésig  │ │                        ││
│  └─────────────────────────────────┘ └────────────────────────┘│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ NAPI ITAL BEÁLLÍTÁS                    [Szerkesztés]     │ │
│  │                                                          │ │
│  │ Aktív ital: Peroni Nastro Azzurro                        │ │
│  │ Időablak: 14:00 - 18:00 (H-P)                            │ │
│  │ Mai beváltás: 47 / 100 (cap)                             │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Integráció Típus Alapú UI

**Goorderz Partner Dashboard (Deep Integration):**
- Teljes SKU-szintű elemzés
- "First Glass" analitika widget
- Kategória breakdown chart
- Upsell rate metrika
- Kosár kompozíció elemzés

**Salt Edge Partner Dashboard (Shallow Integration):**
- Összesített költési statisztika
- Tranzakció darabszám
- Egyszerűsített ROI (free drink érték vs total spend)
- Merchant match konfiguráció panel
- "Upgrade to Goorderz" CTA

---

## 4. BACKEND ARCHITEKTÚRA TERV

### 4.1 Új Edge Functions

| Function | Leírás |
|----------|--------|
| `saltedge-webhook` | Salt Edge tranzakció beérkezés + merchant matching |
| `match-redemption-transaction` | QR beváltás + POS tranzakció párosítás |
| `get-first-glass-analytics` | "First Glass" hatás elemzése |
| `get-venue-integration-status` | Venue integráció típus és státusz |

### 4.2 Adatbázis Módosítások

```sql
-- 1. Venue integráció típus
ALTER TABLE venues 
  ADD COLUMN integration_type TEXT DEFAULT 'none',
  ADD COLUMN goorderz_external_id TEXT,
  ADD COLUMN saltedge_connection_id TEXT;

-- 2. Redemption-Transaction párosítás
CREATE TABLE redemption_transaction_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID NOT NULL REFERENCES redemptions(id),
  transaction_id UUID REFERENCES pos_transactions(id),
  saltedge_transaction_id UUID REFERENCES saltedge_transactions(id),
  match_confidence NUMERIC(3,2) DEFAULT 0,
  match_method TEXT,
  time_delta_seconds INTEGER,
  matched_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Salt Edge tranzakciók (már létezik, de bővítendő)
ALTER TABLE saltedge_transactions 
  ADD COLUMN match_status TEXT DEFAULT 'pending',
  ADD COLUMN matched_venue_id UUID REFERENCES venues(id),
  ADD COLUMN points_awarded INTEGER DEFAULT 0;
```

### 4.3 QR + Tranzakció Párosítási Algoritmus

```typescript
// Edge function: match-redemption-transaction

async function matchRedemptionToTransaction(redemptionId: string) {
  const redemption = await getRedemption(redemptionId);
  
  // 1. Venue integráció típus ellenőrzés
  const venue = await getVenue(redemption.venue_id);
  
  if (venue.integration_type === 'goorderz') {
    // POS tranzakció keresés
    const transactions = await findPosTransactions({
      venue_id: redemption.venue_id,
      user_id: redemption.user_id,
      after: redemption.redeemed_at,
      before: addMinutes(redemption.redeemed_at, 120)
    });
    
    if (transactions.length > 0) {
      // Legközelebbi időpontú tranzakció
      const closest = transactions[0];
      const timeDelta = differenceInSeconds(closest.transaction_time, redemption.redeemed_at);
      const confidence = calculateConfidence(timeDelta);
      
      await createMatch({
        redemption_id: redemptionId,
        transaction_id: closest.id,
        match_confidence: confidence,
        match_method: 'time_window',
        time_delta_seconds: timeDelta
      });
    }
  } else if (venue.integration_type === 'saltedge') {
    // Banki tranzakció keresés (ha van)
    // Csak összeg alapú párosítás lehetséges
  }
}

function calculateConfidence(timeDeltaSeconds: number): number {
  if (timeDeltaSeconds < 900) return 1.0;   // < 15 perc
  if (timeDeltaSeconds < 1800) return 0.8;  // < 30 perc
  if (timeDeltaSeconds < 3600) return 0.6;  // < 60 perc
  return 0.4;  // < 120 perc
}
```

---

## 5. TECHNOLÓGIAI STACK ÖSSZEFOGLALÓ

### 5.1 Meglévő Stack (Változatlan)

| Réteg | Technológia |
|-------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| State | React Query (TanStack) |
| Routing | React Router v6 |
| Charts | Recharts |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (venue-images) |

### 5.2 Szükséges Kiegészítések

| Funkció | Technológia |
|---------|-------------|
| Salt Edge API | Salt Edge Connect API v5 |
| Merchant Matching | PostgreSQL Full-Text Search + Trigram |
| Időzóna kezelés | date-fns-tz |
| Scheduling | Supabase pg_cron |

---

## 6. ADMIN FELÜLET MENÜSTRUKTÚRA

### 6.1 CGI Admin (Platform Admin)

```text
📊 Dashboard
├── Platform Overview
├── Command Center (real-time)
└── Anomaly Alerts

👥 Felhasználók
├── User List
├── User Detail
├── Bulk Actions
└── Tags Management

🏪 Helyszínek
├── Venues List
├── Venue Detail
├── Venue Comparison
└── Integration Status (ÚJ)

🎁 Jutalmak & Promóciók
├── Rewards
└── Promotions

📈 Analitika
├── Analytics (heatmap, trends)
├── Data Insights
└── First Glass Report (ÚJ)

💳 Tranzakciók
├── POS Transactions (Goorderz)
├── Bank Transactions (Salt Edge)
└── Redemption Matches (ÚJ)

🏷️ Márkák
└── Brands Management

⚙️ Beállítások
├── Settings
├── Audit Log
└── Notifications
```

### 6.2 Venue Owner

```text
📊 Dashboard
├── Today's Stats
├── Free Drink ROI
└── First Glass Impact (ÚJ - csak Goorderz)

📋 Beváltások
└── Redemptions List

📈 Analitika
├── Weekly Trends
├── Top Drinks
└── Customer Insights

🍺 Napi Ital Beállítás
├── Current Selection
├── Schedule
└── Cap Management

⚙️ Beállítások
├── Venue Profile
├── Staff Management
└── Integration Settings (ÚJ)
```

---

## 7. IMPLEMENTÁCIÓS ÜTEMTERV

### Fázis 1: Adatbázis & Venue Típus (1-2 nap)
1. `integration_type` mező hozzáadása
2. Venue form bővítése integráció típus választóval
3. Dashboard komponensek feltételes renderelése

### Fázis 2: Redemption-Transaction Matching (2-3 nap)
1. `redemption_transaction_matches` tábla
2. `match-redemption-transaction` Edge Function
3. Automatikus trigger a Goorderz webhook-ban

### Fázis 3: First Glass Analytics (2-3 nap)
1. `get-first-glass-analytics` Edge Function
2. FirstGlassWidget komponens
3. Venue Owner dashboard integráció

### Fázis 4: Salt Edge Live Integráció (3-5 nap)
1. `saltedge-webhook` Edge Function
2. Merchant matching algoritmus
3. Salt Edge transactions page valós adatokkal

### Fázis 5: Dashboard UI Finomhangolás (2-3 nap)
1. Integráció-specifikus widgetek
2. ROI kalkulátor javítás
3. Mobile optimalizálás

**Összesen: ~12-16 nap**

---

## 8. KÖVETKEZŐ LÉPÉSEK (PRIORITÁS SORREND)

1. **[P0]** Venue `integration_type` mező hozzáadása - ez minden más alapja
2. **[P0]** Redemption-Transaction matching logika implementálása
3. **[P1]** First Glass analytics Edge Function és widget
4. **[P1]** Salt Edge webhook endpoint (ha van API hozzáférés)
5. **[P2]** Dashboard widgetek integráció-típus alapú megjelenítés
6. **[P2]** ROI kalkulátor pontosítása
