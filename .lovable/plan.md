

# Fix Charity Impact Page - Implementation Plan

## Problem Identified

The "Jótékonysági Hatás" menu item exists in the sidebar but clicking it shows a 404 error because:

1. **Missing Page Component**: `src/pages/CharityImpact.tsx` does not exist
2. **Missing Route**: No `/charity-impact` route is configured in `App.tsx`

---

## Implementation Steps

### Step 1: Add Route to App.tsx

**File**: `src/App.tsx`

Add import at line 16 (after Analytics import):
```typescript
import CharityImpact from "./pages/CharityImpact";
```

Add route after `/analytics` route (around line 90):
```tsx
<Route path="/charity-impact" element={
  <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
    <CharityImpact />
  </RouteGuard>
} />
```

### Step 2: Create CharityImpact.tsx Page

**New File**: `src/pages/CharityImpact.tsx`

A comprehensive charity impact dashboard (~350 lines) with:

**Components**:
- PageLayout wrapper (consistent with other admin pages)
- 4 Stats Cards (Összes Adomány, Összhatás, Felhasználók, Átlag)
- Bar Chart showing donations per charity partner
- Pie Chart showing brand/venue contributions
- Top 10 Donors Leaderboard
- Detailed charity partners table

**Data Fetching**:
- Query existing `charities` table for partner list
- Query existing `csr_donations` table for donation data
- Aggregate statistics in component
- Handle empty states gracefully (show zeros, not errors)

**Key Features**:
- Uses same styling patterns as DataInsights.tsx
- Recharts for visualizations (BarChart, PieChart)
- Skeleton loading states
- Error handling with user-friendly messages
- Responsive grid layout (mobile-friendly)

---

## Technical Details

### Database Tables Used (Already Exist)

| Table | Purpose |
|-------|---------|
| `charities` | Charity partner info (1 record exists) |
| `csr_donations` | Individual donations (0 records - empty) |

### Page Structure

```text
+------------------------------------------+
|  ❤️ Jótékonysági Hatás (Header)          |
+------------------------------------------+
| [Stat 1] [Stat 2] [Stat 3] [Stat 4]      |
+------------------------------------------+
| [Bar Chart: Donations]  | [Pie Chart]    |
+------------------------------------------+
| Top 10 Donors Leaderboard                |
+------------------------------------------+
| Detailed Charity Partners Table          |
+------------------------------------------+
```

### Empty State Handling

Since the database currently has minimal data:
- Stats will show "0 Ft" and "0" values
- Charts will show "Még nincsenek adatok" message
- Tables will show empty state with helpful message
- **No crashes or errors** - graceful degradation

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/App.tsx` | MODIFY | Add import + route |
| `src/pages/CharityImpact.tsx` | CREATE | Full dashboard page |

---

## Expected Result After Fix

- ✅ Clicking "Jótékonysági Hatás" navigates to `/charity-impact`
- ✅ Page loads without errors
- ✅ Shows 4 stat cards (all zeros initially)
- ✅ Shows empty chart placeholders
- ✅ Shows empty table with message
- ✅ No console errors
- ⚠️ Data will populate once CSR donations are recorded

