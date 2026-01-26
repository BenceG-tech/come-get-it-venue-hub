# Deployment Instructions for Charity System

## Changes Are Complete and Pushed to GitHub ✅

All charity system code is committed to branch: `claude/review-repos-audit-BNew7`

---

## Step 1: Deploy to Lovable Admin Interface

Since this is a Lovable.dev project, Lovable needs to pull the changes from GitHub.

**Option A: Lovable Auto-Sync (if enabled)**
1. Go to https://lovable.dev/projects/c40952ff-7625-45d8-8cc4-e06de5f6ee13
2. Lovable should automatically detect GitHub changes
3. Click "Pull from GitHub" or "Sync" if prompted

**Option B: Manual Merge to Main**
1. Go to GitHub: https://github.com/BenceG-tech/come-get-it-venue-hub
2. Create Pull Request from `claude/review-repos-audit-BNew7` to `main`
3. Review changes (11 files changed)
4. Merge the PR
5. Lovable will auto-deploy from main branch

**Option C: Tell Lovable to Use This Branch**
1. Open Lovable project
2. In settings, change Git branch to `claude/review-repos-audit-BNew7`
3. Lovable will pull and deploy

---

## Step 2: Deploy Supabase Database Migration

The charity tables need to be created in your Supabase database.

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to https://supabase.com/dashboard/project/nrxfiblssxwzeziomlvc
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Copy the contents of: `supabase/migrations/20260125000000_charity_system.sql`
5. Paste into the query editor
6. Click "Run" (bottom right)
7. Wait for success message

**Option B: Via Supabase CLI**
```bash
cd /home/user/come-get-it-venue-hub
supabase db push
```

---

## Step 3: Deploy Edge Functions

Three edge functions were created/updated.

**Via Supabase CLI:**
```bash
# Deploy new function
supabase functions deploy get-user-csr-impact

# Redeploy updated functions
supabase functions deploy consume-redemption-token
supabase functions deploy goorderz-webhook
```

**Via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/nrxfiblssxwzeziomlvc/functions
2. For each function, click "..." menu → "Edit"
3. Copy code from local files
4. Click "Deploy"

---

## Step 4: Verify Deployment

After deployment, test:

1. **Check new menu item:**
   - Log into admin at your Lovable URL
   - Look for "Jótékonysági Hatás" in sidebar (with Heart icon ❤️)

2. **Check charity page:**
   - Navigate to `/charity-impact`
   - Should show stats cards (may be zeros if no data yet)

3. **Check database:**
   - Go to Supabase dashboard → Table Editor
   - Verify these tables exist:
     - charity_partners (should have 4 rows)
     - charity_donations (may be empty)
     - user_csr_stats (may be empty)

---

## What You'll See After Deployment

**In Admin Sidebar:**
- New menu item: "Jótékonysági Hatás" (between Analytics and Users)

**New Page: /charity-impact**
- 4 stat cards at top
- Bar chart showing charity partners
- Pie chart showing brand contributions
- Top 10 donors leaderboard
- Detailed breakdown table

**In Redemptions Flow:**
- Backend now creates charity donations automatically
- No UI changes needed (happens in background)

---

## If You Don't See Changes

If changes don't appear after deployment:

1. **Hard refresh browser:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache:** Browser settings → Clear browsing data
3. **Check Lovable sync:** Verify Lovable pulled latest from GitHub
4. **Check build logs:** In Lovable, check for TypeScript errors

---

## Next Steps

After deployment, share the Rork prompt with your mobile app team:
- File: `docs/RORK_CHARITY_API.md`
- Or use the prompt I provided earlier
