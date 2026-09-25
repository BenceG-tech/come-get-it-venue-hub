import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Permanently disabled legacy endpoint: the mobile app now authenticates
// redemptions through create-redemption-window / confirm-redemption.
// This handler intentionally performs no database access and does not
// import or use the service-role client.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      code: "LEGACY_ENDPOINT_DISABLED",
      message: "Use create-redemption-window for authenticated redemption.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
