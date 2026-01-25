# Come Get It - Charity / CSR API Documentation

**For:** Rork Mobile App Development Team
**Version:** 1.0
**Date:** 2026-01-25
**Base URL:** `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Charity System Concept](#charity-system-concept)
4. [API Endpoints](#api-endpoints)
5. [Integration with Redemption Flow](#integration-with-redemption-flow)
6. [UI/UX Guidelines](#uiux-guidelines)
7. [Error Handling](#error-handling)
8. [Example Implementations](#example-implementations)

---

## Overview

The **Come Get It Charity System** automatically donates to nonprofit partners every time a user:
- Redeems a free drink token
- Makes a purchase at a partner venue (via Goorderz POS)

This creates a **"feel-good" gamification layer** where users see their real-world impact:
- "You've donated 24 meals this month! 🍽️"
- "7-day donation streak! 🔥"
- "Only 3 more redemptions to rescue a puppy! 🐕"

The charity system is **automatic** - users don't need to opt in. Every redemption = charity donation.

---

## Authentication

All endpoints require a valid Supabase auth token. Include it in the `Authorization` header:

```http
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

Obtain tokens via Supabase Auth client:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Charity System Concept

### Donation Flow

```
User Action (Redemption or Purchase)
    ↓
Backend creates charity_donation record
    ↓
Backend updates user_csr_stats (streak, totals)
    ↓
Mobile app fetches updated impact via get-user-csr-impact
    ↓
User sees: "🎉 +1 meal donated! Total: 25 meals"
```

### Donation Amounts

| Event | Donation Amount | Split |
|-------|----------------|-------|
| Free drink redemption | 100 HUF | 50 HUF platform + 50 HUF venue |
| POS purchase (user identified) | 100 HUF | 50 HUF platform + 50 HUF sponsor/venue |

### Charity Partners

Current partners (may change - fetch dynamically):
- **Magyar Ebmentők Egyesülete** - 100 HUF = 1 adag kutyaeledel
- **Magyar Élelmiszerbank** - 100 HUF = 1 adag étel
- **Utcáról Lakásba!** - 150 HUF = 1 meleg étkezés
- **SOS Gyermekfalvak** - 200 HUF = 1 nap ellátás

The backend automatically rotates or selects charity partners based on priority.

---

## API Endpoints

### 1. Get User CSR Impact

**Endpoint:** `GET /get-user-csr-impact`

**Description:** Fetches the authenticated user's charity impact statistics, including donation totals, streak, recent donations, and leaderboard position.

**Headers:**
```http
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Response:** `200 OK`

```json
{
  "stats": {
    "total_donations_huf": 2400,
    "total_impact_units": 24,
    "total_redemptions": 24,
    "current_streak_days": 7,
    "longest_streak_days": 12,
    "last_donation_date": "2026-01-25",
    "global_rank": 42,
    "city_rank": 12
  },
  "recent_donations": [
    {
      "date": "2026-01-25",
      "amount": 100,
      "impact_description": "1 adag étel",
      "charity_name": "Magyar Élelmiszerbank Egyesület",
      "venue_name": "Instant Kávézó"
    },
    {
      "date": "2026-01-24",
      "amount": 100,
      "impact_description": "1 adag kutyaeledel",
      "charity_name": "Magyar Ebmentők Egyesülete",
      "venue_name": "Dobrumba Bar"
    }
  ],
  "next_milestone": {
    "target_units": 30,
    "current_units": 24,
    "remaining_units": 6,
    "description": "Következő mérföldkő! 🌟"
  },
  "leaderboard_position": {
    "rank": 42,
    "total_users": 1234,
    "percentile": 97
  }
}
```

**Error Codes:**
- `401 Unauthorized` - Invalid or missing auth token
- `500 Internal Server Error` - Database error

---

### 2. Consume Redemption Token (Updated)

**Endpoint:** `POST /consume-redemption-token`

**Description:** Staff-side endpoint to consume a user's redemption token. **Now includes charity impact in the response.**

**Headers:**
```http
Authorization: Bearer {STAFF_JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "CGI-ABC123-32charhashxxxxxxxxxxxxxxxxxx"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "redemption": {
    "id": "uuid",
    "drink_name": "Kézműves sör",
    "drink_id": "uuid",
    "drink_image_url": "https://...",
    "venue_name": "Instant Kávézó",
    "venue_id": "uuid",
    "token_prefix": "CGI-ABC123",
    "redeemed_at": "2026-01-25T14:32:00Z",
    "staff_id": "uuid"
  },
  "charity_impact": {
    "donation_huf": 100,
    "impact_description": "1 adag étel",
    "charity_name": "Magyar Élelmiszerbank Egyesület"
  }
}
```

**New Field:** `charity_impact` (null if no user_id or charity partner inactive)

**Error Codes:**
- `401 Unauthorized` - Invalid or missing staff auth token
- `404 Not Found` - Token doesn't exist
- `409 Conflict` - Token already consumed
- `410 Gone` - Token expired or revoked

---

### 3. Goorderz Webhook (Updated - Internal)

**Note:** This is a backend webhook (not called by mobile app), but impacts user CSR stats.

When a user makes a purchase at a Goorderz POS and scans their QR code:
1. Transaction is recorded
2. Points are awarded
3. **Charity donation is created**
4. User CSR stats are updated

The mobile app should **poll `get-user-csr-impact`** after a POS purchase to show updated impact.

---

## Integration with Redemption Flow

### Existing Redemption Flow (No Changes Required)

```
1. User opens app → Sees nearby venues
2. User taps "Claim Free Drink" → Calls issue-redemption-token
3. Backend validates and returns token → QR code shown in app
4. Staff scans QR → Calls consume-redemption-token
5. Redemption complete
```

### Enhanced Flow with Charity Impact

```
1. User opens app → Sees nearby venues
2. User taps "Claim Free Drink" → Calls issue-redemption-token
3. Backend validates and returns token → QR code shown in app
4. Staff scans QR → Calls consume-redemption-token
5. ✨ Response includes charity_impact ✨
6. Mobile app shows success screen:
   "✅ Enjoy your drink!"
   "🎉 +1 meal donated to Magyar Élelmiszerbank"
   [Optional] "View My Impact" button → navigates to CSR Impact screen
```

---

## UI/UX Guidelines

### 1. CSR Impact Screen

**Purpose:** Show user their cumulative charity impact.

**Recommended Sections:**

#### Header Stats
```
┌─────────────────────────────────────┐
│   🎉 You're a Hero!                │
│                                     │
│   24 meals donated                 │
│   2,400 Ft contributed             │
│                                     │
│   🔥 7-day streak                  │
│   👑 Top 3% globally               │
└─────────────────────────────────────┘
```

#### Progress to Next Milestone
```
┌─────────────────────────────────────┐
│  Next Milestone: 30 meals           │
│  ████████░░ 24/30                  │
│  6 more to go!                      │
└─────────────────────────────────────┘
```

#### Recent Donations (Timeline)
```
Jan 25 • Instant Kávézó
  1 meal donated to Magyar Élelmiszerbank

Jan 24 • Dobrumba Bar
  1 dog meal to Magyar Ebmentők

Jan 23 • Szabadság Espresso
  1 meal donated to Élelmiszerbank
```

#### Leaderboard (Optional)
```
Your Rank: #42 out of 1,234 users
You're in the top 3%! 🏆
```

### 2. Post-Redemption Success Screen

**Current Design:**
```
✅ Enjoy your drink!
Kézműves sör at Instant Kávézó
```

**Enhanced Design:**
```
✅ Enjoy your drink!
Kézműves sör at Instant Kávézó

🎉 You just donated 1 meal!
Magyar Élelmiszerbank Egyesület

[View My Impact]
```

### 3. Home Screen Widget (Optional)

Add a charity stats card on the main screen:
```
┌──────────────────────────────┐
│  Your Impact This Month      │
│  🍽️ 24 meals donated          │
│  🔥 7-day streak               │
│  [View Details →]            │
└──────────────────────────────┘
```

---

## Error Handling

### Scenario: Charity System Temporarily Down

If `get-user-csr-impact` returns 500 or times out:

**Fallback:**
```
┌─────────────────────────────────────┐
│   Your Impact                       │
│                                     │
│   Stats temporarily unavailable     │
│   Check back soon!                  │
└─────────────────────────────────────┘
```

**Do NOT** block redemption flow if charity tracking fails. Redemptions always succeed even if charity donation recording fails.

### Scenario: User Has No Charity Impact Yet

If user is new and `total_impact_units === 0`:

**Show:**
```
🌟 Start Your Impact Journey!

Redeem your first free drink to donate your first meal.
Every redemption helps a charity partner.

[Discover Venues]
```

---

## Example Implementations

### React Native - Fetch User CSR Impact

```typescript
import { supabase } from './supabase';

interface UserCSRImpact {
  stats: {
    total_donations_huf: number;
    total_impact_units: number;
    current_streak_days: number;
    global_rank: number | null;
  };
  recent_donations: Array<{
    date: string;
    amount: number;
    impact_description: string;
    charity_name: string;
    venue_name: string;
  }>;
  next_milestone: {
    target_units: number;
    current_units: number;
    remaining_units: number;
    description: string;
  } | null;
  leaderboard_position: {
    rank: number | null;
    total_users: number;
    percentile: number | null;
  };
}

export async function getUserCSRImpact(): Promise<UserCSRImpact> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/get-user-csr-impact`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch CSR impact: ${response.statusText}`);
  }

  return response.json();
}
```

### React Native - CSR Impact Screen Component

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getUserCSRImpact } from '../api/charity';

export function CSRImpactScreen() {
  const [impact, setImpact] = useState<UserCSRImpact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImpact();
  }, []);

  const loadImpact = async () => {
    try {
      const data = await getUserCSRImpact();
      setImpact(data);
    } catch (error) {
      console.error('Failed to load CSR impact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator />;
  if (!impact) return <Text>Unable to load impact data</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 You're a Hero!</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statLabel}>Total Impact</Text>
        <Text style={styles.statValue}>
          {impact.stats.total_impact_units} meals donated
        </Text>
        <Text style={styles.statSubtext}>
          {impact.stats.total_donations_huf.toLocaleString()} Ft contributed
        </Text>
      </View>

      <View style={styles.streakCard}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakValue}>
          {impact.stats.current_streak_days}-day streak
        </Text>
      </View>

      {impact.next_milestone && (
        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneTitle}>Next Milestone</Text>
          <ProgressBar
            current={impact.next_milestone.current_units}
            target={impact.next_milestone.target_units}
          />
          <Text style={styles.milestoneText}>
            {impact.next_milestone.remaining_units} more to{' '}
            {impact.next_milestone.description}
          </Text>
        </View>
      )}

      <View style={styles.recentList}>
        <Text style={styles.sectionTitle}>Recent Donations</Text>
        {impact.recent_donations.map((donation, index) => (
          <View key={index} style={styles.donationItem}>
            <Text style={styles.donationDate}>{donation.date}</Text>
            <Text style={styles.donationVenue}>{donation.venue_name}</Text>
            <Text style={styles.donationImpact}>
              {donation.impact_description} • {donation.charity_name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

### React Native - Post-Redemption Success with Charity Impact

```tsx
// After successful redemption
function RedemptionSuccessScreen({ redemption, charityImpact }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Enjoy your drink!</Text>
      <Text style={styles.drink}>{redemption.drink_name}</Text>
      <Text style={styles.venue}>at {redemption.venue_name}</Text>

      {charityImpact && (
        <View style={styles.charityCard}>
          <Text style={styles.charityEmoji}>🎉</Text>
          <Text style={styles.charityText}>
            You just donated {charityImpact.impact_description}!
          </Text>
          <Text style={styles.charityName}>
            {charityImpact.charity_name}
          </Text>
          <TouchableOpacity
            style={styles.viewImpactButton}
            onPress={() => navigation.navigate('CSRImpact')}
          >
            <Text style={styles.buttonText}>View My Impact</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Testing

### Test User Flow

1. **Create test user** in Supabase Auth
2. **Issue redemption token** via `issue-redemption-token`
3. **Consume token** via POS or admin panel
4. **Fetch CSR impact** via `get-user-csr-impact`
5. **Verify:**
   - `total_impact_units` increased by 1
   - `total_donations_huf` increased by 100
   - `recent_donations` includes new entry
   - `current_streak_days` updates correctly

### Test Streak Logic

- Day 1: Redeem → streak = 1
- Day 2: Redeem → streak = 2
- Day 3: Skip (no redemption)
- Day 4: Redeem → streak resets to 1
- Same day multiple redemptions: streak stays same

### Test Leaderboard

- `global_rank` updates after calling `calculate_csr_leaderboard()` (admin function)
- Ranking is based on `total_impact_units` DESC
- Users with 0 impact have `global_rank = null`

---

## FAQ

### Q: What happens if a user redeems but charity partner is inactive?

**A:** The redemption still succeeds, but `charity_impact` in the response is `null`. The user doesn't see charity messaging.

### Q: Can users choose which charity to support?

**A:** Not in v1. The backend auto-selects based on charity partner priority. This could be added later.

### Q: What if the user deletes their account?

**A:** Charity donations are preserved (anonymized) for reporting, but `user_csr_stats` is deleted via CASCADE.

### Q: How often should the app refresh CSR impact?

**A:**
- On app open: Fetch once
- After redemption: Fetch immediately
- Background refresh: Every 5 minutes (optional)

### Q: Can we show aggregate platform impact (all users combined)?

**A:** Not via this endpoint. The admin dashboard shows platform totals. You could add a public endpoint for this if desired.

---

## Changelog

### v1.0 (2026-01-25)
- Initial release
- `get-user-csr-impact` endpoint
- Updated `consume-redemption-token` with charity_impact
- Updated `goorderz-webhook` with charity tracking

---

## Support

**Questions?** Contact the Come Get It backend team or check:
- `docs/GITHUB_AUDIT_FEEDBACK.md` - Comprehensive system overview
- `supabase/migrations/20260125000000_charity_system.sql` - Database schema

**Supabase Dashboard:** [Your Project Dashboard]

---

**Happy coding! 🎉 Let's make the world a better place, one free drink at a time. 🍻**
