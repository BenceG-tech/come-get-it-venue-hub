import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Permanently disabled: production test-data seeding is not allowed.
// This handler intentionally performs no database access and does not
// import or use the service-role client.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      code: "ENDPOINT_DISABLED",
      message: "Production test-data seeding is disabled.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
