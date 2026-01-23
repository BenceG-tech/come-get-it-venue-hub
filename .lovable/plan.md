
# Teljes Fejlesztési Terv: 5 Fázis Implementáció

## Áttekintés

Ez a terv a "Come Get It" platform teljes körű továbbfejlesztését tartalmazza 5 fázisban, összesen 12-17 hét munkával.

---

## PHASE 1: QUICK WINS (1-2 hét)

### 1.1 Audit Logging - Admin Műveletek Naplózása

**Új tábla: `audit_logs`**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,                    -- Ki végezte
  actor_email TEXT,                          -- Email mentése olvashatóságért
  action TEXT NOT NULL,                      -- create, update, delete, login, export
  resource_type TEXT NOT NULL,               -- venue, user, promotion, notification
  resource_id UUID,                          -- Érintett rekord
  old_value JSONB,                           -- Változás előtti érték
  new_value JSONB,                           -- Változás utáni érték
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Új fájlok:**
- `src/lib/auditLogger.ts` - Frontend utility a műveletek naplózására
- `src/pages/AuditLog.tsx` - Új admin oldal az audit log megtekintésére
- `supabase/functions/log-audit-event/index.ts` - Edge function a naplózáshoz

**Módosítandó fájlok:**
- `src/App.tsx` - Új route: `/audit-log`
- `src/components/Sidebar.tsx` - Új menüpont

---

### 1.2 User Bulk Actions - Tömeges Műveletek

**Új komponens: `UserBulkActions.tsx`**

Funkciók:
- Checkbox minden user sorhoz
- "Összes kijelölése" gomb
- Tömeges műveletek dropdown:
  - **Export kiválasztottak (CSV)**
  - **Tag hozzáadása** (új `user_tags` tábla)
  - **Push értesítés küldése**
  - **Bónusz pont küldése**

**Új tábla: `user_tags`**
```sql
CREATE TABLE user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tag TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tag)
);
```

**Módosítandó fájlok:**
- `src/pages/Users.tsx` - Bulk selection és actions UI
- `src/lib/exportUtils.ts` - Kibővítés bulk exporthoz

---

### 1.3 Notification Analytics Dashboard

**Új komponens: `NotificationAnalyticsDashboard.tsx`**

Megjelenítendő metrikák:
- Elküldött értesítések száma (napi/heti/havi)
- Delivery rate (kézbesítési arány)
- Open rate (megnyitási arány)
- Click-through rate (átkattintási arány)
- Legjobban teljesítő sablonok
- Idősor grafikon a teljesítményről

**Új edge function: `get-notification-analytics`**
```typescript
// Aggregált statisztikák a notification_logs táblából
// Group by template_id, day
// Calculate: sent_count, delivered_count, opened_count, clicked_count
```

**Módosítandó fájlok:**
- `src/pages/Notifications.tsx` - Új "Statisztikák" tab hozzáadása

---

### 1.4 Automated Email Report Scheduling

**Új táblák:**
```sql
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,         -- weekly_summary, daily_redemptions, monthly_revenue
  recipient_emails TEXT[] NOT NULL,
  venue_ids UUID[],                  -- NULL = all venues
  schedule_cron TEXT NOT NULL,       -- "0 8 * * 1" (hétfő 8:00)
  timezone TEXT DEFAULT 'Europe/Budapest',
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES report_schedules(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  recipient_count INTEGER,
  status TEXT,
  error_message TEXT
);
```

**Új fájlok:**
- `src/pages/ReportScheduler.tsx` - UI a jelentések ütemezéséhez
- `src/components/ReportScheduleFormModal.tsx` - Form modal
- `supabase/functions/send-scheduled-report/index.ts` - Email küldés

**Technikai megjegyzés:** A Supabase pg_cron használható az időzített futtatáshoz, vagy külső szolgáltatás (pl. Inngest, Trigger.dev).

---

### 1.5 GDPR Data Export Endpoint

**Új edge function: `export-user-data`**

Exportálandó adatok:
- `profiles` - Felhasználói profil
- `user_points` - Pont egyenleg és history
- `redemptions` - Beváltások
- `reward_redemptions` - Jutalom beváltások
- `notification_logs` - Értesítések
- `user_activity_logs` - Aktivitás napló
- `linked_cards` - Linkelt kártyák (maszkolva)

**Output:** JSON fájl letöltése

**Új komponens:** 
- `src/components/user/GDPRExportButton.tsx` - UserDetail oldalra

---

## PHASE 2: ANALYTICS ENHANCEMENT (2-3 hét)

### 2.1 Cohort Analysis Dashboard

**Koncepció:** Felhasználók csoportosítása regisztráció hete szerint, retention mérése

**Új edge function: `get-cohort-analysis`**
```typescript
interface CohortData {
  cohort_week: string;           // "2025-W03"
  cohort_size: number;           // Regisztráltak száma
  retention: number[];           // [100, 80, 65, 55, ...] - % hetente
}
```

**Új komponens: `CohortAnalysisChart.tsx`**
- Hőtérkép vizualizáció
- X tengely: Hetek a regisztráció óta
- Y tengely: Kohort hetek
- Szín: Retention %

**Módosítandó fájlok:**
- `src/pages/Analytics.tsx` - Új "Kohort" tab

---

### 2.2 Funnel Visualization Component

**Koncepció:** User journey vizualizáció: App megnyitás → Venue megtekintés → QR generálás → Beváltás

**Új edge function: `get-funnel-analytics`**
```typescript
interface FunnelStep {
  step_name: string;
  count: number;
  conversion_rate: number;  // vs előző lépés
  drop_off_rate: number;
}
```

**Új komponens: `FunnelVisualization.tsx`**
- Tölcsér alakú diagram
- Lépésenkénti konverziós ráták
- Időszak szűrő (7 nap, 30 nap, 90 nap)

---

### 2.3 Revenue Attribution Tracking

**Koncepció:** Melyik promóció/kampány hozza a legtöbb bevételt?

**Új edge function: `get-revenue-attribution`**

Számítások:
- Promóció → POS tranzakciók összekapcsolása
- ROI számítás: bevétel / promóció költség
- Top 10 leghatékonyabb promóció

**Új komponens: `RevenueAttributionTable.tsx`**

---

### 2.4 A/B Testing Framework

**Új táblák:**
```sql
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  test_type TEXT NOT NULL,           -- notification, promotion, ui_variant
  variant_a JSONB NOT NULL,          -- Kontroll csoport
  variant_b JSONB NOT NULL,          -- Teszt csoport
  split_ratio NUMERIC DEFAULT 0.5,   -- 50-50
  metric_type TEXT NOT NULL,         -- open_rate, redemption_rate, spend
  status TEXT DEFAULT 'draft',       -- draft, running, completed
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner_variant TEXT,
  statistical_significance NUMERIC,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id),
  user_id UUID NOT NULL,
  variant TEXT NOT NULL,             -- 'A' or 'B'
  assigned_at TIMESTAMPTZ DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  UNIQUE(test_id, user_id)
);
```

**Új fájlok:**
- `src/pages/ABTests.tsx` - A/B tesztek listája
- `src/components/ABTestFormModal.tsx` - Teszt létrehozás
- `src/components/ABTestResults.tsx` - Eredmények vizualizáció
- `supabase/functions/assign-ab-variant/index.ts` - Variant hozzárendelés

---

### 2.5 Seasonal Trend Detection

**Új edge function: `get-seasonal-trends`**

Számítások:
- Hónap/hét összehasonlítás előző évvel (ha van adat)
- Nap-típus elemzés (hétköznap vs hétvége)
- Ünnepek/események hatása
- Időjárás korreláció (opcionális, külső API)

**Új komponens: `SeasonalTrendsChart.tsx`**
- Year-over-year összehasonlítás
- Heti/napi mintázatok
- Anomália kiemelés

---

## PHASE 3: ENGAGEMENT BOOST (3-4 hét)

### 3.1 Smart Notification Scheduling (ML-based)

**Koncepció:** Minden usernek személyre szabott optimális push időpont

**Új edge function: `get-optimal-push-time`**

Algoritmus (heurisztikus, nem igazi ML):
```typescript
function calculateOptimalPushTime(userId: string): PushTiming {
  // 1. User activity heatmap elemzése
  // 2. Legjobb napok/órák meghatározása
  // 3. Notification open history elemzése
  // 4. Churn risk figyelembevétele
  return {
    best_day: 'Friday',
    best_hour: 14,
    confidence: 0.85,
    reasoning: 'Legmagasabb app megnyitási arány'
  };
}
```

**Módosítandó fájlok:**
- `supabase/functions/send-user-notification/index.ts` - Smart scheduling opció

---

### 3.2 Geofence-triggered Notifications

**Új táblák:**
```sql
CREATE TABLE geofence_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id),
  radius_meters INTEGER DEFAULT 500,
  notification_template_id UUID,
  min_dwell_minutes INTEGER DEFAULT 5,
  cooldown_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  venue_id UUID NOT NULL,
  trigger_id UUID REFERENCES geofence_triggers(id),
  entered_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Új edge function: `process-geofence-event`**
- Mobilról kapott lokációs esemény feldolgozása
- Szabályok ellenőrzése
- Push küldés ha teljesül

**Dokumentáció:** RORK mobilappnak API leírás

---

### 3.3 Apple/Google Wallet Pass Generation

**Új edge function: `generate-wallet-pass`**

Implementáció:
- Apple Wallet: `.pkpass` generálás (JSON + aláírás)
- Google Wallet: JWT token Google Pay API-hoz

**Szükséges secrets:**
- `APPLE_PASS_TYPE_ID`
- `APPLE_TEAM_ID`
- `APPLE_PASS_CERTIFICATE` (base64)
- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_PRIVATE_KEY`

**Új komponens:**
- `src/components/WalletPassButton.tsx` - Consumer app-hoz

---

### 3.4 In-App Rich Messaging

**Új táblák:**
```sql
CREATE TABLE in_app_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  cta_text TEXT,
  cta_deep_link TEXT,
  targeting JSONB,
  display_type TEXT,              -- banner, modal, full_screen
  priority INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE in_app_message_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES in_app_messages(id),
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  clicked BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false
);
```

**Új edge function: `get-in-app-messages`**
- Releváns üzenetek lekérése user számára

---

### 3.5 Gamification Expansion

**Új táblák:**
```sql
CREATE TABLE achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,                     -- explorer, spender, loyal, social
  criteria JSONB NOT NULL,           -- { type: 'redemption_count', value: 10 }
  points_reward INTEGER DEFAULT 0,
  badge_image_url TEXT,
  is_hidden BOOLEAN DEFAULT false,   -- Secret achievements
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period TEXT NOT NULL,              -- 'weekly', 'monthly', 'all_time'
  period_start DATE NOT NULL,
  points_earned INTEGER DEFAULT 0,
  redemption_count INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period, period_start)
);
```

**Új fájlok:**
- `src/pages/Achievements.tsx` - Admin: achievement-ek kezelése
- `supabase/functions/check-achievements/index.ts` - Achievement ellenőrzés
- `supabase/functions/update-leaderboard/index.ts` - Ranglista frissítés

---

## PHASE 4: SCALE & SECURITY (2-3 hét)

### 4.1 Edge Function Caching Layer

**Implementáció:**
- Supabase Edge Functions + KV store (vagy in-memory cache)
- Cache keys: user_id + function_name
- TTL: 5-60 perc (funkciótól függően)

**Módosítandó edge functions:**
- `get-user-stats-extended` - 5 perc cache
- `get-dashboard-stats` - 2 perc cache
- `get-public-venues` - 10 perc cache

**Minta implementáció:**
```typescript
const CACHE = new Map<string, { data: any; expires: number }>();

async function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = CACHE.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  const data = await fetcher();
  CACHE.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}
```

---

### 4.2 Background Job Queue

**Opciók:**
1. **Supabase pg_cron** - Egyszerű ütemezett feladatok
2. **Inngest** - Komplex workflow-k
3. **Custom queue tábla** - `job_queue` tábla + worker edge function

**Job típusok:**
- Napi report küldés
- Heti leaderboard frissítés
- Achievement ellenőrzés
- Expired token cleanup
- Platform snapshot generálás

**Új tábla (ha custom queue):**
```sql
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 4.3 Two-Factor Authentication

**Implementáció Supabase Auth-tal:**
- TOTP (Time-based One-Time Password)
- Authenticator app support (Google Authenticator, Authy)

**Új fájlok:**
- `src/components/TwoFactorSetup.tsx` - QR kód generálás
- `src/components/TwoFactorVerify.tsx` - Kód bevitel
- `src/pages/SecuritySettings.tsx` - Biztonsági beállítások

**Módosítandó:**
- `src/pages/Login.tsx` - 2FA flow hozzáadása

---

### 4.4 Database Performance Audit

**Indexek hozzáadása:**
```sql
-- Gyakori lekérdezésekhez
CREATE INDEX idx_redemptions_user_venue ON redemptions(user_id, venue_id);
CREATE INDEX idx_redemptions_redeemed_at ON redemptions(redeemed_at DESC);
CREATE INDEX idx_user_activity_user_type ON user_activity_logs(user_id, event_type);
CREATE INDEX idx_points_transactions_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX idx_notification_logs_user ON notification_logs(user_id, sent_at DESC);
```

**RLS policy optimalizáció:**
- Felesleges policy-k eltávolítása
- Query plan elemzés

---

### 4.5 API Rate Limiting Infrastructure

**Új tábla:**
```sql
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,          -- IP address vagy API key
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);
```

**Rate limit szabályok:**
- Public endpoints: 100 req/perc/IP
- Authenticated endpoints: 1000 req/perc/user
- Webhooks: 10 req/másodperc/IP

**Implementáció:** Middleware a kritikus edge functions-ben

---

## PHASE 5: INTEGRATIONS (3-4 hét)

### 5.1 Stripe Payment Integration

**Szükséges secret:** `STRIPE_SECRET_KEY`

**Új táblák:**
```sql
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'HUF',
  product_type TEXT,                  -- points_bundle, premium_subscription
  product_config JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Új edge functions:**
- `create-checkout-session` - Stripe checkout indítás
- `stripe-webhook` - Payment events feldolgozása

**Használati esetek:**
- Pont vásárlás
- Premium előfizetés venue-knak

---

### 5.2 Social Media Ad Attribution

**Koncepció:** UTM paraméterek követése, konverzió mérés

**Új tábla:**
```sql
CREATE TABLE attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_page TEXT,
  converted BOOLEAN DEFAULT false,
  conversion_type TEXT,
  conversion_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Új edge function: `log-attribution`**

---

### 5.3 CRM Export Connectors

**Támogatott platformok:**
- HubSpot
- Salesforce (opcionális)
- CSV export

**Új edge function: `export-to-crm`**

**HubSpot integráció:**
```typescript
// Contact szinkronizálás
await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${HUBSPOT_API_KEY}` },
  body: JSON.stringify({
    properties: {
      email: user.email,
      firstname: user.name.split(' ')[0],
      cgi_points: user.points_balance,
      cgi_redemptions: user.total_redemptions,
      cgi_ltv: user.ltv
    }
  })
});
```

**Szükséges secret:** `HUBSPOT_API_KEY`

---

### 5.4 Slack/Discord Alert Integration

**Új táblák:**
```sql
CREATE TABLE alert_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL,        -- slack, discord, email
  webhook_url TEXT,
  alert_types TEXT[],                -- anomaly, milestone, daily_summary
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Új edge function: `send-alert`**

**Alert típusok:**
- Anomália detektálva
- Napi summary
- Milestone elérve
- Cap kimerült

---

### 5.5 Calendar Integration for Venue Hours

**Koncepció:** Google Calendar / iCal integráció a nyitvatartáshoz

**Új edge function: `sync-venue-calendar`**
- iCal feed generálás venue-hoz
- Google Calendar API import

**Új komponens:**
- `src/components/VenueCalendarSync.tsx`

---

## Összesítés

| Fázis | Időtartam | Új Táblák | Új Edge Functions | Új Komponensek |
|-------|-----------|-----------|-------------------|----------------|
| Phase 1 | 1-2 hét | 4 | 3 | 8 |
| Phase 2 | 2-3 hét | 2 | 5 | 6 |
| Phase 3 | 3-4 hét | 6 | 5 | 5 |
| Phase 4 | 2-3 hét | 2 | 2 | 3 |
| Phase 5 | 3-4 hét | 4 | 5 | 3 |
| **Összesen** | **11-16 hét** | **18** | **20** | **25** |

---

## Prioritási Javaslat

**Azonnali implementáció (Phase 1):**
1. Audit logging - Biztonsági szempontból kritikus
2. GDPR export - Jogi megfelelőség
3. Notification analytics - Meglévő funkció bővítése

**Magas prioritás (Phase 2-3):**
4. Cohort analysis - Üzleti döntéstámogatás
5. A/B testing - Optimalizáció alapja
6. Smart notifications - Engagement növelés

**Közepes prioritás (Phase 4):**
7. 2FA - Security
8. Database indexes - Performance

**Alacsonyabb prioritás (Phase 5):**
9. Stripe - Ha van üzleti igény
10. CRM export - Enterprise feature
