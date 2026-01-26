# Complete Setup Guide - Come Get It Admin

**Date:** 2026-01-26
**For:** Gátai Bence (BenceG-tech)

This guide covers:
1. Deploying the charity system changes
2. Setting up Google login
3. Setting up Mapbox for maps
4. Making venue pins appear on maps

---

## PART 1: Deploy Charity System Changes to Admin Website

### Status: ✅ Code is complete and pushed to GitHub

**Your changes are ready but NOT deployed yet.**

### Why you don't see changes:

Lovable.dev needs to pull the changes from GitHub. The code exists in branch `claude/review-repos-audit-BNew7` but hasn't been deployed to your live admin site yet.

### Deployment Steps:

#### STEP 1: Merge Changes to Main Branch

1. **Open GitHub:**
   - Go to: https://github.com/BenceG-tech/come-get-it-venue-hub

2. **Create Pull Request:**
   - Click green "Compare & pull request" button (should appear at top)
   - Or click "Pull requests" tab → "New pull request"
   - Base branch: `main`
   - Compare branch: `claude/review-repos-audit-BNew7`

3. **Review Changes:**
   - You should see: "11 files changed, 2,406 additions"
   - Files include: CharityImpact.tsx, charity_system.sql, get-user-csr-impact, etc.

4. **Merge:**
   - Click green "Create pull request" button
   - Add title: "Add charity/CSR system (P0 feature)"
   - Click green "Merge pull request" button
   - Click "Confirm merge"

#### STEP 2: Lovable Auto-Deploys

1. **Go to Lovable:**
   - URL: https://lovable.dev/projects/c40952ff-7625-45d8-8cc4-e06de5f6ee13

2. **Wait for sync:**
   - Lovable automatically detects GitHub changes
   - Should show a notification or sync status
   - Wait 2-5 minutes for build to complete

3. **Verify deployment:**
   - Open your admin site (Lovable project URL)
   - Hard refresh: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Check sidebar - you should see new "Jótékonysági Hatás" menu item with ❤️ icon

#### STEP 3: Deploy Database Migration

**You MUST run the SQL migration manually in Supabase.**

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/nrxfiblssxwzeziomlvc

2. **Open SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query" button (top right)

3. **Copy migration SQL:**
   - Open file: `supabase/migrations/20260125000000_charity_system.sql`
   - Select ALL text (Ctrl+A or Cmd+A)
   - Copy (Ctrl+C or Cmd+C)

4. **Paste and run:**
   - Paste into Supabase SQL editor (Ctrl+V or Cmd+V)
   - Click green "Run" button (bottom right)
   - Wait for success message: "Success. No rows returned"

5. **Verify tables created:**
   - Click "Table Editor" in left sidebar
   - You should see new tables:
     - `charity_partners` (should have 4 rows)
     - `charity_donations` (empty at first)
     - `user_csr_stats` (empty at first)

#### STEP 4: Deploy Edge Functions

**Three edge functions need deployment:**

**Option A: Via Supabase Dashboard (Easier):**

1. **Go to Functions:**
   - Supabase dashboard: https://supabase.com/dashboard/project/nrxfiblssxwzeziomlvc/functions

2. **Deploy new function: get-user-csr-impact**
   - Click "Create a new function"
   - Name: `get-user-csr-impact`
   - Copy code from: `supabase/functions/get-user-csr-impact/index.ts`
   - Paste into editor
   - Click "Deploy function"

3. **Update existing function: consume-redemption-token**
   - Find `consume-redemption-token` in list
   - Click "..." menu → "Edit function"
   - Copy code from: `supabase/functions/consume-redemption-token/index.ts`
   - Replace all content
   - Click "Deploy function"

4. **Update existing function: goorderz-webhook**
   - Find `goorderz-webhook` in list
   - Click "..." menu → "Edit function"
   - Copy code from: `supabase/functions/goorderz-webhook/index.ts`
   - Replace all content
   - Click "Deploy function"

**Option B: Via Terminal (if you have Supabase CLI):**

```bash
cd /home/user/come-get-it-venue-hub

# Deploy functions
supabase functions deploy get-user-csr-impact
supabase functions deploy consume-redemption-token
supabase functions deploy goorderz-webhook
```

#### STEP 5: Test Charity System

1. **Log into admin:**
   - Go to your Lovable admin URL
   - Log in as admin

2. **Check new page:**
   - Look in sidebar for "Jótékonysági Hatás" (with ❤️ icon)
   - Click it
   - Page should load (may show zeros if no data yet)

3. **Check stats cards:**
   - Should see 4 cards: "Összes Adomány", "Összhatás", "Részt vevő Felhasználók", "Átlagos Adomány"
   - All may be zero initially (no donations yet)

---

## PART 2: Set Up Google Login

### Step-by-Step Google OAuth Setup

#### STEP 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - URL: https://console.cloud.google.com/

2. **Create/Select Project:**
   - Click project dropdown at top (next to "Google Cloud")
   - Click "New Project"
   - Name: "Come Get It"
   - Click "Create"
   - Wait for project to be created
   - Select the project from dropdown

3. **Enable Google+ API:**
   - In left sidebar, click "APIs & Services" → "Library"
   - Search for: "Google+ API"
   - Click "Google+ API"
   - Click blue "Enable" button

4. **Configure OAuth Consent Screen:**
   - In left sidebar, click "OAuth consent screen"
   - Select "External" (unless you have Google Workspace)
   - Click "Create"

   **Fill in form:**
   - App name: `Come Get It`
   - User support email: (your email)
   - Developer contact: (your email)
   - Click "Save and Continue"

   **Scopes page:**
   - Click "Add or Remove Scopes"
   - Select: `email`, `profile`, `openid`
   - Click "Update"
   - Click "Save and Continue"

   **Test users (optional for now):**
   - Click "Save and Continue"

5. **Create OAuth Credentials:**
   - In left sidebar, click "Credentials"
   - Click "+ Create Credentials" at top
   - Select "OAuth client ID"

   **Fill in:**
   - Application type: `Web application`
   - Name: `Come Get It Web App`

   **Authorized JavaScript origins:**
   - Click "+ Add URI"
   - Add: `http://localhost:5173` (for local dev)
   - Add: `https://YOUR_LOVABLE_DOMAIN` (your Lovable preview URL)

   **Authorized redirect URIs:**
   - Click "+ Add URI"
   - Add: `https://nrxfiblssxwzeziomlvc.supabase.co/auth/v1/callback`

   - Click "Create"

6. **Copy Credentials:**
   - A popup shows "OAuth client created"
   - **COPY THESE SOMEWHERE SAFE:**
     - Client ID: `xxxxx.apps.googleusercontent.com`
     - Client secret: `GOCSPX-xxxxx`
   - Click "OK"

#### STEP 2: Configure Supabase

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/nrxfiblssxwzeziomlvc

2. **Open Auth Settings:**
   - Click "Authentication" in left sidebar
   - Click "Providers" tab

3. **Enable Google:**
   - Find "Google" in the list
   - Toggle it ON (should turn green)

4. **Add Google Credentials:**
   - Click "Google" to expand
   - Paste your **Client ID** (from Google Console)
   - Paste your **Client Secret** (from Google Console)
   - Click "Save"

5. **Test Callback URL:**
   - Should show: `https://nrxfiblssxwzeziomlvc.supabase.co/auth/v1/callback`
   - This MUST match what you added in Google Console

#### STEP 3: Update Admin Login Page

**If your login page doesn't have Google button yet, add it:**

1. **Open your Login page code:**
   - File: `src/pages/Login.tsx`

2. **Check if Google login exists:**
   - Look for "Sign in with Google" button
   - If it exists, you're done!
   - If not, you need to add it

3. **To add Google login (if missing):**
   - Use Supabase Auth UI or add button:
   ```typescript
   const handleGoogleLogin = async () => {
     const { error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: {
         redirectTo: window.location.origin + '/dashboard'
       }
     });
     if (error) console.error('Google login error:', error);
   };
   ```

#### STEP 4: Test Google Login

1. **Open admin site:**
   - Go to your Lovable admin URL
   - Should see login page

2. **Click "Sign in with Google":**
   - Should redirect to Google login
   - Select your Google account
   - Grant permissions
   - Should redirect back to admin dashboard

3. **Verify profile created:**
   - In Supabase dashboard, go to "Authentication" → "Users"
   - Should see your Google user with email
   - In "Table Editor" → "profiles", should see profile row

---

## PART 3: Set Up Mapbox for Maps

### Why You Need Mapbox:

Your venue detail pages show a map preview using Mapbox Static Images API. Without a Mapbox token, the map won't load.

### Step-by-Step Mapbox Setup

#### STEP 1: Create Mapbox Account

1. **Go to Mapbox:**
   - URL: https://account.mapbox.com/auth/signup/

2. **Sign up:**
   - Email: (your email)
   - Password: (choose a password)
   - Click "Get started"
   - Verify email if prompted

3. **Complete profile:**
   - Company/Project name: `Come Get It`
   - Use case: `Web application`
   - Click "Continue"

#### STEP 2: Get Access Token

1. **Go to Tokens page:**
   - After signup, should redirect to: https://account.mapbox.com/access-tokens/
   - Or click your profile (top right) → "Access tokens"

2. **Find default token:**
   - Should see "Default public token"
   - It starts with: `pk.eyJ1...`
   - Click the token to copy it

3. **Or create new token:**
   - Click "+ Create a token"
   - Name: `Come Get It Admin`
   - Scopes: Keep defaults (public scopes checked)
   - Click "Create token"
   - **COPY THE TOKEN IMMEDIATELY** (you can't see it again)

#### STEP 3: Add Token to Lovable Project

1. **Go to Lovable project:**
   - URL: https://lovable.dev/projects/c40952ff-7625-45d8-8cc4-e06de5f6ee13

2. **Open Settings:**
   - Click "Settings" or gear icon
   - Look for "Environment Variables" section

3. **Add Mapbox token:**
   - Click "+ Add Variable"
   - Name: `VITE_MAPBOX_TOKEN`
   - Value: (paste your Mapbox token, starts with `pk.eyJ1...`)
   - Click "Save"

4. **Redeploy:**
   - Lovable should auto-redeploy
   - Wait 1-2 minutes
   - Hard refresh your admin site: `Ctrl + Shift + R`

#### STEP 4: Add Token to Local Dev (Optional)

If you run the admin locally:

1. **Open file:** `.env`
2. **Add line:**
   ```
   VITE_MAPBOX_TOKEN=pk.eyJ1...YOUR_TOKEN_HERE
   ```
3. **Save file**
4. **Restart dev server:**
   ```bash
   npm run dev
   ```

#### STEP 5: Test Maps

1. **Go to admin site:**
   - Navigate to "Helyszínek" (Venues)

2. **Click on a venue:**
   - Should see venue detail page
   - Scroll down to map section

3. **Check map loads:**
   - If venue has coordinates (lat/lng), map should show
   - Should see a red pin at venue location
   - If map doesn't load, check browser console for errors

---

## PART 4: Venue Pins on Public Map

### Understanding the Map Types:

**You have TWO different maps:**

1. **Venue Detail Map (Static Image):**
   - File: `src/components/VenueMapPreview.tsx`
   - Shows ONE venue with pin
   - Uses Mapbox Static Images API
   - Should work after Mapbox token setup (above)

2. **Public Venue List Map (Interactive):**
   - Shows ALL venues with pins
   - Needs different implementation
   - Currently might not exist or incomplete

### Check Current Public Map Implementation:

Let me check if you have a public venue map:

```bash
# Search for map components
grep -r "mapbox\|leaflet\|google.*map" src/pages/
```

### If Public Map Doesn't Show Venue Pins:

**You need to create an interactive map component. Here's what to do:**

#### Option A: Tell Lovable to Build It

Give Lovable this prompt:

```
Create an interactive map component for the public venue discovery page that shows all active venues as pins. Requirements:

1. Use Mapbox GL JS (or Leaflet with Mapbox tiles)
2. Show all venues from the venues table where is_paused = false
3. Each venue appears as a pin on the map
4. Clicking a pin shows venue name and "View Details" button
5. Map should be centered on Budapest initially (47.4979, 19.0402)
6. Use existing VITE_MAPBOX_TOKEN environment variable
7. Add to ConsumerApp page (/app) above venue list

Component file: src/components/PublicVenueMap.tsx
```

#### Option B: Manual Implementation

If you want to code it yourself, I can write the full component. Let me know!

---

## PART 5: Troubleshooting

### Charity System Not Showing:

**Problem:** New menu item doesn't appear

**Solutions:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Check Lovable deployed from correct branch
4. Check browser console for errors

**Problem:** Page shows errors

**Solutions:**
1. Verify database migration ran successfully
2. Check Supabase Table Editor - tables exist?
3. Check TypeScript compilation errors in Lovable

### Google Login Not Working:

**Problem:** "OAuth error" or redirect fails

**Solutions:**
1. Verify redirect URI in Google Console matches Supabase callback URL
2. Check Authorized JavaScript origins include your Lovable domain
3. In Supabase, verify Client ID and Secret are correct
4. Try in incognito/private window

**Problem:** User profile not created

**Solutions:**
1. Check Supabase "Authentication" → "Users" - user exists?
2. Check database trigger `handle_new_user` exists
3. Manually run in SQL Editor:
   ```sql
   SELECT * FROM auth.users;
   SELECT * FROM public.profiles;
   ```

### Mapbox Not Working:

**Problem:** Map shows "No coordinates" or error

**Solutions:**
1. Verify token starts with `pk.eyJ1...`
2. Check token is valid at: https://account.mapbox.com/access-tokens/
3. Verify environment variable name: `VITE_MAPBOX_TOKEN` (exact spelling)
4. Redeploy after adding token
5. Check browser console - should NOT see 401 Unauthorized errors

**Problem:** Map loads but no pin

**Solutions:**
1. Check venue has valid lat/lng coordinates (not 0, 0)
2. In Supabase Table Editor, check `venues` table:
   ```sql
   SELECT id, name, lat, lng FROM venues WHERE id = 'VENUE_UUID';
   ```
3. If coordinates missing, use "Geocode Address" button in venue edit page

### Venue Pins Not Showing:

**Problem:** Public map doesn't show venues

**Solutions:**
1. Component might not exist yet - see Part 4 above
2. If component exists, check:
   - Fetch query gets venues with coordinates
   - Filter: `is_paused = false AND lat IS NOT NULL AND lng IS NOT NULL`
3. Check browser console for API errors

---

## Summary Checklist

Use this checklist to track your progress:

### Charity System Deployment:
- [ ] Merged `claude/review-repos-audit-BNew7` to `main` on GitHub
- [ ] Lovable auto-deployed changes
- [ ] Ran SQL migration in Supabase
- [ ] Deployed 3 edge functions
- [ ] Verified new "Jótékonysági Hatás" menu item appears
- [ ] Tested `/charity-impact` page loads

### Google Login:
- [ ] Created Google Cloud project
- [ ] Enabled Google+ API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth credentials
- [ ] Added redirect URI to Google Console
- [ ] Enabled Google provider in Supabase
- [ ] Added Client ID and Secret in Supabase
- [ ] Tested Google login flow

### Mapbox:
- [ ] Created Mapbox account
- [ ] Got access token (starts with `pk.`)
- [ ] Added `VITE_MAPBOX_TOKEN` to Lovable environment variables
- [ ] Redeployed admin site
- [ ] Tested map loads on venue detail page

### Venue Map:
- [ ] Verified venue has coordinates (lat/lng)
- [ ] Map shows single venue pin on detail page
- [ ] (Optional) Created public interactive map component

---

## Next Steps After Setup

1. **Share with Rork team:**
   - Send them: `docs/RORK_CHARITY_API.md`
   - Or use the simplified prompt I gave you earlier

2. **Test charity flow end-to-end:**
   - Create test user
   - Redeem free drink
   - Check charity donation created
   - View user impact in CSR stats

3. **Add real charity partner info:**
   - Update charity logos in database
   - Update website URLs
   - Verify 100 HUF = 1 meal conversion rates

4. **Launch prep:**
   - Test all flows in staging
   - Run through `docs/CHARITY_TESTING_CHECKLIST.md`
   - Prepare marketing materials highlighting charity impact

---

## Need Help?

If you get stuck on any step:

1. Check browser console (F12) for error messages
2. Check Supabase logs: Dashboard → "Logs" section
3. Check Lovable build logs
4. All documentation is in `docs/` folder

**Files to reference:**
- `docs/GITHUB_AUDIT_FEEDBACK.md` - Complete system overview
- `docs/RORK_CHARITY_API.md` - API documentation
- `docs/CHARITY_TESTING_CHECKLIST.md` - Testing guide

---

**End of Setup Guide**

**Last Updated:** 2026-01-26
**Author:** Claude (AI Assistant)
