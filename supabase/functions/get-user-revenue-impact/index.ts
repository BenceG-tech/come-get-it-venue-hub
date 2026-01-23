import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VenueRevenue {
  venue_id: string;
  venue_name: string;
  free_drinks_count: number;
  free_drinks_value: number;
  pos_spend: number;
  roi: number;
  visits_today: number;
  visits_this_week: number;
  visits_this_month: number;
  visits_total: number;
}

interface RevenueImpact {
  total_free_drinks: number;
  total_free_drinks_value: number;
  total_pos_spend: number;
  overall_roi: number;
  venue_breakdown: VenueRevenue[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const { data: profile } = await supabaseAuth.from("profiles").select("is_admin").eq("id", authUser.id).single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get redemptions grouped by venue
    const { data: redemptions } = await supabase
      .from("redemptions")
      .select(`
        id,
        venue_id,
        value,
        redeemed_at,
        venues!inner(name)
      `)
      .eq("user_id", userId)
      .eq("status", "success");

    // Get POS transactions
    const { data: posTransactions } = await supabase
      .from("pos_transactions")
      .select("venue_id, total_amount, transaction_time")
      .eq("user_id", userId);

    // Calculate date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Group by venue
    const venueMap = new Map<string, VenueRevenue>();

    // Process redemptions
    for (const r of redemptions || []) {
      const venueId = r.venue_id;
      const venueName = (r.venues as any)?.name || "Ismeretlen";
      const redeemedAt = new Date(r.redeemed_at);

      if (!venueMap.has(venueId)) {
        venueMap.set(venueId, {
          venue_id: venueId,
          venue_name: venueName,
          free_drinks_count: 0,
          free_drinks_value: 0,
          pos_spend: 0,
          roi: 0,
          visits_today: 0,
          visits_this_week: 0,
          visits_this_month: 0,
          visits_total: 0,
        });
      }

      const venue = venueMap.get(venueId)!;
      venue.free_drinks_count += 1;
      venue.free_drinks_value += r.value || 0;
      venue.visits_total += 1;

      if (redeemedAt >= todayStart) {
        venue.visits_today += 1;
      }
      if (redeemedAt >= weekStart) {
        venue.visits_this_week += 1;
      }
      if (redeemedAt >= monthStart) {
        venue.visits_this_month += 1;
      }
    }

    // Process POS transactions
    for (const tx of posTransactions || []) {
      const venueId = tx.venue_id;
      if (venueMap.has(venueId)) {
        venueMap.get(venueId)!.pos_spend += tx.total_amount || 0;
      } else {
        // POS transaction without redemption at this venue
        venueMap.set(venueId, {
          venue_id: venueId,
          venue_name: "Ismeretlen",
          free_drinks_count: 0,
          free_drinks_value: 0,
          pos_spend: tx.total_amount || 0,
          roi: 0,
          visits_today: 0,
          visits_this_week: 0,
          visits_this_month: 0,
          visits_total: 0,
        });
      }
    }

    // Calculate ROI per venue
    for (const venue of venueMap.values()) {
      if (venue.free_drinks_value > 0) {
        venue.roi = venue.pos_spend / venue.free_drinks_value;
      }
    }

    // Calculate totals
    const venueBreakdown = Array.from(venueMap.values()).sort((a, b) => b.visits_total - a.visits_total);
    const totalFreeDrinks = venueBreakdown.reduce((sum, v) => sum + v.free_drinks_count, 0);
    const totalFreeDrinksValue = venueBreakdown.reduce((sum, v) => sum + v.free_drinks_value, 0);
    const totalPosSpend = venueBreakdown.reduce((sum, v) => sum + v.pos_spend, 0);
    const overallRoi = totalFreeDrinksValue > 0 ? totalPosSpend / totalFreeDrinksValue : 0;

    const response: RevenueImpact = {
      total_free_drinks: totalFreeDrinks,
      total_free_drinks_value: totalFreeDrinksValue,
      total_pos_spend: totalPosSpend,
      overall_roi: overallRoi,
      venue_breakdown: venueBreakdown,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
