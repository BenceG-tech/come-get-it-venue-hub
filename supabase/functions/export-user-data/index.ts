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
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user_id from request
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("user_id");

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "user_id parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all user data in parallel
    const [
      profileResult,
      pointsResult,
      redemptionsResult,
      rewardRedemptionsResult,
      notificationsResult,
      activityResult,
      linkedCardsResult,
      achievementsResult,
      tagsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetUserId).single(),
      supabase.from("user_points").select("*").eq("user_id", targetUserId).single(),
      supabase.from("redemptions").select(`
        id, drink, value, redeemed_at, status,
        venue:venues(name)
      `).eq("user_id", targetUserId).order("redeemed_at", { ascending: false }),
      supabase.from("reward_redemptions").select(`
        id, redeemed_at, notes,
        reward:rewards(name, points_required),
        venue:venues(name)
      `).eq("user_id", targetUserId).order("redeemed_at", { ascending: false }),
      supabase.from("notification_logs").select("*").eq("user_id", targetUserId).order("sent_at", { ascending: false }),
      supabase.from("user_activity_logs").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(500),
      supabase.from("linked_cards").select("id, last_four, scheme, is_active, created_at").eq("user_id", targetUserId),
      supabase.from("user_achievements").select("*").eq("user_id", targetUserId),
      supabase.from("user_tags").select("*").eq("user_id", targetUserId),
    ]);

    // Mask sensitive card data
    const maskedCards = linkedCardsResult.data?.map(card => ({
      id: card.id,
      last_four: card.last_four ? `****${card.last_four}` : "****",
      scheme: card.scheme,
      is_active: card.is_active,
      linked_at: card.created_at,
    })) || [];

    // Format the export data
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: targetUserId,
        export_type: "GDPR_DATA_EXPORT",
        data_retention_note: "A Come Get It platform a felhasználói adatokat az adatvédelmi szabályzatnak megfelelően kezeli.",
      },
      profile: profileResult.data ? {
        id: profileResult.data.id,
        name: profileResult.data.name,
        email: profileResult.data.email,
        phone: profileResult.data.phone,
        signup_source: profileResult.data.signup_source,
        created_at: profileResult.data.created_at,
        updated_at: profileResult.data.updated_at,
      } : null,
      points: pointsResult.data ? {
        current_balance: pointsResult.data.balance,
        lifetime_earned: pointsResult.data.lifetime_earned,
        lifetime_spent: pointsResult.data.lifetime_spent,
        total_redemptions: pointsResult.data.total_redemptions,
        last_activity_at: pointsResult.data.last_activity_at,
      } : null,
      free_drink_redemptions: redemptionsResult.data?.map(r => ({
        id: r.id,
        drink: r.drink,
        value_huf: r.value,
        venue_name: (r.venue as any)?.name || "Ismeretlen",
        redeemed_at: r.redeemed_at,
        status: r.status,
      })) || [],
      reward_redemptions: rewardRedemptionsResult.data?.map(r => ({
        id: r.id,
        reward_name: (r.reward as any)?.name || "Ismeretlen",
        points_spent: (r.reward as any)?.points_required || 0,
        venue_name: (r.venue as any)?.name || "Ismeretlen",
        redeemed_at: r.redeemed_at,
        notes: r.notes,
      })) || [],
      notifications_received: notificationsResult.data?.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        sent_at: n.sent_at,
        delivered_at: n.delivered_at,
        opened_at: n.opened_at,
        status: n.status,
      })) || [],
      activity_log: activityResult.data?.map(a => ({
        event_type: a.event_type,
        timestamp: a.created_at,
        device_info: a.device_info,
        app_version: a.app_version,
      })) || [],
      linked_payment_cards: maskedCards,
      achievements: achievementsResult.data?.map(a => ({
        type: a.achievement_type,
        earned_at: a.earned_at,
      })) || [],
      tags: tagsResult.data?.map(t => t.tag) || [],
    };

    return new Response(
      JSON.stringify(exportData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="gdpr_export_${targetUserId}_${new Date().toISOString().split('T')[0]}.json"`,
        } 
      }
    );

  } catch (error) {
    console.error("GDPR export error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
