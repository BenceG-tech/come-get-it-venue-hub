

# Fix Mobile App Errors from Supabase Side

## Two Issues to Fix

### Issue 1: "column profiles.points does not exist" (Error 42703)

The Rork mobile app is querying `SELECT *, points FROM profiles` but the `profiles` table has no `points` column. Points live in the separate `user_points` table.

**Fix**: Add a `points` integer column (default 0) to the `profiles` table, and create a trigger to keep it in sync with `user_points.balance`. This way the mobile app's query works without changing mobile code.

**Database migration**:
```sql
-- Add points column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- Sync existing data from user_points
UPDATE public.profiles p
SET points = COALESCE(up.balance, 0)
FROM public.user_points up
WHERE p.id = up.user_id;

-- Create trigger function to auto-sync points
CREATE OR REPLACE FUNCTION public.sync_profile_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET points = NEW.balance, updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger on user_points table
CREATE TRIGGER sync_profile_points_trigger
AFTER INSERT OR UPDATE OF balance ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_points();
```

### Issue 2: "CSRService Failed to fetch" (Missing Edge Function)

The mobile app calls `get-user-csr-impact` but this edge function was never created.

**Fix**: Create the edge function with proper CORS headers.

**New file**: `supabase/functions/get-user-csr-impact/index.ts`

This function will:
- Accept authenticated requests from the mobile app
- Query `csr_donations` for the logged-in user
- Return total donations, count, favorite charity
- Include full CORS headers (including Expo/React Native headers)
- Return zeros gracefully when no donations exist

**Update**: `supabase/config.toml` - add:
```toml
[functions.get-user-csr-impact]
verify_jwt = false
```

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| DB Migration | -- | Add `points` column to `profiles`, sync trigger |
| CREATE | `supabase/functions/get-user-csr-impact/index.ts` | New edge function for mobile CSR data |
| MODIFY | `supabase/config.toml` | Register new edge function |

## Expected Result

- The `profiles.points` query from mobile will return the user's current point balance (synced automatically)
- The CSR endpoint will respond with valid JSON instead of a network error
- Both errors will be resolved without any changes to the Rork mobile app code
