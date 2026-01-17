import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT and verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all"; // all, active, inactive, new
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch profiles with optional search
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" });

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply status filter
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (status === "active") {
      query = query.gte("last_seen_at", sevenDaysAgo.toISOString());
    } else if (status === "inactive") {
      query = query.or(`last_seen_at.lt.${thirtyDaysAgo.toISOString()},last_seen_at.is.null`);
    } else if (status === "new") {
      query = query.gte("created_at", sevenDaysAgo.toISOString());
    }

    // Apply pagination and ordering
    query = query
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: profiles, error: profilesError, count } = await query;

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch aggregated stats for each user
    const userIds = profiles?.map(p => p.id) || [];
    
    // Get user points
    const { data: userPoints } = await supabase
      .from("user_points")
      .select("user_id, balance, lifetime_earned")
      .in("user_id", userIds);

    // Get redemption counts
    const { data: redemptionCounts } = await supabase
      .from("redemptions")
      .select("user_id")
      .in("user_id", userIds);

    // Get activity counts (sessions)
    const { data: activityCounts } = await supabase
      .from("user_activity_logs")
      .select("user_id, event_type")
      .in("user_id", userIds)
      .eq("event_type", "app_open");

    // Build user stats map
    const pointsMap = new Map(userPoints?.map(p => [p.user_id, p]) || []);
    const redemptionCountMap = new Map<string, number>();
    (redemptionCounts || []).forEach(r => {
      redemptionCountMap.set(r.user_id, (redemptionCountMap.get(r.user_id) || 0) + 1);
    });
    const sessionCountMap = new Map<string, number>();
    (activityCounts || []).forEach(a => {
      sessionCountMap.set(a.user_id, (sessionCountMap.get(a.user_id) || 0) + 1);
    });

    // Build response
    const users = (profiles || []).map(profile => {
      const points = pointsMap.get(profile.id);
      const redemptions = redemptionCountMap.get(profile.id) || 0;
      const sessions = sessionCountMap.get(profile.id) || 0;

      // Calculate status
      let userStatus = "inactive";
      if (profile.last_seen_at) {
        const lastSeen = new Date(profile.last_seen_at);
        if (lastSeen >= sevenDaysAgo) {
          userStatus = "active";
        }
      }
      if (new Date(profile.created_at) >= sevenDaysAgo) {
        userStatus = "new";
      }

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        last_seen_at: profile.last_seen_at,
        signup_source: profile.signup_source,
        is_admin: profile.is_admin,
        status: userStatus,
        points_balance: points?.balance || 0,
        lifetime_points: points?.lifetime_earned || 0,
        total_redemptions: redemptions,
        total_sessions: sessions
      };
    });

    console.log(`Fetched ${users.length} users (total: ${count})`);

    return new Response(
      JSON.stringify({ 
        users, 
        total: count,
        limit,
        offset
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching users:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
