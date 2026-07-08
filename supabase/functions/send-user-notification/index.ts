import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<any[]> {
  if (messages.length === 0) return [];
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  const json = await res.json();
  console.log("[send-user-notification] expo response", JSON.stringify(json).slice(0, 500));
  return Array.isArray(json?.data) ? json.data : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Allow either admin JWT OR internal service key (used by process-scheduled-notifications)
    const authHeader = req.headers.get("Authorization");
    const internalKey = req.headers.get("x-internal-key");
    const isInternal = internalKey && internalKey === supabaseServiceKey;

    let adminUserId: string | null = null;
    if (!isInternal) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !adminUser) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: adminProfile } = await supabase
        .from("profiles").select("is_admin").eq("id", adminUser.id).single();
      if (!adminProfile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      adminUserId = adminUser.id;
    }

    const body = await req.json();
    const { user_id, title, body: messageBody, template_id, deep_link, data: extraData } = body;

    if (!user_id || !title || !messageBody) {
      return new Response(JSON.stringify({ error: "user_id, title, and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetUser } = await supabase
      .from("profiles").select("id, name, device_info").eq("id", user_id).single();
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load push tokens for this user
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", user_id);

    const validTokens = (tokens || []).filter(t => typeof t.token === "string" && t.token.startsWith("ExponentPushToken"));
    let expoResults: any[] = [];
    let deliveryStatus: "sent" | "failed" | "no_token" = "no_token";

    if (validTokens.length > 0) {
      const messages: ExpoPushMessage[] = validTokens.map(t => ({
        to: t.token,
        title,
        body: messageBody,
        sound: "default",
        priority: "high",
        data: {
          template_id: template_id || null,
          deep_link: deep_link || null,
          ...(extraData || {}),
        },
      }));
      try {
        expoResults = await sendExpoPush(messages);
        const anyOk = expoResults.some((r: any) => r?.status === "ok");
        deliveryStatus = anyOk ? "sent" : "failed";
      } catch (e) {
        console.error("[send-user-notification] expo push failed", e);
        deliveryStatus = "failed";
      }
    }

    // Log the outcome
    const { data: logEntry, error: logError } = await supabase
      .from("notification_logs")
      .insert({
        template_id: template_id || null,
        user_id,
        title,
        body: messageBody,
        status: deliveryStatus,
        platform: targetUser.device_info?.platform || validTokens[0]?.platform || "unknown",
        metadata: {
          sent_by: adminUserId,
          manual_send: !isInternal,
          via: "expo_push",
          token_count: validTokens.length,
          expo_results: expoResults,
        },
      })
      .select()
      .single();

    if (logError) console.error("[send-user-notification] log insert failed", logError);

    return new Response(
      JSON.stringify({
        success: deliveryStatus !== "failed",
        notification_id: logEntry?.id ?? null,
        status: deliveryStatus,
        tokens_targeted: validTokens.length,
        expo_results: expoResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-user-notification] error", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
