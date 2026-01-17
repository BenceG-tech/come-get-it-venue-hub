import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityLogRequest {
  event_type: string;
  venue_id?: string;
  metadata?: Record<string, unknown>;
  device_info?: string;
  app_version?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ActivityLogRequest = await req.json();
    const { event_type, venue_id, metadata, device_info, app_version } = body;

    // Validate event_type
    const validEventTypes = [
      "app_open",
      "app_close", 
      "login",
      "signup",
      "qr_generated",
      "venue_viewed",
      "reward_viewed",
      "redemption_attempt",
      "redemption_success",
      "profile_viewed",
      "search_performed",
      "notification_received",
      "notification_clicked"
    ];

    if (!event_type || !validEventTypes.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid event_type. Must be one of: ${validEventTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP address from request
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      req.headers.get("cf-connecting-ip") || 
                      "unknown";

    // Insert activity log
    const { error: insertError } = await supabase
      .from("user_activity_logs")
      .insert({
        user_id: user.id,
        event_type,
        venue_id: venue_id || null,
        metadata: metadata || {},
        device_info: device_info || null,
        app_version: app_version || null,
        ip_address: ipAddress
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log activity" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_seen_at in profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        last_seen_at: new Date().toISOString(),
        device_info: device_info ? { latest: device_info, app_version } : undefined
      })
      .eq("id", user.id);

    if (updateError) {
      console.warn("Failed to update profile last_seen_at:", updateError);
      // Don't fail the request, just log
    }

    console.log(`Activity logged: ${event_type} for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error logging activity:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
