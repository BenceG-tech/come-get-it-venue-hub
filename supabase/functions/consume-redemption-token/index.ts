import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isValidTokenFormat(value: string) {
  return /^CGI-[A-Z0-9]{6}-[A-Za-z0-9]{32}$/.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Missing authorization header", code: "NO_AUTH" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse({ success: false, error: "Server configuration error", code: "SERVER_CONFIG" }, 500);
    }

    const jwt = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
    if (authError || !user) {
      return jsonResponse({ success: false, error: "Invalid or expired token", code: "INVALID_AUTH" }, 401);
    }

    const body = await req.json().catch(() => null) as { token?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return jsonResponse({ success: false, error: "Token is required", code: "TOKEN_REQUIRED" }, 400);
    }
    if (!isValidTokenFormat(token)) {
      return jsonResponse({ success: false, error: "Invalid token format", code: "INVALID_FORMAT" }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await service.rpc("consume_redemption_token_atomic", {
      p_token_hash: await sha256(token),
      p_staff_id: user.id,
    });

    if (error) {
      console.error("Atomic redemption failed", error.code);
      return jsonResponse({ success: false, error: "Failed to consume token", code: "TOKEN_CONSUME_FAILED" }, 500);
    }

    const result = data as {
      success?: boolean;
      code?: string;
      error?: string;
      redemption?: { id?: string };
      consumed_at?: string;
    };

    if (!result?.success) {
      const statusByCode: Record<string, number> = {
        NOT_FOUND: 404,
        VENUE_UNAUTHORIZED: 403,
        ALREADY_CONSUMED: 409,
        DAILY_LIMIT_OR_ALREADY_CONSUMED: 409,
        INVALID_STATUS: 410,
        EXPIRED: 410,
      };
      return jsonResponse(result, statusByCode[result?.code || ""] || 400);
    }

    if (result.redemption?.id) {
      fetch(`${supabaseUrl}/functions/v1/match-redemption-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ redemption_id: result.redemption.id }),
      }).catch((matchError) => console.error("Matching trigger failed", matchError));
    }

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("Unexpected consume-redemption-token error", error);
    return jsonResponse({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
  }
});
