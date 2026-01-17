# RORK Mobile App - User Activity Tracking API

This document describes how to integrate user activity tracking from the Rork mobile app into the Come Get It backend.

## Overview

The activity tracking system logs user interactions to help venue owners and admins understand user behavior, optimize the app experience, and track engagement metrics.

## API Endpoint

```
POST /functions/v1/log-user-activity
```

**Base URL:** `https://nrxfiblssxwzeziomlvc.supabase.co`

## Authentication

All requests require a valid user JWT token in the Authorization header:

```
Authorization: Bearer <user_jwt_token>
```

## Request Format

```typescript
interface ActivityLogRequest {
  event_type: string;       // Required - type of event
  venue_id?: string;        // Optional - UUID of related venue
  metadata?: object;        // Optional - additional event data
  device_info?: string;     // Optional - device model/info
  app_version?: string;     // Optional - app version number
}
```

## Supported Event Types

| Event Type | Description | When to Log |
|------------|-------------|-------------|
| `app_open` | User opens the app | On app foreground/launch |
| `app_close` | User closes the app | On app background (with session duration) |
| `login` | User logs in | After successful authentication |
| `signup` | User signs up | After successful registration |
| `qr_generated` | User generates QR code | When QR code is displayed |
| `venue_viewed` | User views venue details | On venue detail screen open |
| `reward_viewed` | User views a reward | On reward detail view |
| `redemption_attempt` | User attempts to redeem | When user initiates redemption |
| `redemption_success` | Redemption completed | After successful redemption |
| `profile_viewed` | User views their profile | On profile screen open |
| `search_performed` | User performs search | When search is executed |
| `notification_received` | Push notification received | On notification receive |
| `notification_clicked` | User clicks notification | On notification tap |

## Response Format

### Success (200 OK)
```json
{
  "success": true
}
```

### Error (4xx/5xx)
```json
{
  "error": "Error message description"
}
```

## Integration Examples (React Native)

### 1. Create Activity Logger Service

```typescript
// services/activityLogger.ts
import { supabase } from './supabase';
import DeviceInfo from 'react-native-device-info';

const SUPABASE_URL = 'https://nrxfiblssxwzeziomlvc.supabase.co';

interface LogActivityParams {
  event_type: string;
  venue_id?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
      console.log('No auth session, skipping activity log');
      return;
    }

    const deviceInfo = `${DeviceInfo.getModel()} (${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()})`;
    const appVersion = DeviceInfo.getVersion();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/log-user-activity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: params.event_type,
        venue_id: params.venue_id,
        metadata: params.metadata,
        device_info: deviceInfo,
        app_version: appVersion,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should never break the app
  }
}
```

### 2. Track App Open/Close

```typescript
// App.tsx or main entry point
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { logActivity } from './services/activityLogger';

export default function App() {
  const appState = useRef(AppState.currentState);
  const sessionStartTime = useRef<number | null>(null);

  useEffect(() => {
    // Log app open on initial mount
    logActivity({ event_type: 'app_open' });
    sessionStartTime.current = Date.now();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background - log app_close with duration
        const sessionDuration = sessionStartTime.current 
          ? Math.round((Date.now() - sessionStartTime.current) / 1000)
          : 0;
        
        logActivity({
          event_type: 'app_close',
          metadata: { session_duration_seconds: sessionDuration }
        });
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground
        logActivity({ event_type: 'app_open' });
        sessionStartTime.current = Date.now();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    // ... your app content
  );
}
```

### 3. Track Login/Signup

```typescript
// In your auth flow
import { logActivity } from './services/activityLogger';

async function handleLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data.session) {
    await logActivity({ event_type: 'login' });
    // Navigate to home
  }
}

async function handleSignup(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (data.session) {
    await logActivity({ event_type: 'signup' });
    // Navigate to onboarding
  }
}
```

### 4. Track Venue Views

```typescript
// VenueDetailScreen.tsx
import { useEffect } from 'react';
import { logActivity } from './services/activityLogger';

export function VenueDetailScreen({ venueId }: { venueId: string }) {
  useEffect(() => {
    logActivity({
      event_type: 'venue_viewed',
      venue_id: venueId
    });
  }, [venueId]);

  // ... rest of component
}
```

### 5. Track QR Generation

```typescript
// QRCodeScreen.tsx
import { logActivity } from './services/activityLogger';

export function QRCodeScreen({ venueId }: { venueId: string }) {
  useEffect(() => {
    logActivity({
      event_type: 'qr_generated',
      venue_id: venueId,
      metadata: { screen: 'qr_code' }
    });
  }, [venueId]);

  // ... QR code display logic
}
```

### 6. Track Redemptions

```typescript
// RedemptionFlow.tsx
import { logActivity } from './services/activityLogger';

async function handleRedemption(venueId: string, drinkId: string) {
  // Log attempt
  await logActivity({
    event_type: 'redemption_attempt',
    venue_id: venueId,
    metadata: { drink_id: drinkId }
  });

  try {
    const result = await redeemDrink(venueId, drinkId);
    
    // Log success
    await logActivity({
      event_type: 'redemption_success',
      venue_id: venueId,
      metadata: { drink_id: drinkId, token_id: result.tokenId }
    });
  } catch (error) {
    // Attempt was already logged, no need to log failure
    console.error('Redemption failed:', error);
  }
}
```

### 7. Track Reward Views

```typescript
// RewardDetailScreen.tsx
import { useEffect } from 'react';
import { logActivity } from './services/activityLogger';

export function RewardDetailScreen({ rewardId, venueId }: { rewardId: string; venueId: string }) {
  useEffect(() => {
    logActivity({
      event_type: 'reward_viewed',
      venue_id: venueId,
      metadata: { reward_id: rewardId }
    });
  }, [rewardId, venueId]);

  // ... reward details
}
```

### 8. Track Search

```typescript
// SearchScreen.tsx
import { logActivity } from './services/activityLogger';

function handleSearch(query: string, filters: object) {
  logActivity({
    event_type: 'search_performed',
    metadata: { 
      query,
      filters,
      results_count: results.length
    }
  });
}
```

### 9. Track Push Notifications

```typescript
// NotificationHandler.tsx
import { logActivity } from './services/activityLogger';

// When notification is received (in background handler or foreground)
function onNotificationReceived(notification: any) {
  logActivity({
    event_type: 'notification_received',
    metadata: {
      notification_id: notification.id,
      type: notification.data?.type
    }
  });
}

// When user taps on notification
function onNotificationClicked(notification: any) {
  logActivity({
    event_type: 'notification_clicked',
    venue_id: notification.data?.venue_id,
    metadata: {
      notification_id: notification.id,
      type: notification.data?.type
    }
  });
}
```

## Best Practices

1. **Don't block UI**: Activity logging should be fire-and-forget. Never await it in a way that blocks user interaction.

2. **Handle errors gracefully**: Activity logging failures should be logged but never crash the app.

3. **Batch if needed**: For high-frequency events, consider batching locally and sending periodically.

4. **Include context**: Always include relevant IDs (venue_id, reward_id, etc.) when available.

5. **Use consistent device info**: Use the same device info format across all events for consistent analytics.

## Data Privacy

- All activity data is tied to the authenticated user
- IP addresses are logged for security purposes
- Data is stored in accordance with GDPR requirements
- Users can request data deletion through support

## Testing

You can test the endpoint with curl:

```bash
curl -X POST 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/log-user-activity' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "event_type": "app_open",
    "device_info": "iPhone 15 Pro",
    "app_version": "1.0.0"
  }'
```

## Admin Dashboard

All logged activities can be viewed in the Come Get It Partner Dashboard:
- **Users page** (`/users`): Overview of all users with activity stats
- **User detail page** (`/users/:id`): Full activity timeline for a specific user
