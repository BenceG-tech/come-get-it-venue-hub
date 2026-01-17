import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Parse request body
    const { role = 'admin', venue_id } = await req.json().catch(() => ({}));

    console.log(`[get-dashboard-stats] Fetching stats for role: ${role}, venue_id: ${venue_id}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Build response based on role
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
      const trendMap = new Map<string, { redemptions: number; revenue: number }>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendMap.set(dateStr, { redemptions: 0, revenue: 0 });
      }
      
      trendResult.data?.forEach((r: any) => {
        const dateStr = r.redeemed_at.split('T')[0];
        if (trendMap.has(dateStr)) {
          const current = trendMap.get(dateStr)!;
          current.redemptions += 1;
          current.revenue += r.value || 0;
        }
      });

      const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        redemptions: data.redemptions,
        revenue: data.revenue
      }));

      // Process top venues
      const venueStats = new Map<string, { name: string; count: number; revenue: number }>();
      topVenuesResult.data?.forEach((r: any) => {
        const venueId = r.venue_id;
        const venueName = r.venues?.name || 'Unknown';
        if (!venueStats.has(venueId)) {
          venueStats.set(venueId, { name: venueName, count: 0, revenue: 0 });
        }
        const current = venueStats.get(venueId)!;
        current.count += 1;
        current.revenue += r.value || 0;
      });

      const topVenues = Array.from(venueStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

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

      // Calculate daily revenue
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
      const totalTransactionValue = todayTransactionsResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const transactionCount = todayTransactionsResult.data?.length || 1;
      const avgBasketValue = Math.round(totalTransactionValue / transactionCount);

      // Process trend data
      const trendMap = new Map<string, { redemptions: number; revenue: number }>();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        trendMap.set(dateStr, { redemptions: 0, revenue: 0 });
      }
      
      weekRedemptionsResult.data?.forEach((r: any) => {
        const dateStr = r.redeemed_at.split('T')[0];
        if (trendMap.has(dateStr)) {
          const current = trendMap.get(dateStr)!;
          current.redemptions += 1;
          current.revenue += r.value || 0;
        }
      });

      const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        redemptions: data.redemptions,
        revenue: data.revenue
      }));

      // Process top drinks
      const drinkStats = new Map<string, { name: string; count: number; revenue: number }>();
      topDrinksResult.data?.forEach((r: any) => {
        const drinkName = r.drink || 'Unknown';
        if (!drinkStats.has(drinkName)) {
          drinkStats.set(drinkName, { name: drinkName, count: 0, revenue: 0 });
        }
        const current = drinkStats.get(drinkName)!;
        current.count += 1;
        current.revenue += r.value || 0;
      });

      const topDrinks = Array.from(drinkStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

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
          .single(),
        
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
      const drinkStats = new Map<string, { name: string; count: number; revenue: number }>();
      topDrinksResult.data?.forEach((r: any) => {
        const drinkName = r.drink || 'Unknown';
        if (!drinkStats.has(drinkName)) {
          drinkStats.set(drinkName, { name: drinkName, count: 0, revenue: 0 });
        }
        const current = drinkStats.get(drinkName)!;
        current.count += 1;
        current.revenue += r.value || 0;
      });

      const topDrinks = Array.from(drinkStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Format recent redemptions
      const recentRedemptions = recentRedemptionsResult.data?.map((r: any) => ({
        id: r.id,
        drink: r.drink,
        value: r.value,
        time: r.redeemed_at,
        user_type: 'returning' // Simplified for now
      })) || [];

      stats = {
        today_redemptions: todayCount,
        cap_usage: capUsage,
        daily_cap: dailyCap,
        recent_redemptions: recentRedemptions,
        top_drinks: topDrinks
      };

    } else if (role === 'brand') {
      // Brand stats - placeholder for brand dashboard
      const [venuesResult] = await Promise.all([
        supabaseClient
          .from('venues')
          .select('id', { count: 'exact', head: true })
          .eq('is_paused', false)
      ]);

      stats = {
        total_partner_venues: venuesResult.count || 0,
        active_campaigns: 3, // Placeholder
        monthly_reach: 2500, // Placeholder
        conversion_rate: 12.5 // Placeholder
      };
    }

    console.log(`[get-dashboard-stats] Returning stats for ${role}:`, Object.keys(stats));

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[get-dashboard-stats] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});