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
    const { user_ids, title, body: messageBody } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title || !messageBody) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 100 users per batch
    if (user_ids.length > 100) {
      return new Response(
        JSON.stringify({ error: "Maximum 100 users per batch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all users exist
    const { data: users } = await supabase
      .from("profiles")
      .select("id, device_info")
      .in("id", user_ids);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid users found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notification log entries for each user
    const notificationLogs = users.map((user) => ({
      user_id: user.id,
      title,
      body: messageBody,
      status: "sent",
      platform: user.device_info?.platform || "unknown",
      metadata: {
        sent_by: adminUser.id,
        bulk_send: true,
        batch_size: user_ids.length,
      },
    }));

    const { error: insertError } = await supabase
      .from("notification_logs")
      .insert(notificationLogs);

    if (insertError) {
      console.error("Failed to log notifications:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log notifications" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Integrate with actual push notification service (Firebase FCM, Expo Push, etc.)
    console.log(`Bulk notification sent to ${users.length} users: ${title}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: users.length,
        message: `Notification sent to ${users.length} users`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending bulk notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
