import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DashboardRole = 'admin' | 'owner' | 'staff' | 'brand';

const ALLOWED_ROLES: DashboardRole[] = ['admin', 'owner', 'staff', 'brand'];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ---- Authentication: a live Supabase user is required ----
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    const authUser = userData?.user;
    if (userError || !authUser) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    // Parse request body (client input is a *request*, never an authority)
    const body = await req.json().catch(() => ({}));
    const requestedRole = typeof body?.role === 'string' ? body.role : 'admin';
    const requestedVenueId = typeof body?.venue_id === 'string' ? body.venue_id : null;

    // ---- Authorization: derive the effective role server-side ----
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', authUser.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true;

    let role: DashboardRole;
    let venue_id: string | null = null;

    if (isAdmin) {
      // Platform admin: may request any scope.
      role = ALLOWED_ROLES.includes(requestedRole as DashboardRole)
        ? (requestedRole as DashboardRole)
        : 'admin';
      venue_id = requestedVenueId;
      if ((role === 'owner' || role === 'staff') && !venue_id) {
        return jsonResponse({ error: 'VENUE_ID_REQUIRED' }, 400);
      }
    } else {
      // Non-admin: scope is always a single venue the user actually belongs to.
      if (!requestedVenueId) {
        return jsonResponse({ error: 'VENUE_ID_REQUIRED' }, 400);
      }

      const [membershipResult, ownedVenueResult] = await Promise.all([
        supabaseClient
          .from('venue_memberships')
          .select('role')
          .eq('profile_id', authUser.id)
          .eq('venue_id', requestedVenueId)
          .maybeSingle(),
        supabaseClient
          .from('venues')
          .select('id')
          .eq('id', requestedVenueId)
          .eq('owner_profile_id', authUser.id)
          .maybeSingle(),
      ]);

      const membershipRole = membershipResult.data?.role ?? null;
      const isOwnerOfVenue = !!ownedVenueResult.data;

      if (!membershipRole && !isOwnerOfVenue) {
        return jsonResponse({ error: 'FORBIDDEN' }, 403);
      }

      // Any client-requested admin/brand role is ignored here.
      role = isOwnerOfVenue || membershipRole === 'venue_owner' ? 'owner' : 'staff';
      venue_id = requestedVenueId;
    }

    console.log(`[get-dashboard-stats] scope role=${role} venue_scoped=${venue_id ? 'yes' : 'no'}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Build response based on the *derived* role
    let stats: Record<string, any> = {};

    if (role === 'admin') {
      // Admin stats - platform-wide aggregates
      const [
        redemptionsResult,
        transactionsResult,
        usersResult,
        venuesResult,
        trendResult,
        topVenuesResult
      ] = await Promise.all([
        // Total redemptions
        supabaseClient
          .from('redemptions')
          .select('id', { count: 'exact', head: true }),
        
        // Total revenue from transactions
        supabaseClient
          .from('transactions')
          .select('amount'),
        
        // Total users
        supabaseClient
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
        
        // Active venues
        supabaseClient
          .from('venues')
          .select('id', { count: 'exact', head: true })
          .eq('is_paused', false),
        
        // Last 7 days trend
        supabaseClient
          .from('redemptions')
          .select('redeemed_at, value')
          .gte('redeemed_at', sevenDaysAgoISO)
          .order('redeemed_at', { ascending: true }),
        
        // Top 5 venues by redemption count
        supabaseClient
          .from('redemptions')
          .select('venue_id, value, venues(name)')
          .gte('redeemed_at', sevenDaysAgoISO)
      ]);

      // Calculate total revenue
      const totalRevenue = transactionsResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Process trend data - group by date
      const trendMap = new Map<string, { redemptions: number; redemption_value: number }>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendMap.set(dateStr, { redemptions: 0, redemption_value: 0 });
      }
      
      trendResult.data?.forEach((r: any) => {
        const dateStr = r.redeemed_at.split('T')[0];
        if (trendMap.has(dateStr)) {
          const current = trendMap.get(dateStr)!;
          current.redemptions += 1;
          current.redemption_value += r.value || 0;
        }
      });

      const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        redemptions: data.redemptions,
        // value of redeemed drinks (NOT transaction revenue)
        redemption_value: data.redemption_value,
        revenue: data.redemption_value
      }));

      // Process top venues
      const venueStats = new Map<string, { name: string; count: number; redemption_value: number }>();
      topVenuesResult.data?.forEach((r: any) => {
        const venueId = r.venue_id;
        const venueName = r.venues?.name || 'Unknown';
        if (!venueStats.has(venueId)) {
          venueStats.set(venueId, { name: venueName, count: 0, redemption_value: 0 });
        }
        const current = venueStats.get(venueId)!;
        current.count += 1;
        current.redemption_value += r.value || 0;
      });

      const topVenues = Array.from(venueStats.values())
        .sort((a, b) => b.redemption_value - a.redemption_value)
        .slice(0, 5)
        .map((v) => ({ ...v, revenue: v.redemption_value }));

      stats = {
        total_redemptions: redemptionsResult.count || 0,
        total_revenue: totalRevenue,
        total_users: usersResult.count || 0,
        active_venues: venuesResult.count || 0,
        trends,
        top_venues: topVenues
      };

    } else if (role === 'owner' && venue_id) {
      // Owner stats - venue-specific
      const [
        todayRedemptionsResult,
        todayTransactionsResult,
        weekRedemptionsResult,
        returningUsersResult,
        topDrinksResult
      ] = await Promise.all([
        // Today's redemptions for venue
        supabaseClient
          .from('redemptions')
          .select('id, value', { count: 'exact' })
          .eq('venue_id', venue_id)
          .gte('redeemed_at', todayISO),
        
        // Today's transactions for venue
        supabaseClient
          .from('transactions')
          .select('amount')
          .eq('venue_id', venue_id)
          .gte('timestamp', todayISO),
        
        // Week's redemptions for trend
        supabaseClient
          .from('redemptions')
          .select('redeemed_at, value')
          .eq('venue_id', venue_id)
          .gte('redeemed_at', sevenDaysAgoISO)
          .order('redeemed_at', { ascending: true }),
        
        // Get returning users (users with more than 1 redemption)
        supabaseClient
          .from('redemptions')
          .select('user_id')
          .eq('venue_id', venue_id)
          .gte('redeemed_at', sevenDaysAgoISO),
        
        // Top drinks at venue
        supabaseClient
          .from('redemptions')
          .select('drink, drink_id, value')
          .eq('venue_id', venue_id)
          .gte('redeemed_at', sevenDaysAgoISO)
      ]);

      // Calculate daily revenue (real transactions)
      const dailyRevenue = todayTransactionsResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Calculate returning rate
      const userVisits = new Map<string, number>();
      returningUsersResult.data?.forEach((r: any) => {
        const userId = r.user_id;
        userVisits.set(userId, (userVisits.get(userId) || 0) + 1);
      });
      const totalUsers = userVisits.size;
      const returningUsers = Array.from(userVisits.values()).filter(v => v > 1).length;
      const returningRate = totalUsers > 0 ? Math.round((returningUsers / totalUsers) * 100) : 0;

      // Calculate avg basket value
      const transactionCount = todayTransactionsResult.data?.length || 0;
      const avgBasketValue = transactionCount > 0 ? Math.round(dailyRevenue / transactionCount) : 0;

      // Process trend data
      const trendMap = new Map<string, { redemptions: number; redemption_value: number }>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendMap.set(dateStr, { redemptions: 0, redemption_value: 0 });
      }
      
      weekRedemptionsResult.data?.forEach((r: any) => {
        const dateStr = r.redeemed_at.split('T')[0];
        if (trendMap.has(dateStr)) {
          const current = trendMap.get(dateStr)!;
          current.redemptions += 1;
          current.redemption_value += r.value || 0;
        }
      });

      const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        redemptions: data.redemptions,
        redemption_value: data.redemption_value,
        revenue: data.redemption_value
      }));

      // Process top drinks
      const drinkStats = new Map<string, { name: string; count: number; redemption_value: number }>();
      topDrinksResult.data?.forEach((r: any) => {
        const drinkName = r.drink || 'Unknown';
        if (!drinkStats.has(drinkName)) {
          drinkStats.set(drinkName, { name: drinkName, count: 0, redemption_value: 0 });
        }
        const current = drinkStats.get(drinkName)!;
        current.count += 1;
        current.redemption_value += r.value || 0;
      });

      const topDrinks = Array.from(drinkStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((d) => ({ ...d, revenue: d.redemption_value }));

      stats = {
        daily_redemptions: todayRedemptionsResult.count || 0,
        daily_revenue: dailyRevenue,
        returning_rate: returningRate,
        avg_basket_value: avgBasketValue,
        trends,
        top_drinks: topDrinks
      };

    } else if (role === 'staff' && venue_id) {
      // Staff stats - today's operations
      const [
        todayRedemptionsResult,
        capsResult,
        recentRedemptionsResult,
        topDrinksResult
      ] = await Promise.all([
        // Today's redemption count
        supabaseClient
          .from('redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('venue_id', venue_id)
          .gte('redeemed_at', todayISO),
        
        // Venue caps
        supabaseClient
          .from('caps')
          .select('daily')
          .eq('venue_id', venue_id)
          .maybeSingle(),
        
        // Recent redemptions for live feed
        supabaseClient
          .from('redemptions')
          .select('id, drink, value, redeemed_at, user_id')
          .eq('venue_id', venue_id)
          .gte('redeemed_at', todayISO)
          .order('redeemed_at', { ascending: false })
          .limit(10),
        
        // Today's top drinks
        supabaseClient
          .from('redemptions')
          .select('drink, value')
          .eq('venue_id', venue_id)
          .gte('redeemed_at', todayISO)
      ]);

      // Calculate cap usage
      const dailyCap = capsResult.data?.daily || 100;
      const todayCount = todayRedemptionsResult.count || 0;
      const capUsage = Math.min(100, Math.round((todayCount / dailyCap) * 100));

      // Process top drinks
      const drinkStats = new Map<string, { name: string; count: number; redemption_value: number }>();
      topDrinksResult.data?.forEach((r: any) => {
        const drinkName = r.drink || 'Unknown';
        if (!drinkStats.has(drinkName)) {
          drinkStats.set(drinkName, { name: drinkName, count: 0, redemption_value: 0 });
        }
        const current = drinkStats.get(drinkName)!;
        current.count += 1;
        current.redemption_value += r.value || 0;
      });

      const topDrinks = Array.from(drinkStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((d) => ({ ...d, revenue: d.redemption_value }));

      // Format recent redemptions
      const recentRedemptions = recentRedemptionsResult.data?.map((r: any) => ({
        id: r.id,
        drink: r.drink,
        value: r.value,
        time: r.redeemed_at,
      })) || [];

      stats = {
        today_redemptions: todayCount,
        cap_usage: capUsage,
        daily_cap: dailyCap,
        recent_redemptions: recentRedemptions,
        top_drinks: topDrinks
      };

    } else if (role === 'brand') {
      // Brand stats - only figures that are actually measured
      const [venuesResult] = await Promise.all([
        supabaseClient
          .from('venues')
          .select('id', { count: 'exact', head: true })
          .eq('is_paused', false)
      ]);

      stats = {
        total_partner_venues: venuesResult.count || 0,
        active_campaigns: null,
        monthly_reach: null,
        conversion_rate: null
      };
    }

    console.log(`[get-dashboard-stats] returning keys for ${role}:`, Object.keys(stats));

    return jsonResponse(stats, 200);

  } catch (error) {
    console.error('[get-dashboard-stats] Error:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
