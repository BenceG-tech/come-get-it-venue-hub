import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Register (or upsert) an Expo push token for the currently authenticated user.
 * Called from the Rork mobile app on login and whenever the token refreshes.
 *
 * Body: { token: string, platform?: 'ios'|'android'|'web', device_id?: string, device_name?: string, app_version?: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const pushToken: string = body?.token;
    const platform: string = body?.platform || "unknown";
    const device_id: string | null = body?.device_id ?? null;
    const device_name: string | null = body?.device_name ?? null;
    const app_version: string | null = body?.app_version ?? null;

    if (!pushToken || typeof pushToken !== "string") {
      return new Response(JSON.stringify({ error: "token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert on unique token: if this device already registered elsewhere, re-assign to this user.
    const { data, error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: user.id,
          token: pushToken,
          platform,
          device_id,
          device_name,
          app_version,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      )
      .select()
      .single();

    if (error) {
      console.error("[register-push-token] upsert failed", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[register-push-token] error", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
