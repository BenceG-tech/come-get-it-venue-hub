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

    // Verify admin
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

    const body = await req.json();
    const { user_id, title, body: messageBody, template_id } = body;

    if (!user_id || !title || !messageBody) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user exists
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id, name, device_info")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification log entry
    const { data: logEntry, error: logError } = await supabase
      .from("notification_logs")
      .insert({
        template_id: template_id || null,
        user_id,
        title,
        body: messageBody,
        status: "sent", // In production, this would be "queued" until push is confirmed
        platform: targetUser.device_info?.platform || "unknown",
        metadata: {
          sent_by: adminUser.id,
          manual_send: true
        }
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to log notification:", logError);
      return new Response(
        JSON.stringify({ error: "Failed to log notification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Integrate with actual push notification service (Firebase FCM, Expo Push, etc.)
    // For now, we just log the notification as sent
    
    // In production, you would:
    // 1. Get the user's push token from their device_info or a separate tokens table
    // 2. Call the push notification service API
    // 3. Update the log entry status based on the response

    console.log(`Notification sent to user ${user_id}: ${title}`);

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: logEntry.id,
        message: "Notification logged successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});