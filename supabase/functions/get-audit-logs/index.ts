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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const action = url.searchParams.get("action");
    const resourceType = url.searchParams.get("resource_type");
    const actorId = url.searchParams.get("actor_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const search = url.searchParams.get("search");

    // Build query
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (action) {
      query = query.eq("action", action);
    }
    if (resourceType) {
      query = query.eq("resource_type", resourceType);
    }
    if (actorId) {
      query = query.eq("actor_id", actorId);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    if (search) {
      query = query.or(`actor_email.ilike.%${search}%,resource_type.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: logs, count, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching audit logs:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch audit logs" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique action types and resource types for filters
    const { data: actionTypes } = await supabase
      .from("audit_logs")
      .select("action")
      .limit(100);

    const { data: resourceTypes } = await supabase
      .from("audit_logs")
      .select("resource_type")
      .limit(100);

    const uniqueActions = [...new Set(actionTypes?.map(a => a.action) || [])];
    const uniqueResourceTypes = [...new Set(resourceTypes?.map(r => r.resource_type) || [])];

    return new Response(
      JSON.stringify({
        logs: logs || [],
        total: count || 0,
        limit,
        offset,
        filters: {
          actions: uniqueActions,
          resource_types: uniqueResourceTypes,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Get audit logs error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
