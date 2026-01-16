import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user points
    const { data: pointsData } = await serviceClient
      .from("user_points")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no points record exists, return defaults
    const points = pointsData || {
      balance: 0,
      lifetime_earned: 0,
      lifetime_spent: 0,
      total_spend: 0,
      last_transaction_at: null,
    };

    // Get recent transactions (last 20)
    const { data: transactions } = await serviceClient
      .from("points_transactions")
      .select(`
        id,
        amount,
        type,
        reference_type,
        venue_id,
        description,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Enrich transactions with venue names
    const venueIds = [...new Set((transactions || []).map(t => t.venue_id).filter(Boolean))];
    let venueMap: Record<string, string> = {};
    
    if (venueIds.length > 0) {
      const { data: venues } = await serviceClient
        .from("venues")
        .select("id, name")
        .in("id", venueIds);
      
      venueMap = (venues || []).reduce((acc, v) => {
        acc[v.id] = v.name;
        return acc;
      }, {} as Record<string, string>);
    }

    const enrichedTransactions = (transactions || []).map(t => ({
      ...t,
      venue_name: t.venue_id ? venueMap[t.venue_id] : null,
    }));

    // Get active promotions count
    const { count: activePromotionsCount } = await serviceClient
      .from("promotions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString());

    return new Response(
      JSON.stringify({
        balance: points.balance,
        lifetime_earned: points.lifetime_earned,
        lifetime_spent: points.lifetime_spent,
        total_spend: points.total_spend,
        last_transaction_at: points.last_transaction_at,
        recent_transactions: enrichedTransactions,
        active_promotions_count: activePromotionsCount || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
