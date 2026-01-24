

# Come Get It Hibrid Rendszer - Teljes Implementáció

## 1. Projekt Állapot Összefoglaló

### ✅ Ami KÉSZ

| Modul | Státusz | Fájlok |
|-------|---------|--------|
| QR Beváltás | 100% | `issue-redemption-token`, `consume-redemption-token` |
| Goorderz Webhook | 100% | `goorderz-webhook/index.ts` - SKU + pontgyűjtés |
| Match-Redemption-Transaction | 100% | `match-redemption-transaction/index.ts` |
| First Glass Analytics | 100% | `get-first-glass-analytics/index.ts` |
| Venue Integration Settings | 100% | `VenueIntegrationSettings.tsx` |
| FirstGlassWidget | 100% | `FirstGlassWidget.tsx` |
| Salt Edge DB Táblák | 100% | `saltedge_customers`, `saltedge_connections`, `saltedge_transactions` |

### ⚠️ Ami HIÁNYZIK

| Modul | Prioritás | Leírás |
|-------|-----------|--------|
| Salt Edge Webhook | P0 | Banki tranzakciók fogadása + merchant matching |
| Matching Trigger | P0 | Automatikus hívás redemption után |
| CSR Táblák | P1 | `charities`, `csr_donations` táblák |
| Owner Dashboard Integráció | P1 | FirstGlassWidget beépítése |
| SimplifiedROIWidget | P1 | Salt Edge venue-khoz |
| CSR Widget | P2 | Jótékonysági impact megjelenítés |

---

## 2. Implementációs Terv

### Fázis 1: Salt Edge Webhook Edge Function (P0)

**Új fájl:** `supabase/functions/saltedge-webhook/index.ts`

```text
┌─────────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│ Salt Edge API       │────>│ saltedge-webhook      │────>│ saltedge_        │
│ (transaction.create)│     │                       │     │ transactions     │
└─────────────────────┘     └───────────────────────┘     └──────────────────┘
                                       │
                                       ├──> Merchant Matching
                                       │
                                       ├──> Points Award (RPC)
                                       │
                                       └──> Redemption Matching (aszinkron)
```

**Fő funkciók:**
1. Webhook payload validálás (Salt Edge signature)
2. User azonosítás (connection → customer → user)
3. Merchant matching a `venues.merchant_match_rules` alapján
4. Pontok kalkulálása és jóváírása
5. Opcionális: redemption-transaction matching trigger

**Merchant Matching Logika:**
```typescript
async function findVenueByMerchant(
  transaction: { description: string; merchant_name?: string; mcc?: string },
  venues: VenueWithRules[]
): Promise<{ venueId: string; confidence: number } | null> {
  for (const venue of venues) {
    const rules = venue.merchant_match_rules;
    if (!rules) continue;

    const desc = transaction.description.toLowerCase();
    const mName = (transaction.merchant_name || "").toLowerCase();

    // 1. Pontos név (confidence: 1.0)
    if (rules.names?.some(n => mName.includes(n.toLowerCase()))) {
      return { venueId: venue.id, confidence: 1.0 };
    }

    // 2. Contains match (confidence: 0.9)
    if (rules.contains?.some(c => desc.includes(c.toLowerCase()))) {
      return { venueId: venue.id, confidence: 0.9 };
    }

    // 3. MCC match (confidence: 0.5)
    if (rules.mcc?.includes(transaction.mcc)) {
      return { venueId: venue.id, confidence: 0.5 };
    }
  }
  return null;
}
```

### Fázis 2: Automatikus Matching Trigger (P0)

**Módosítás:** `supabase/functions/consume-redemption-token/index.ts`

A redemption létrehozása után (227. sor körül) hozzáadjuk:

```typescript
// Trigger async matching (don't await)
if (redemption?.id) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  EdgeRuntime.waitUntil(
    fetch(`${supabaseUrl}/functions/v1/match-redemption-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ redemption_id: redemption.id })
    }).catch(err => console.error('Matching trigger failed:', err))
  );
}
```

### Fázis 3: CSR (Jótékonysági) Modul (P1)

**Új migráció:** `supabase/migrations/xxx_csr_tables.sql`

```sql
-- 1. Jótékonysági szervezetek
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_received_huf BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adományok (1 redemption = 1 donation)
CREATE TABLE IF NOT EXISTS public.csr_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID UNIQUE REFERENCES public.redemptions(id),
  user_id UUID REFERENCES auth.users(id),
  venue_id UUID REFERENCES public.venues(id),
  charity_id UUID REFERENCES public.charities(id),
  amount_huf INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Venues CSR mezők
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS csr_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_charity_id UUID REFERENCES public.charities(id),
  ADD COLUMN IF NOT EXISTS donation_per_redemption INTEGER DEFAULT 100;

-- RLS
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csr_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active charities" ON public.charities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage charities" ON public.charities
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view all donations" ON public.csr_donations
  FOR SELECT USING (is_admin());

CREATE POLICY "Venue owners can view their donations" ON public.csr_donations
  FOR SELECT USING (venue_id = ANY(get_user_venue_ids()));
```

### Fázis 4: Owner Dashboard Bővítés (P1)

**Módosítás:** `src/components/dashboard/OwnerDashboard.tsx`

1. Venue lekérdezés hozzáadása (user_id → venue_memberships → venues)
2. FirstGlassWidget beépítése (csak Goorderz venue-khoz)
3. SimplifiedROIWidget beépítése (Salt Edge venue-khoz)

```tsx
import { FirstGlassWidget } from './FirstGlassWidget';
import { SimplifiedROIWidget } from './SimplifiedROIWidget';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function OwnerDashboard() {
  // Venue lekérdezés
  const { data: userVenue } = useQuery({
    queryKey: ['user-primary-venue'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: membership } = await supabase
        .from('venue_memberships')
        .select('venue_id, venues(id, name, integration_type)')
        .eq('profile_id', user.id)
        .limit(1)
        .single();
        
      return membership?.venues;
    }
  });

  const isGoorderz = userVenue?.integration_type === 'goorderz';

  return (
    <div className="space-y-8">
      {/* ... existing KPI cards ... */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Existing trend chart */}
        
        {/* Conditional analytics widget */}
        {userVenue && isGoorderz && (
          <FirstGlassWidget venueId={userVenue.id} />
        )}
        
        {userVenue && !isGoorderz && (
          <SimplifiedROIWidget venueId={userVenue.id} />
        )}
      </div>
    </div>
  );
}
```

### Fázis 5: SimplifiedROIWidget (P1)

**Új fájl:** `src/components/dashboard/SimplifiedROIWidget.tsx`

Salt Edge venue-khoz készült egyszerűsített ROI widget:

```tsx
interface SimplifiedROIWidgetProps {
  venueId: string;
}

// Megjelenít:
// - Havi össz költés (saltedge_transactions alapján)
// - Beváltások száma
// - Egyszerű ROI (becsült free drink költség vs költés)
// - Match rate (párosított tranzakciók aránya)
// - "Upgrade to Goorderz" CTA részletesebb elemzéshez
```

**Vizuális felépítés:**
```text
┌────────────────────────────────────────────────────────────┐
│  💳 KÖLTÉSI STATISZTIKA                 [Salt Edge Badge] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ │
│  │ Össz költés    │ │ Beváltások     │ │ Match Rate     │ │
│  │ 245,000 Ft     │ │ 47 db          │ │ 72%            │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ │
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ROI Becslés                                            ││
│  │ [███████████████████░░░] 4.2x                          ││
│  │ Free drink költség: ~23,500 Ft                         ││
│  │ Generált bevétel: ~98,700 Ft (párosított)             ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 💡 Részletesebb elemzéshez                             ││
│  │ A Goorderz integráció SKU-szintű adatokat biztosít,   ││
│  │ így láthatod, mit rendelnek a vendégek az ingyen      ││
│  │ ital után (First Glass hatás).                        ││
│  │                                    [Tudj meg többet →]││
│  └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Fázis 6: CSR Widget (P2)

**Új fájl:** `src/components/dashboard/CSRWidget.tsx`

"Drink for a Cause" - Z generáció motivációja:

```text
┌────────────────────────────────────────────────────────────┐
│  🌱 KÖZÖSSÉGI HATÁS                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ "Ma is ittál egyet és segítettél!"                  │  │
│  │                                                     │  │
│  │ 47 beváltás × 100 Ft = 4,700 Ft adomány            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌───────────────────┐  ┌────────────────────────────────┐│
│  │ [Charity Logo]    │  │ Magyar Vöröskereszt           ││
│  │                   │  │                               ││
│  │                   │  │ Összesen: 127,400 Ft (2025)  ││
│  └───────────────────┘  └────────────────────────────────┘│
│                                                            │
│  [Részletek →]                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Érintett Fájlok

### Új Fájlok

| Fájl | Leírás |
|------|--------|
| `supabase/functions/saltedge-webhook/index.ts` | Salt Edge webhook handler |
| `supabase/migrations/xxx_csr_tables.sql` | CSR táblák (charities, csr_donations) |
| `src/components/dashboard/SimplifiedROIWidget.tsx` | Salt Edge ROI widget |
| `src/components/dashboard/CSRWidget.tsx` | Jótékonysági impact widget |

### Módosítandó Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/consume-redemption-token/index.ts` | Matching trigger hozzáadása |
| `src/components/dashboard/OwnerDashboard.tsx` | Widget integráció, venue lekérdezés |
| `src/integrations/supabase/types.ts` | CSR típusok hozzáadása |
| `src/lib/types.ts` | CSR interfészek |
| `supabase/config.toml` | saltedge-webhook regisztráció |

---

## 4. Technikai Részletek

### Salt Edge Webhook Payload (Várt Formátum)

```typescript
interface SaltEdgeWebhookPayload {
  data: {
    id: string;                    // Salt Edge transaction ID
    connection_id: string;         // Link to saltedge_connections
    account_id: string;
    made_on: string;               // ISO date
    amount: number;                // Negative for expenses
    currency_code: string;
    description: string;
    mode: string;                  // "normal"
    status: string;                // "posted"
    category: string;              // Salt Edge category
    extra: {
      merchant_id?: string;
      mcc?: string;
      original_amount?: number;
      original_currency_code?: string;
    };
  };
  meta: {
    version: string;
    time: string;
  };
}
```

### Pontszámítás Salt Edge-hez

A Salt Edge-nél nincs SKU adat, így egyszerűsített pontszámítás:

```typescript
// Base points: 1 pont / 100 HUF
const basePoints = Math.floor(Math.abs(transaction.amount) / 100);

// Csak spending_tier és time_bonus promóciók alkalmazhatók
// (category_multiplier, brand_bonus, combo_bonus NEM)
```

### TypeScript Típusok Bővítése

```typescript
// src/lib/types.ts
export interface Charity {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  is_active: boolean;
  total_received_huf: number;
  created_at: string;
}

export interface CSRDonation {
  id: string;
  redemption_id: string;
  user_id: string;
  venue_id: string;
  charity_id: string;
  amount_huf: number;
  created_at: string;
}

// Venue bővítés
export interface Venue {
  // ... existing fields ...
  csr_enabled?: boolean;
  default_charity_id?: string;
  donation_per_redemption?: number;
}
```

---

## 5. Implementációs Sorrend

| # | Feladat | Függőség | Idő |
|---|---------|----------|-----|
| 1 | Salt Edge Webhook Edge Function | - | 2-3 óra |
| 2 | Consume Token Matching Trigger | Salt Edge Webhook | 30 perc |
| 3 | SimplifiedROIWidget komponens | - | 1-2 óra |
| 4 | OwnerDashboard integráció | SimplifiedROIWidget | 1 óra |
| 5 | CSR Migráció | - | 30 perc |
| 6 | CSRWidget komponens | CSR Migráció | 1-2 óra |
| 7 | Types.ts frissítések | CSR Migráció | 30 perc |

**Összesen: ~7-10 óra**

---

## 6. Tesztelési Terv

### Salt Edge Webhook
1. Mock payload küldése az endpointra
2. Merchant matching ellenőrzése különböző szabályokkal
3. Pontok jóváírásának validálása

### Matching Trigger
1. Redemption létrehozása
2. Ellenőrzés, hogy a matching meghívódik-e
3. Match rekord létrejöttének validálása

### Dashboard Widgetek
1. Goorderz venue → FirstGlassWidget megjelenik
2. Salt Edge venue → SimplifiedROIWidget megjelenik
3. CSR enabled venue → CSRWidget megjelenik

