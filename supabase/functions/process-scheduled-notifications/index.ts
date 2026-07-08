import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Runs on a cron (recommended every 1-5 minutes).
 * Picks up notification_templates with send_mode='scheduled' whose scheduled_at <= now(),
 * targets users, fires push via send-user-notification (internal call), and marks the template as sent.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nowIso = new Date().toISOString();

    // Fetch due templates. We assume notification_templates has: id, title_hu, body_hu, deep_link, targeting jsonb,
    // send_mode, scheduled_at, is_active, and a nullable sent_at timestamp for idempotency.
    const { data: due, error: dueErr } = await supabase
      .from("notification_templates")
      .select("id, title_hu, body_hu, deep_link, targeting, scheduled_at, is_active, send_mode, sent_at")
      .eq("send_mode", "scheduled")
      .eq("is_active", true)
      .is("sent_at", null)
      .lte("scheduled_at", nowIso);

    if (dueErr) throw dueErr;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    const perTemplate: any[] = [];

    for (const tpl of due) {
      // Simple targeting: 'all' = every profile; otherwise honor targeting.user_ids if provided
      const targeting: any = tpl.targeting || {};
      let userIds: string[] = [];

      if (Array.isArray(targeting.user_ids) && targeting.user_ids.length > 0) {
        userIds = targeting.user_ids;
      } else {
        const { data: users } = await supabase
          .from("profiles")
          .select("id")
          .limit(10000);
        userIds = (users || []).map((u: any) => u.id);
      }

      let sent = 0;
      let failed = 0;
      for (const uid of userIds) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-user-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-key": supabaseServiceKey,
            },
            body: JSON.stringify({
              user_id: uid,
              title: tpl.title_hu,
              body: tpl.body_hu,
              template_id: tpl.id,
              deep_link: tpl.deep_link,
            }),
          });
          const j = await res.json();
          if (j?.success) sent++; else failed++;
        } catch (e) {
          console.error("[process-scheduled] send failed", e);
          failed++;
        }
      }

      // Mark template as sent (idempotency)
      await supabase
        .from("notification_templates")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", tpl.id);

      totalSent += sent;
      perTemplate.push({ template_id: tpl.id, targeted: userIds.length, sent, failed });
    }

    return new Response(
      JSON.stringify({ ok: true, processed: due.length, total_sent: totalSent, details: perTemplate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[process-scheduled-notifications] error", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
