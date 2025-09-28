# Rork.com Integration Guide for Opening Hours Management

## API Endpoint for Opening Hours Data

**Primary Endpoint:** `https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue`

### Request Format
```javascript
POST https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue
Content-Type: application/json

{
  "id": "venue-uuid-here"
}
```

### Response Format
```json
{
  "id": "46e22a84-b299-4896-8b23-4f294e1d3d58",
  "name": "Vinozza",
  "address": "Budapest, Váci utca 45",
  "opening_hours": {
    "byDay": {
      "1": {"open": null, "close": null},        // Monday (closed)
      "2": {"open": "09:00", "close": "22:00"},  // Tuesday
      "3": {"open": "09:00", "close": "22:00"},  // Wednesday
      "4": {"open": "09:00", "close": "22:00"},  // Thursday
      "5": {"open": "09:00", "close": "23:00"},  // Friday
      "6": {"open": "10:00", "close": "23:00"},  // Saturday
      "7": {"open": "10:00", "close": "21:00"}   // Sunday
    },
    "specialDates": [
      {
        "date": "2024-12-25",
        "open": null,
        "close": null
      }
    ]
  },
  // ... other venue data
}
```

## Data Structure Details

### Day Numbering System
- **Monday = 1**
- **Tuesday = 2**
- **Wednesday = 3**
- **Thursday = 4**
- **Friday = 5**
- **Saturday = 6**
- **Sunday = 7**

### Time Format
- **Format:** "HH:MM" (24-hour format)
- **Examples:** "09:00", "22:30", "23:59"

### Closed Days
- **Closed days:** `{"open": null, "close": null}`
- **Open days:** `{"open": "09:00", "close": "22:00"}`

### Special Dates (Holidays/Exceptions)
- Override regular hours for specific dates
- **Date format:** "YYYY-MM-DD"
- **Example:** `{"date": "2024-12-25", "open": null, "close": null}`

## Implementation Requirements for Rork.com

### 1. Fetching Venue Data
```javascript
// Example implementation
async function getVenueOpeningHours(venueId) {
  const response = await fetch('https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: venueId })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch venue data');
  }

  const venue = await response.json();
  return venue.opening_hours;
}
```

### 2. Display Logic for Opening Hours
```javascript
function displayOpeningHours(openingHours) {
  if (!openingHours?.byDay) {
    return "Nyitvatartás nem elérhető";
  }

  const days = [
    { key: 1, label: 'Hétfő' },
    { key: 2, label: 'Kedd' },
    { key: 3, label: 'Szerda' },
    { key: 4, label: 'Csütörtök' },
    { key: 5, label: 'Péntek' },
    { key: 6, label: 'Szombat' },
    { key: 7, label: 'Vasárnap' },
  ];

  return days.map(day => {
    const dayHours = openingHours.byDay[day.key];
    const hoursText = dayHours?.open && dayHours?.close 
      ? `${dayHours.open} - ${dayHours.close}`
      : 'Zárva';
    
    return `${day.label}: ${hoursText}`;
  });
}
```

### 3. Current Status Check
```javascript
function isVenueOpenNow(openingHours) {
  if (!openingHours?.byDay) return false;

  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  // Check for special dates first
  const today = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const specialDate = openingHours.specialDates?.find(s => s.date === today);
  
  let dayHours;
  if (specialDate) {
    dayHours = specialDate;
  } else {
    dayHours = openingHours.byDay[currentDay];
  }

  if (!dayHours?.open || !dayHours?.close) {
    return false; // Closed
  }

  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}
```

## Admin Panel Integration

The opening hours can be managed through the admin panel at:
- **Edit Route:** `/venues/{venue-id}` (Business Hours tab)
- **Data is saved to:** `venues.opening_hours` column in database
- **Format:** Same JSON structure as described above

## Error Handling

### Common Error Responses
```json
// Venue not found
{
  "error": "Venue not found",
  "status": 404
}

// Missing venue ID
{
  "error": "Venue ID is required",
  "status": 400
}

// Server error
{
  "error": "Internal server error",
  "status": 500
}
```

### Recommended Error Handling
```javascript
async function getVenueWithErrorHandling(venueId) {
  try {
    const response = await fetch('https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/get-public-venue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: venueId })
    });

    if (response.status === 404) {
      return { error: 'Venue not found' };
    }

    if (!response.ok) {
      return { error: 'Failed to load venue data' };
    }

    return await response.json();
  } catch (error) {
    return { error: 'Network error occurred' };
  }
}
```

## Authentication & Rate Limiting

- **Authentication:** Not required for public venue data
- **Rate Limiting:** Standard Supabase edge function limits apply
- **CORS:** Enabled for cross-origin requests

## Testing the Integration

### Test Venue ID
Use this venue ID for testing: `46e22a84-b299-4896-8b23-4f294e1d3d58` (Vinozza)

### Expected Behavior
- Should show "Zárva" (Closed) on Monday
- Should show proper opening hours Tuesday-Sunday
- Should correctly detect current open/closed status

## Troubleshooting

1. **Always shows closed:** Check that you're using the correct day numbering (Monday=1)
2. **No opening hours displayed:** Verify the `opening_hours.byDay` structure exists
3. **Wrong status:** Ensure time comparison uses "HH:MM" format in 24-hour notation
4. **Special dates not working:** Check date format is "YYYY-MM-DD"

## Support Contact

For technical issues with the API integration, please contact the development team.
