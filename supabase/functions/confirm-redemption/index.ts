import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Permanently disabled compatibility stub: guest-side redemption confirmation
// is no longer allowed. Redemptions must be confirmed by an authenticated
// partner (POS staff) via QR scan. This handler intentionally performs no
// database access and does not import or use the service-role client.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, code: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      code: "PARTNER_SCAN_REQUIRED",
      message: "A beváltást kizárólag bejelentkezett partner erősítheti meg QR-beolvasással.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
