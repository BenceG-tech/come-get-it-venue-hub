# Mobile App Integration Guide - Opening Hours

This guide explains how to integrate opening hours functionality from the Come Get It partner dashboard into your mobile app (rork.com).

## API Endpoints

### Public Venues with Opening Hours
```
GET /api/venues
```

Returns an array of active venues with their opening hours data:

```json
{
  "venues": [
    {
      "id": "uuid-here",
      "name": "Venue Name",
      "address": "Venue Address",
      "description": "Venue description",
      "plan": "basic|standard|premium",
      "opening_hours": {
        "byDay": {
          "1": {"open": "09:00", "close": "22:00"},
          "2": {"open": "09:00", "close": "22:00"},
          "3": {"open": "09:00", "close": "22:00"},
          "4": {"open": "09:00", "close": "22:00"},
          "5": {"open": "09:00", "close": "23:00"},
          "6": {"open": "10:00", "close": "23:00"},
          "7": {"open": null, "close": null}
        },
        "specialDates": [
          {"date": "2025-12-25", "open": null, "close": null}
        ]
      },
      "phone_number": "+36201234567",
      "website_url": "https://venue-website.com",
      "image_url": "https://venue-image.jpg",
      "participates_in_points": true,
      "points_per_visit": 2
    }
  ]
}
```

### Single Venue Details
```
GET /api/venues/{venue_id}
```

Returns detailed information for a specific venue including opening hours.

## Opening Hours Data Structure

### Day Numbering
- Days are numbered 1-7 where:
  - 1 = Monday
  - 2 = Tuesday  
  - 3 = Wednesday
  - 4 = Thursday
  - 5 = Friday
  - 6 = Saturday
  - 7 = Sunday

### Time Format
- Times are in 24-hour format: "HH:MM" (e.g., "09:00", "23:30")
- Closed days have `null` values for both open and close

### Special Dates
- Array of date-specific overrides
- Date format: "YYYY-MM-DD"
- Can override normal hours or mark special closures

## Business Logic Implementation

### Check if Venue is Currently Open
```javascript
function isVenueOpenNow(venue, currentDate = new Date()) {
  const currentDay = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Convert Sunday from 0 to 7
  const currentTime = currentDate.toTimeString().slice(0, 5); // "HH:MM"
  
  // Check for special date overrides first
  const dateString = currentDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const specialDate = venue.opening_hours?.specialDates?.find(d => d.date === dateString);
  
  if (specialDate) {
    if (!specialDate.open || !specialDate.close) return false;
    return currentTime >= specialDate.open && currentTime <= specialDate.close;
  }
  
  // Check regular hours
  const dayHours = venue.opening_hours?.byDay?.[currentDay];
  if (!dayHours?.open || !dayHours?.close) return false;
  
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}
```

### Get Today's Closing Time
```javascript
function getClosingTimeToday(venue, currentDate = new Date()) {
  const currentDay = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
  const dateString = currentDate.toISOString().slice(0, 10);
  
  // Check special dates first
  const specialDate = venue.opening_hours?.specialDates?.find(d => d.date === dateString);
  if (specialDate) {
    return specialDate.close;
  }
  
  // Return regular hours
  return venue.opening_hours?.byDay?.[currentDay]?.close || null;
}
```

### Format Opening Hours for Display
```javascript
function formatOpeningHours(businessHours) {
  if (!businessHours?.byDay) return "Hours not available";
  
  const days = [
    { key: 1, label: 'Monday', short: 'Mon' },
    { key: 2, label: 'Tuesday', short: 'Tue' },
    { key: 3, label: 'Wednesday', short: 'Wed' },
    { key: 4, label: 'Thursday', short: 'Thu' },
    { key: 5, label: 'Friday', short: 'Fri' },
    { key: 6, label: 'Saturday', short: 'Sat' },
    { key: 7, label: 'Sunday', short: 'Sun' },
  ];
  
  const groups = [];
  let currentGroup = null;
  
  days.forEach(day => {
    const dayHours = businessHours.byDay[day.key];
    const hoursString = dayHours?.open && dayHours?.close 
      ? `${dayHours.open} - ${dayHours.close}`
      : 'Closed';
    
    if (!currentGroup || currentGroup.hours !== hoursString) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { days: [day.label], hours: hoursString };
    } else {
      currentGroup.days.push(day.label);
    }
  });
  
  if (currentGroup) groups.push(currentGroup);
  
  return groups.map(group => {
    const daysDisplay = group.days.length > 2 && isConsecutive(group.days)
      ? `${group.days[0]} - ${group.days[group.days.length - 1]}`
      : group.days.join(', ');
    return `${daysDisplay}: ${group.hours}`;
  }).join('\n');
}
```

## UI Implementation Examples

### Venue Card Status
```javascript
function VenueCard({ venue }) {
  const isOpen = isVenueOpenNow(venue);
  const closingTime = isOpen ? getClosingTimeToday(venue) : null;
  
  return (
    <div className="venue-card">
      <h3>{venue.name}</h3>
      <div className={`status ${isOpen ? 'open' : 'closed'}`}>
        {isOpen ? (
          <>
            <span className="open-indicator">● Open</span>
            {closingTime && <span> - closes {closingTime}</span>}
          </>
        ) : (
          <span className="closed-indicator">● Closed</span>
        )}
      </div>
    </div>
  );
}
```

### Venue Detail Hours Display
```javascript
function VenueHours({ venue }) {
  const currentDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  
  return (
    <div className="venue-hours">
      <h4>Opening Hours</h4>
      {venue.opening_hours?.byDay ? (
        Object.entries(venue.opening_hours.byDay).map(([dayNum, hours]) => {
          const dayName = getDayName(parseInt(dayNum));
          const isToday = parseInt(dayNum) === currentDay;
          
          return (
            <div key={dayNum} className={`day-hours ${isToday ? 'today' : ''}`}>
              <span className="day">{dayName}</span>
              <span className="hours">
                {hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Closed'}
              </span>
            </div>
          );
        })
      ) : (
        <p>Hours not available</p>
      )}
    </div>
  );
}
```

## Filtering & Search

### Filter by Currently Open Venues
```javascript
function filterOpenVenues(venues) {
  return venues.filter(venue => isVenueOpenNow(venue));
}
```

### Sort by Opening Status
```javascript
function sortByOpenStatus(venues) {
  return venues.sort((a, b) => {
    const aOpen = isVenueOpenNow(a);
    const bOpen = isVenueOpenNow(b);
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    return 0;
  });
}
```

## Error Handling

```javascript
function safeIsVenueOpen(venue) {
  try {
    if (!venue?.opening_hours?.byDay) {
      console.warn(`Venue ${venue?.name || 'unknown'} has no opening hours data`);
      return false;
    }
    return isVenueOpenNow(venue);
  } catch (error) {
    console.error(`Error checking venue opening status:`, error);
    return false;
  }
}
```

## Integration Checklist

- [ ] Implement opening hours display in venue cards
- [ ] Add open/closed status indicators
- [ ] Create detailed opening hours view
- [ ] Add filtering for currently open venues
- [ ] Handle venues without opening hours data
- [ ] Implement special date handling (holidays)
- [ ] Add timezone support if needed
- [ ] Test edge cases (midnight hours, late night venues)

## Notes

1. **Timezone**: All times are stored in the venue's local timezone (Europe/Budapest by default)
2. **Midnight Hours**: Venues closing after midnight (e.g., "23:00 - 02:00") need special handling
3. **Data Validation**: Always check if opening_hours data exists before using it
4. **Performance**: Cache opening status calculations for better performance
5. **Updates**: Opening hours can be updated by venue owners, so refresh data periodically

## Support

For technical questions about the API or integration, contact the Come Get It development team.