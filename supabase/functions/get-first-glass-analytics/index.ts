import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FirstGlassAnalytics {
  total_free_drinks: number;
  total_matched_transactions: number;
  match_rate: number;
  average_subsequent_spend: number;
  top_second_orders: Array<{
    category: string;
    count: number;
    avg_price: number;
  }>;
  upsell_rate: number;
  avg_time_to_second_order: number;
  total_additional_revenue: number;
  roi_multiplier: number;
  free_drink_cost_estimate: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { venue_id, start_date, end_date } = await req.json();

    if (!venue_id) {
      return new Response(JSON.stringify({ error: "venue_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default to last 30 days if no date range provided
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get venue info for integration type check
    const { data: venue } = await supabase
      .from("venues")
      .select("id, name, integration_type")
      .eq("id", venue_id)
      .single();

    if (!venue) {
      return new Response(JSON.stringify({ error: "Venue not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only Goorderz venues have full analytics
    if (venue.integration_type !== 'goorderz') {
      return new Response(JSON.stringify({
        error: "First Glass analytics requires Goorderz integration",
        integration_type: venue.integration_type,
        available: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get total redemptions in date range
    const { count: totalRedemptions } = await supabase
      .from("redemptions")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venue_id)
      .gte("redeemed_at", startDate.toISOString())
      .lte("redeemed_at", endDate.toISOString())
      .eq("status", "success");

    // Get matched redemptions with transaction data
    const { data: matches } = await supabase
      .from("redemption_transaction_matches")
      .select(`
        id,
        redemption_id,
        transaction_id,
        match_confidence,
        time_delta_seconds,
        redemptions!inner(id, venue_id, redeemed_at),
        pos_transactions(id, total_amount, items)
      `)
      .eq("redemptions.venue_id", venue_id)
      .gte("redemptions.redeemed_at", startDate.toISOString())
      .lte("redemptions.redeemed_at", endDate.toISOString())
      .not("transaction_id", "is", null);

    const matchedCount = matches?.length || 0;
    const matchRate = totalRedemptions ? matchedCount / totalRedemptions : 0;

    // Calculate analytics from matched transactions
    let totalSpend = 0;
    let totalTimeDelta = 0;
    const categoryStats: Record<string, { count: number; totalPrice: number }> = {};
    let transactionsWithItems = 0;

    for (const match of matches || []) {
      const transaction = match.pos_transactions;
      if (!transaction) continue;

      totalSpend += transaction.total_amount || 0;
      totalTimeDelta += match.time_delta_seconds || 0;

      // Parse items if available
      const items = transaction.items as any[];
      if (items && Array.isArray(items) && items.length > 0) {
        transactionsWithItems++;
        for (const item of items) {
          const category = item.category || 'Egyéb';
          if (!categoryStats[category]) {
            categoryStats[category] = { count: 0, totalPrice: 0 };
          }
          categoryStats[category].count += item.quantity || 1;
          categoryStats[category].totalPrice += (item.price || 0) * (item.quantity || 1);
        }
      }
    }

    // Build top categories
    const topSecondOrders = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        avg_price: stats.count > 0 ? Math.round(stats.totalPrice / stats.count) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate averages
    const avgSpend = matchedCount > 0 ? Math.round(totalSpend / matchedCount) : 0;
    const avgTimeDelta = matchedCount > 0 ? Math.round(totalTimeDelta / matchedCount / 60) : 0; // in minutes
    const upsellRate = totalRedemptions ? matchedCount / totalRedemptions : 0;

    // Estimate free drink cost (average 500 HUF per drink)
    const estimatedFreeDrinkCost = (totalRedemptions || 0) * 500;
    const roiMultiplier = estimatedFreeDrinkCost > 0 ? totalSpend / estimatedFreeDrinkCost : 0;

    const analytics: FirstGlassAnalytics = {
      total_free_drinks: totalRedemptions || 0,
      total_matched_transactions: matchedCount,
      match_rate: Math.round(matchRate * 100) / 100,
      average_subsequent_spend: avgSpend,
      top_second_orders: topSecondOrders,
      upsell_rate: Math.round(upsellRate * 100) / 100,
      avg_time_to_second_order: avgTimeDelta,
      total_additional_revenue: totalSpend,
      roi_multiplier: Math.round(roiMultiplier * 100) / 100,
      free_drink_cost_estimate: estimatedFreeDrinkCost,
    };

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-first-glass-analytics:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
