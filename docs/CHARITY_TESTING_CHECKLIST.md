# Charity System - Testing Checklist

**Created:** 2026-01-25
**Purpose:** End-to-end testing guide for the Come Get It charity/CSR system

---

## Pre-Deployment Checklist

Before deploying to production, ensure all items are ✅ verified.

### 1. Database Migration

- [ ] Run migration `20260125000000_charity_system.sql` on staging/dev environment
- [ ] Verify tables created:
  - [ ] `charity_partners` exists with 4 default partners
  - [ ] `charity_donations` exists
  - [ ] `user_csr_stats` exists
- [ ] Verify views created:
  - [ ] `charity_impact_summary` returns data
- [ ] Verify functions created:
  - [ ] `update_user_csr_stats()` callable
  - [ ] `calculate_csr_leaderboard()` callable
- [ ] Verify RLS policies active:
  - [ ] `charity_partners`: Public can SELECT active, admins can ALL
  - [ ] `charity_donations`: Users see own, admins see all, service role full access
  - [ ] `user_csr_stats`: Users see own, admins see all

**SQL Test:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('charity_partners', 'charity_donations', 'user_csr_stats');

-- Check default charity partners
SELECT name, impact_unit, huf_per_unit FROM charity_partners WHERE is_active = true;

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('charity_partners', 'charity_donations', 'user_csr_stats');
```

---

### 2. Edge Functions Deployment

- [ ] Deploy `get-user-csr-impact` function
  - [ ] Verify JWT auth works (401 if no token)
  - [ ] Verify returns correct schema
- [ ] Verify `consume-redemption-token` updated
  - [ ] Response includes `charity_impact` field
- [ ] Verify `goorderz-webhook` updated
  - [ ] Response includes `charity_impact` field
- [ ] Add functions to `supabase/config.toml`
  - [ ] `[functions.get-user-csr-impact]` entry exists

**Manual Test:**
```bash
# Test get-user-csr-impact
curl -X GET https://YOUR_PROJECT.supabase.co/functions/v1/get-user-csr-impact \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return 200 with stats object
```

---

### 3. TypeScript Types

- [ ] `src/integrations/supabase/types.ts` updated
  - [ ] `charity_donations` table types added
  - [ ] `charity_partners` table types added
  - [ ] `user_csr_stats` table types added
  - [ ] `charity_impact_summary` view types added
  - [ ] `update_user_csr_stats` function types added
- [ ] No TypeScript compilation errors
- [ ] Run `npm run build` successfully

---

### 4. Admin UI

- [ ] `/charity-impact` route added to `App.tsx`
- [ ] "Jótékonysági Hatás" menu item in Sidebar
- [ ] CharityImpact page renders without errors
- [ ] Page accessible only to admins (`cgi_admin` role)

---

## Functional Testing

### Test Case 1: Free Drink Redemption with Charity

**Setup:**
1. Create test user via Supabase Auth
2. Create test venue with free drinks configured
3. Ensure charity partner "Magyar Élelmiszerbank" is active

**Steps:**
1. Issue redemption token for test user (via mobile app or edge function)
2. Consume token via POS or admin panel
3. Check redemption response includes `charity_impact`
4. Query `charity_donations` table for new record
5. Query `user_csr_stats` for updated stats
6. Call `get-user-csr-impact` endpoint

**Expected Results:**
- [ ] Redemption succeeds with 200 OK
- [ ] Response contains:
  ```json
  {
    "charity_impact": {
      "donation_huf": 100,
      "impact_description": "1 adag étel",
      "charity_name": "Magyar Élelmiszerbank Egyesület"
    }
  }
  ```
- [ ] `charity_donations` table has 1 new row:
  - `user_id` = test user ID
  - `total_donation_huf` = 100
  - `platform_contribution_huf` = 50
  - `venue_contribution_huf` = 50
  - `impact_units` = 1
- [ ] `user_csr_stats` table updated:
  - `total_donations_huf` = 100
  - `total_impact_units` = 1
  - `current_streak_days` = 1
- [ ] `get-user-csr-impact` returns:
  ```json
  {
    "stats": {
      "total_donations_huf": 100,
      "total_impact_units": 1,
      "current_streak_days": 1
    }
  }
  ```

**SQL Verification:**
```sql
-- Check charity donation created
SELECT * FROM charity_donations WHERE user_id = 'TEST_USER_ID' ORDER BY created_at DESC LIMIT 1;

-- Check user CSR stats
SELECT * FROM user_csr_stats WHERE user_id = 'TEST_USER_ID';
```

---

### Test Case 2: Streak Logic

**Setup:**
Test user with existing CSR stats

**Steps:**
1. Day 1: Redeem drink → Check streak = 1
2. Day 2: Redeem drink → Check streak = 2
3. Day 3: No redemption (skip)
4. Day 4: Redeem drink → Check streak resets to 1

**Expected Results:**
- [ ] Day 1: `current_streak_days` = 1
- [ ] Day 2: `current_streak_days` = 2, `longest_streak_days` = 2
- [ ] Day 4: `current_streak_days` = 1, `longest_streak_days` = 2 (preserved)

**Manual Test (SQL):**
```sql
-- Simulate Day 1 donation
SELECT update_user_csr_stats('TEST_USER_ID', 100, 1, '2026-01-23');
SELECT current_streak_days FROM user_csr_stats WHERE user_id = 'TEST_USER_ID'; -- Should be 1

-- Simulate Day 2 donation
SELECT update_user_csr_stats('TEST_USER_ID', 100, 1, '2026-01-24');
SELECT current_streak_days FROM user_csr_stats WHERE user_id = 'TEST_USER_ID'; -- Should be 2

-- Simulate Day 4 donation (Day 3 skipped)
SELECT update_user_csr_stats('TEST_USER_ID', 100, 1, '2026-01-26');
SELECT current_streak_days, longest_streak_days FROM user_csr_stats WHERE user_id = 'TEST_USER_ID';
-- current_streak_days = 1, longest_streak_days = 2
```

---

### Test Case 3: Goorderz POS Purchase with Charity

**Setup:**
1. Test user with QR token
2. Goorderz webhook secret configured

**Steps:**
1. Simulate Goorderz webhook POST with valid signature
2. Include `customer_token` (user's QR hash) in payload
3. Check response includes `charity_impact`
4. Verify charity donation created
5. Verify user CSR stats updated

**Expected Results:**
- [ ] Webhook returns 200 OK
- [ ] Response includes:
  ```json
  {
    "charity_impact": {
      "donation_huf": 100,
      "impact_description": "1 adag étel",
      "charity_name": "Magyar Élelmiszerbank Egyesület"
    }
  }
  ```
- [ ] `charity_donations` table has new row with `pos_transaction_id` set
- [ ] If promotion has `sponsor_brand_id`, then `sponsor_contribution_huf` = 50

**cURL Test:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/goorderz-webhook \
  -H "X-Webhook-Signature: HMAC_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "GO-12345",
    "venue_external_id": "VENUE_UUID",
    "customer_token": "USER_QR_TOKEN",
    "items": [{"name": "Kézműves sör", "quantity": 1, "unit_price": 800, "total_price": 800}],
    "subtotal": 800,
    "total": 800,
    "timestamp": "2026-01-25T14:00:00Z"
  }'
```

---

### Test Case 4: Admin Dashboard - Charity Impact Page

**Setup:**
Admin user logged in

**Steps:**
1. Navigate to `/charity-impact`
2. Verify stats cards display correct data
3. Verify charity partners bar chart renders
4. Verify brand contributions pie chart renders
5. Verify top donors leaderboard shows users
6. Verify detailed breakdown table shows data

**Expected Results:**
- [ ] Page loads without errors
- [ ] All stats cards show numbers (not "NaN" or "undefined")
- [ ] Charts render with actual data from `charity_impact_summary` view
- [ ] Top donors list shows anonymized user IDs (first 8 chars + "...")
- [ ] Detailed table shows platform/sponsor/venue contribution split

---

### Test Case 5: Mobile App Integration (Rork Team)

**Setup:**
Mobile app with auth token

**Steps:**
1. Call `GET /get-user-csr-impact` from mobile app
2. Parse response JSON
3. Display stats in "My Impact" screen
4. After redemption, call endpoint again to refresh

**Expected Results:**
- [ ] API call succeeds with 200 OK
- [ ] JSON parses without errors
- [ ] Stats display correctly in UI:
  - Total impact units
  - Current streak
  - Recent donations list
  - Next milestone progress
  - Leaderboard rank

**Mobile Team Checklist:**
- [ ] Endpoint integrated in app API client
- [ ] "My Impact" screen UI implemented
- [ ] Post-redemption success screen shows charity impact
- [ ] Error handling for 401/500 errors
- [ ] Fallback UI if charity data unavailable

---

## Edge Case Testing

### Edge Case 1: No Active Charity Partner

**Setup:**
Mark all charity partners as `is_active = false`

**Steps:**
1. Redeem free drink
2. Check response

**Expected Results:**
- [ ] Redemption still succeeds
- [ ] `charity_impact` in response is `null`
- [ ] No charity donation record created

---

### Edge Case 2: Multiple Redemptions Same Day

**Setup:**
Test user redeems 3 drinks on same day

**Steps:**
1. Redeem 3 times in quick succession
2. Check user CSR stats

**Expected Results:**
- [ ] `total_impact_units` = 3
- [ ] `total_donations_huf` = 300
- [ ] `current_streak_days` = 1 (doesn't increase for same-day redemptions)

---

### Edge Case 3: User with No Redemptions Yet

**Setup:**
Brand new user (just signed up)

**Steps:**
1. Call `GET /get-user-csr-impact`
2. Check response

**Expected Results:**
- [ ] Returns 200 OK (not 404)
- [ ] Stats show zeros:
  ```json
  {
    "stats": {
      "total_donations_huf": 0,
      "total_impact_units": 0,
      "current_streak_days": 0,
      "global_rank": null
    },
    "recent_donations": [],
    "next_milestone": null
  }
  ```

---

### Edge Case 4: Leaderboard Calculation

**Setup:**
Multiple test users with varying impact units

**Steps:**
1. Create 5 test users with different `total_impact_units`
2. Call `SELECT calculate_csr_leaderboard();`
3. Check `global_rank` for each user

**Expected Results:**
- [ ] User with highest `total_impact_units` has `global_rank` = 1
- [ ] Users ranked in descending order of impact
- [ ] Ties handled consistently (PostgreSQL `ROW_NUMBER()` guarantees unique ranks)

**SQL Test:**
```sql
-- Populate test data
INSERT INTO user_csr_stats (user_id, total_impact_units) VALUES
  ('user1', 100),
  ('user2', 50),
  ('user3', 75),
  ('user4', 25),
  ('user5', 150);

-- Calculate leaderboard
SELECT calculate_csr_leaderboard();

-- Verify ranks
SELECT user_id, total_impact_units, global_rank
FROM user_csr_stats
ORDER BY global_rank;

-- Expected:
-- user5: 150 units, rank 1
-- user1: 100 units, rank 2
-- user3: 75 units, rank 3
-- user2: 50 units, rank 4
-- user4: 25 units, rank 5
```

---

## Performance Testing

### Load Test: 1000 Concurrent Redemptions

**Setup:**
Use k6, Artillery, or similar load testing tool

**Test:**
```javascript
// k6 script
import http from 'k6/http';

export let options = {
  vus: 100, // 100 virtual users
  duration: '30s',
};

export default function () {
  const token = 'TEST_JWT_TOKEN';
  const response = http.get('https://YOUR_PROJECT.supabase.co/functions/v1/get-user-csr-impact', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

**Success Criteria:**
- [ ] 95% of requests complete in < 500ms
- [ ] 0% error rate
- [ ] Database CPU < 70%

---

## Security Testing

### Security Test 1: Unauthorized Access

**Steps:**
1. Call `GET /get-user-csr-impact` without `Authorization` header
2. Call with invalid JWT token
3. Call with expired JWT token

**Expected Results:**
- [ ] All requests return `401 Unauthorized`
- [ ] No data leaked in error response

---

### Security Test 2: User A Cannot See User B's Impact

**Steps:**
1. Create User A and User B
2. Authenticate as User A
3. Attempt to query User B's donations directly via Supabase client

**Expected Results:**
- [ ] RLS blocks cross-user reads
- [ ] `charity_donations` query returns only User A's donations
- [ ] `user_csr_stats` query returns only User A's stats

**SQL Test:**
```sql
-- As User A (using JWT)
SET request.jwt.claim.sub = 'USER_A_UUID';

-- Try to read User B's data
SELECT * FROM charity_donations WHERE user_id = 'USER_B_UUID';
-- Should return 0 rows (RLS blocks)

SELECT * FROM user_csr_stats WHERE user_id = 'USER_B_UUID';
-- Should return 0 rows (RLS blocks)
```

---

## Rollback Plan

If production deployment fails:

1. **Database:** Rollback migration
   ```sql
   DROP TABLE IF EXISTS public.charity_donations CASCADE;
   DROP TABLE IF EXISTS public.charity_partners CASCADE;
   DROP TABLE IF EXISTS public.user_csr_stats CASCADE;
   DROP VIEW IF EXISTS public.charity_impact_summary;
   DROP FUNCTION IF EXISTS public.update_user_csr_stats;
   DROP FUNCTION IF EXISTS public.calculate_csr_leaderboard;
   ```

2. **Edge Functions:** Revert to previous version
   - Restore `consume-redemption-token/index.ts` from git
   - Restore `goorderz-webhook/index.ts` from git
   - Delete `get-user-csr-impact` function

3. **Admin UI:** Remove charity routes
   - Remove `/charity-impact` route from `App.tsx`
   - Remove menu item from `Sidebar.tsx`

4. **TypeScript Types:** Revert `types.ts` to previous version

---

## Post-Deployment Monitoring

### Week 1 Metrics to Track

- [ ] Total charity donations created
- [ ] Average donation amount
- [ ] Number of users with CSR stats
- [ ] Streak distribution (how many users have 1-day, 2-day, etc.)
- [ ] Edge function error rate (`get-user-csr-impact`)
- [ ] Database query performance (`charity_impact_summary` view)

**SQL Monitoring Queries:**
```sql
-- Total donations today
SELECT COUNT(*), SUM(total_donation_huf)
FROM charity_donations
WHERE created_at::date = CURRENT_DATE;

-- Active streaks distribution
SELECT current_streak_days, COUNT(*)
FROM user_csr_stats
GROUP BY current_streak_days
ORDER BY current_streak_days DESC;

-- Top charity partners
SELECT * FROM charity_impact_summary ORDER BY total_impact_units DESC;
```

---

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Environment:** [ ] Dev [ ] Staging [ ] Production
**All Tests Passed:** [ ] Yes [ ] No (see issues below)

**Issues Found:**
```
1.
2.
3.
```

**Approved for Production:** [ ] Yes [ ] No
**Approver:** ___________________
**Date:** ___________________

---

**End of Testing Checklist**
