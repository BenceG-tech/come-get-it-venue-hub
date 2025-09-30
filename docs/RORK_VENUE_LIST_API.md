# Rork.com Integration: Venue List API

## Overview
This document provides the complete integration guide for the **venue list endpoint** that returns all active venues with their opening hours and computed open status.

## Endpoint

### Get Public Venues (List)
**URL:** `https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues`

**Method:** `GET`

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `search` (optional): Search term to filter venues by name or address
- `limit` (optional): Maximum number of venues to return (default: 50)

## Request Examples

### Basic Request (All Venues)
```bash
curl -X GET \
  'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues'
```

### Search Request
```bash
curl -X GET \
  'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues?search=bar'
```

### With Limit
```bash
curl -X GET \
  'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues?limit=20'
```

## Response Format

### Success Response (200 OK)
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Sample Bar",
    "address": "123 Main St, Budapest",
    "description": "Great place for drinks",
    "plan": "premium",
    "phone_number": "+36 1 234 5678",
    "website_url": "https://example.com",
    "image_url": "https://...",
    "hero_image_url": "https://...",
    "is_paused": false,
    "created_at": "2024-01-01T12:00:00Z",
    "tags": ["cocktails", "music"],
    "participates_in_points": true,
    "points_per_visit": 10,
    "distance": null,
    "google_maps_url": "https://maps.google.com/...",
    "category": "bar",
    "price_tier": 2,
    "rating": 4.5,
    
    "opening_hours": {
      "byDay": {
        "1": { "open": "10:00", "close": "22:00" },
        "2": { "open": "10:00", "close": "22:00" },
        "3": { "open": "10:00", "close": "22:00" },
        "4": { "open": "10:00", "close": "23:00" },
        "5": { "open": "10:00", "close": "02:00" },
        "6": { "open": "12:00", "close": "02:00" },
        "7": { "open": "12:00", "close": "22:00" }
      },
      "specialDates": {}
    },
    
    "business_hours": {
      "byDay": {
        "1": { "open": "10:00", "close": "22:00" },
        "2": { "open": "10:00", "close": "22:00" },
        "3": { "open": "10:00", "close": "22:00" },
        "4": { "open": "10:00", "close": "23:00" },
        "5": { "open": "10:00", "close": "02:00" },
        "6": { "open": "12:00", "close": "02:00" },
        "7": { "open": "12:00", "close": "22:00" }
      },
      "specialDates": {}
    },
    
    "open_status": {
      "is_open_now": true,
      "closes_at": "22:00",
      "hours_today": {
        "open": "10:00",
        "close": "22:00"
      }
    },
    
    "hours_summary": [
      {
        "days": "Hétfő - Szerda",
        "hours": "10:00 - 22:00"
      },
      {
        "days": "Csütörtök",
        "hours": "10:00 - 23:00"
      },
      {
        "days": "Péntek - Szombat",
        "hours": "10:00 - 02:00"
      },
      {
        "days": "Vasárnap",
        "hours": "12:00 - 22:00"
      }
    ],
    
    "timezone": "Europe/Budapest"
  }
]
```

### Empty Response (No Venues)
```json
[]
```

### Error Response (500)
```json
{
  "error": "Failed to fetch venues"
}
```

## Data Contract

### Opening Hours Structure
The `opening_hours` and `business_hours` fields are identical and use the following structure:

**Day Keys:** 
- `1` = Monday (Hétfő)
- `2` = Tuesday (Kedd)
- `3` = Wednesday (Szerda)
- `4` = Thursday (Csütörtök)
- `5` = Friday (Péntek)
- `6` = Saturday (Szombat)
- `7` = Sunday (Vasárnap)

**IMPORTANT:** Sunday is represented as `7`, NOT `0`. This is the key difference from JavaScript's `Date.getDay()`.

**Time Format:** All times use 24-hour format `HH:MM` (e.g., "14:30", "23:00")

### Open Status Fields
- `is_open_now` (boolean): Whether the venue is currently open
- `closes_at` (string | null): Time when venue closes today (if open)
- `hours_today` (object | null): Today's opening hours
  - `open` (string): Opening time
  - `close` (string): Closing time

### Hours Summary
Consecutive days with identical hours are grouped together for display purposes.

## Implementation Guide for Rork.com

### 1. Fetching Venue List
```javascript
async function fetchVenues(searchTerm = '', limit = 50) {
  const url = new URL('https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues');
  if (searchTerm) url.searchParams.set('search', searchTerm);
  if (limit) url.searchParams.set('limit', limit.toString());
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch venues');
  }
  
  return await response.json();
}
```

### 2. Displaying Open/Closed Status
The server computes `open_status` for you. Simply use:

```javascript
function getVenueStatus(venue) {
  if (venue.open_status.is_open_now) {
    return {
      text: 'Open',
      color: 'green',
      details: `Closes at ${venue.open_status.closes_at}`
    };
  } else if (venue.open_status.hours_today) {
    return {
      text: 'Closed',
      color: 'red',
      details: `Opens at ${venue.open_status.hours_today.open}`
    };
  } else {
    return {
      text: 'Closed',
      color: 'red',
      details: 'Closed today'
    };
  }
}
```

### 3. Client-Side Status Computation (Optional)
If you need to compute status client-side for any reason:

```javascript
function computeOpenStatus(venue) {
  const now = new Date();
  // IMPORTANT: Convert Sunday from 0 to 7
  const currentDay = (now.getDay() || 7).toString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = venue.opening_hours?.byDay?.[currentDay];
  
  if (!todayHours?.open || !todayHours?.close) {
    return { is_open_now: false, closes_at: null, hours_today: null };
  }
  
  const [openHours, openMins] = todayHours.open.split(':').map(Number);
  const [closeHours, closeMins] = todayHours.close.split(':').map(Number);
  
  const openMinutes = openHours * 60 + openMins;
  const closeMinutes = closeHours * 60 + closeMins;
  
  const is_open_now = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  
  return {
    is_open_now,
    closes_at: is_open_now ? todayHours.close : null,
    hours_today: todayHours
  };
}
```

## Key Differences from Previous Implementation

### ✅ What Changed
1. **List endpoint now includes `opening_hours`** - Previously missing
2. **Server-computed `open_status`** - No client-side computation needed
3. **Day indexing fixed** - Sunday = 7 (not 0)
4. **Numeric time comparison** - Times converted to minutes for accurate comparison
5. **Both fields provided** - `opening_hours` and `business_hours` (identical)

### ❌ What NOT to Do
- Don't use JavaScript's `Date.getDay()` directly (Sunday is 0, but our data uses 7)
- Don't compare time strings directly (use minutes since midnight)
- Don't rely on old list endpoints that don't include `opening_hours`

## Testing Your Integration

### Test 1: Fetch All Venues
```bash
curl -X GET 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues'
```
**Expected:** Array of venues with `open_status` computed

### Test 2: Check Open Status Accuracy
1. Note current time in Budapest timezone
2. Find a venue in the response
3. Check if `open_status.is_open_now` matches the venue's `hours_today`

### Test 3: Search Functionality
```bash
curl -X GET 'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venues?search=test'
```

## Support

For debugging assistance:
1. Check edge function logs: [View Logs](https://supabase.com/dashboard/project/nrxfiblssxwzeziomlvc/functions/get-public-venues/logs)
2. Verify response includes all required fields
3. Ensure `open_status.is_open_now` is a boolean
4. Confirm `opening_hours.byDay` keys are strings "1"-"7"

## Related Documentation
- [Single Venue Detail API](./REST_ENDPOINTS.md#get-public-venue)
- [Mobile App Integration Guide](./MOBILE_APP_INTEGRATION.md)
