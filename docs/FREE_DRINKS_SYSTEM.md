# Free Drinks System - Complete Guide

## Overview
The free drink system allows venues to offer drinks during specific time windows. This document explains how the system works and how to use it.

## System Components

### 1. Database Tables
- **`venue_drinks`**: Stores all drinks for a venue
  - `drink_name`: Name of the drink
  - `is_free_drink`: Boolean flag for free drinks
  - `category`: Drink category (cocktail, beer, wine, etc.)
  - `image_url`: Optional drink image
  - `description`: Optional drink description

- **`free_drink_windows`**: Stores time windows for free drinks
  - `drink_id`: References the drink
  - `venue_id`: References the venue
  - `days`: Array of days (1=Monday, 7=Sunday)
  - `start_time`: Start time (HH:MM format)
  - `end_time`: End time (HH:MM format)
  - `timezone`: Timezone (default: Europe/Budapest)

### 2. Frontend Components

#### **VenueDetail.tsx** - Main Venue Display Page
- Located at: `/venues/:id`
- Shows all venue information in tabs
- **Free Drinks Tab**: Displays all drinks and their schedules
  - Current active drinks
  - Visual schedule grid
  - Time windows details
  - Next upcoming window

#### **VenueFormModal.tsx** - Venue Editing Modal
- Triggered by "Szerkesztés" button
- Contains tabs for editing different aspects
- **Italok (Drinks) Tab**: Uses EnhancedDrinkSelector

#### **EnhancedDrinkSelector.tsx** - Drink Management Component
- Manages drinks and their free drink time windows
- Features:
  - Add/edit/remove drinks
  - Toggle free drink status
  - Add multiple time windows per drink
  - Select days and times for each window
  - Image upload for drinks

#### **ScheduleGrid.tsx** - Visual Schedule Display
- Shows a 24-hour grid for each day of the week
- Visually highlights when free drinks are available

### 3. Data Flow

#### Adding/Editing Free Drinks:
```
1. User opens VenueFormModal (Szerkesztés button)
2. Navigate to "Italok" tab
3. Add new drink or edit existing
4. Toggle "Ingyenes" checkbox
5. Add time windows (days + time ranges)
6. Click "Mentés"
7. EnhancedDrinkSelector.flushStaged() validates data
8. VenueFormModal.handleSubmit() processes the form
9. supabaseProvider.update() saves to database:
   - replaceVenueDrinks() → venue_drinks table
   - replaceFreeDrinkWindows() → free_drink_windows table
10. Data is refetched and displayed in VenueDetail
```

#### Viewing Free Drinks:
```
1. VenueDetail loads venue data
2. supabaseProvider.getOne() fetches:
   - Venue info
   - Images (fetchVenueImages)
   - Drinks (fetchVenueDrinks)
   - Windows (fetchFreeDrinkWindows)
3. Data is displayed in "Ingyenes italok" tab
4. ScheduleGrid shows visual representation
```

## How to Use

### Adding a Free Drink:

1. **Navigate to Venue**:
   - Go to `/venues` page
   - Click on a venue name to open detail page

2. **Edit Venue**:
   - Click "Szerkesztés" button in top right
   - Go to "Italok" tab

3. **Add Drink**:
   - Scroll to "Új ital hozzáadása" section
   - Fill in drink name (required)
   - Select category (optional)
   - Check "Ingyenes ital" checkbox
   - This automatically adds a default time window

4. **Configure Time Windows**:
   - Click "Időablak hozzáadása" to add more windows
   - For each window:
     - Select days (click checkboxes)
     - Set start time
     - Set end time
   - Add multiple windows if needed

5. **Add Details (Optional)**:
   - Upload drink image
   - Add description

6. **Save**:
   - Click "Mentés" button
   - Success toast will confirm save
   - Modal closes automatically

7. **Verify**:
   - Free drink appears in "Ingyenes italok" tab
   - Schedule grid shows the time windows
   - Drink is visible in public app

### Debugging

All operations are logged to console with prefixes:
- `[EnhancedDrinkSelector]` - Component-level operations
- `[VenueFormModal]` - Form submission
- `[supabaseProvider]` - Database operations
- `[replaceVenueDrinks]` - Drink persistence
- `[replaceFreeDrinkWindows]` - Window persistence

Check browser console for detailed flow tracking.

### Common Issues

**Issue**: Free drinks not saving
- **Check**: Console logs for errors during save
- **Verify**: Free drinks have at least one time window
- **Verify**: Time windows have at least one day selected
- **Verify**: Start time is before end time

**Issue**: Free drinks not visible in app
- **Check**: Venue is not paused (`is_paused = false`)
- **Check**: Database tables have records (use Supabase dashboard)
- **Verify**: RLS policies allow public read access

**Issue**: Schedule grid not showing time windows
- **Check**: `freeDrinkWindows` array is populated in venue data
- **Check**: Window `days` array contains values 1-7
- **Check**: `start_time` and `end_time` are in "HH:MM" format

## Public App Integration

Free drinks are exposed via:
1. **Edge Function**: `get-public-venues` - Returns all venues with drinks
2. **Edge Function**: `get-public-venue` - Returns single venue with drinks and windows
3. **Component**: `PublicVenueDetail.tsx` - Displays free drinks to consumers

The public app shows:
- List of available drinks
- Current active status
- Time windows when drinks are free
- Visual schedule
