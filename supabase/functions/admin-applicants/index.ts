import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lists landing-page sign-ups and partner applications from the marketing
// (CRM) Supabase project and stores the admin's handling in applicant_reviews.
// Required secrets: CRM_SUPABASE_URL, CRM_SERVICE_ROLE_KEY (read-only use).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUSES = ["uj", "kapcsolatban", "felvett", "elutasitva"];
const SOURCES = ["waitlist", "venue_application"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization header required" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) return json({ error: "Admin access required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "list";

    if (action === "list") {
      const crmUrl = Deno.env.get("CRM_SUPABASE_URL");
      const crmKey = Deno.env.get("CRM_SERVICE_ROLE_KEY");
      if (!crmUrl || !crmKey) {
        return json({ error: "crm_not_configured" }, 503);
      }
      const crm = createClient(crmUrl, crmKey, { auth: { persistSession: false } });

      const [waitlist, partners, reviews] = await Promise.all([
        crm
          .from("waitlist_signups")
          .select("id, email, source, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        crm
          .from("venue_applications")
          .select("id, name, email, phone, venue_name, venue_type, address_city, daily_customer_count, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("applicant_reviews").select("*"),
      ]);

      if (waitlist.error) throw waitlist.error;
      if (partners.error) throw partners.error;
      if (reviews.error) throw reviews.error;

      return json({
        waitlist: waitlist.data,
        partners: partners.data,
        reviews: reviews.data,
      });
    }

    if (action === "update" || action === "request_offer") {
      const { source, external_id } = body;
      if (!SOURCES.includes(source) || typeof external_id !== "string") {
        return json({ error: "Invalid source or external_id" }, 400);
      }

      const patch: Record<string, unknown> = {
        source,
        external_id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (action === "update") {
        if (body.status !== undefined) {
          if (!STATUSES.includes(body.status)) return json({ error: "Invalid status" }, 400);
          patch.status = body.status;
        }
        if (body.note !== undefined) {
          patch.note = typeof body.note === "string" ? body.note.slice(0, 2000) : null;
        }
      } else {
        if (source !== "venue_application") {
          return json({ error: "Offers are only for partner applications" }, 400);
        }
        patch.offer_status = "kert";
        patch.offer_requested_at = new Date().toISOString();
      }

      if (action === "request_offer") {
        // Partner applicants join the partner pipeline, where the offer generator picks them up.
        const crmUrl = Deno.env.get("CRM_SUPABASE_URL");
        const crmKey = Deno.env.get("CRM_SERVICE_ROLE_KEY");
        if (!crmUrl || !crmKey) return json({ error: "crm_not_configured" }, 503);
        const crm = createClient(crmUrl, crmKey, { auth: { persistSession: false } });
        const { data: app, error: appError } = await crm
          .from("venue_applications")
          .select("id, name, email, phone, venue_name, venue_type, address_city")
          .eq("id", external_id)
          .single();
        if (appError || !app) return json({ error: "Application not found" }, 404);

        const { error: leadError } = await supabase.from("partner_leads").upsert(
          {
            id: `jelentkezo-${app.id}`,
            name: app.venue_name || app.name || app.email || "Jelentkező",
            venue_type: app.venue_type,
            address: app.address_city,
            email: app.email,
            phone: app.phone,
            source: "Partnerjelentkezés a weboldalon",
            applicant_id: app.id,
            stage: 4,
            offer_request: {
              requested_at: new Date().toISOString(),
              drink: "",
              slot: "14-16",
              daily_cap: 5,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (leadError) throw leadError;
      }

      const { data, error } = await supabase
        .from("applicant_reviews")
        .upsert(patch, { onConflict: "source,external_id" })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_email: user.email,
        action: "update",
        resource_type: "applicant",
        resource_id: data.id,
        new_value: patch,
      }).then(() => undefined, () => undefined);

      return json({ review: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-applicants error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
