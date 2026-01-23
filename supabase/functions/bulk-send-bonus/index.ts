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
    const { user_ids, points, reason } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!points || points <= 0 || points > 10000) {
      return new Response(
        JSON.stringify({ error: "points must be between 1 and 10000" }),
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
      .select("id")
      .in("id", user_ids);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid users found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Award points to each user
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        const { error: rpcError } = await supabase.rpc("modify_user_points", {
          p_user_id: user.id,
          p_amount: points,
          p_type: "bonus",
          p_description: reason || "Admin bónusz",
        });

        if (rpcError) {
          console.error(`Failed to award points to ${user.id}:`, rpcError);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error awarding points to ${user.id}:`, err);
        failCount++;
      }
    }

    console.log(`Bulk bonus: ${successCount} success, ${failCount} failed, ${points} points each`);

    return new Response(
      JSON.stringify({
        success: true,
        success_count: successCount,
        fail_count: failCount,
        points_per_user: points,
        total_points: successCount * points,
        message: `${successCount} felhasználónak jóváírva ${points} pont`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending bulk bonus:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
