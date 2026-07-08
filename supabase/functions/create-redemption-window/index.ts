import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randPrefix(len = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

function randSecret(len = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Returns ISO weekday 1..7 (Mon..Sun) in Europe/Budapest
function budapestDayAndTime(now: Date): { isoDay: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const ss = parts.find((p) => p.type === "second")?.value ?? "00";
  return { isoDay: map[wd] ?? 1, hhmm: `${hh}:${mm}:${ss}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Unauthorized", code: "NO_AUTH" }, 401);
    }

    const supaAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supaAuth.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims) {
      return json({ success: false, error: "Invalid token", code: "INVALID_AUTH" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { venue_id, drink_id, user_latitude, user_longitude, device_fingerprint } = body ?? {};

    if (!venue_id || typeof venue_id !== "string") {
      return json({ success: false, error: "venue_id required", code: "VENUE_REQUIRED" }, 400);
    }

    // Admin check
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", userId).single();
    const isAdmin = profile?.is_admin === true;

    // Venue
    const { data: venue, error: vErr } = await supabase
      .from("venues")
      .select("id, name, is_paused, coordinates, redemption_radius_m, csr_enabled, default_charity_id, donation_per_redemption")
      .eq("id", venue_id).maybeSingle();
    if (vErr || !venue) return json({ success: false, error: "Venue not found", code: "VENUE_NOT_FOUND" }, 404);
    if (venue.is_paused) return json({ success: false, error: "Venue paused", code: "VENUE_PAUSED" }, 403);

    // Distance check
    if (!isAdmin) {
      const { data: platformRow } = await supabase
        .from("platform_settings").select("value").eq("key", "enforce_redemption_radius").maybeSingle();
      const enforce = platformRow?.value === true || platformRow?.value === "true" ||
        (platformRow?.value && typeof platformRow.value === "object" && (platformRow.value as any).enabled === true);
      // Default true if row missing
      const enforceRadius = platformRow === null || platformRow === undefined ? true : Boolean(enforce);

      if (enforceRadius) {
        const vLat = (venue.coordinates as any)?.lat;
        const vLng = (venue.coordinates as any)?.lng;
        const uLat = Number(user_latitude);
        const uLng = Number(user_longitude);
        if (Number.isFinite(vLat) && Number.isFinite(vLng) && Number.isFinite(uLat) && Number.isFinite(uLng)) {
          const allowed = venue.redemption_radius_m ?? 100;
          const dist = haversineM(uLat, uLng, vLat, vLng);
          if (dist > allowed) {
            return json({
              success: false, error: "Too far from venue", code: "TOO_FAR",
              distance_m: Math.round(dist), allowed_m: allowed,
            }, 403);
          }
        }
      }
    }

    // Drink selection
    let drink;
    if (drink_id) {
      const { data } = await supabase
        .from("venue_drinks").select("id, drink_name, image_url, category")
        .eq("id", drink_id).eq("venue_id", venue_id).maybeSingle();
      drink = data;
    } else {
      const { data } = await supabase
        .from("venue_drinks").select("id, drink_name, image_url, category")
        .eq("venue_id", venue_id).eq("is_free_drink", true).limit(1).maybeSingle();
      drink = data;
    }
    if (!drink) return json({ success: false, error: "No free drink configured", code: "NO_FREE_DRINK" }, 400);

    // Free drink windows
    const { data: windows } = await supabase
      .from("free_drink_windows").select("days, start_time, end_time")
      .eq("drink_id", drink.id);

    if (windows && windows.length > 0) {
      const { isoDay, hhmm } = budapestDayAndTime(new Date());
      const active = windows.some((w: any) => {
        const days: number[] = Array.isArray(w.days) ? w.days : [];
        if (!days.includes(isoDay)) return false;
        return String(w.start_time) <= hhmm && hhmm <= String(w.end_time);
      });
      if (!active && !isAdmin) {
        return json({
          success: false, error: "No active free drink window", code: "NO_ACTIVE_WINDOW",
          windows,
        }, 400);
      }
    }

    // Global daily limit (1/day/user Europe/Budapest) — bypass for admin
    if (!isAdmin) {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      const y = parts.find(p => p.type === "year")!.value;
      const m = parts.find(p => p.type === "month")!.value;
      const d = parts.find(p => p.type === "day")!.value;
      // Budapest day boundaries in UTC (approx via offset)
      const startLocal = new Date(`${y}-${m}-${d}T00:00:00+01:00`);
      const endLocal = new Date(startLocal.getTime() + 24 * 3600 * 1000);
      const { count } = await supabase
        .from("redemptions").select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("redeemed_at", startLocal.toISOString())
        .lt("redeemed_at", endLocal.toISOString());
      if ((count ?? 0) > 0) {
        return json({ success: false, error: "Daily free drink already redeemed", code: "USER_GLOBAL_DAILY_LIMIT" }, 403);
      }
    }

    // Token
    const prefix = randPrefix(6);
    const secret = randSecret(32);
    const token = `CGI-${prefix}-${secret}`;
    const token_hash = await sha256(token);
    const issued_at = new Date();
    const expires_at = new Date(issued_at.getTime() + 120 * 1000);

    const { data: inserted, error: insErr } = await supabase
      .from("redemption_tokens")
      .insert({
        token_hash, token_prefix: prefix, user_id: userId, venue_id, drink_id: drink.id,
        device_fingerprint: device_fingerprint ?? null,
        issued_at: issued_at.toISOString(), expires_at: expires_at.toISOString(),
        status: "issued",
      })
      .select("id").single();

    if (insErr || !inserted) {
      console.error("token insert failed", insErr);
      return json({ success: false, error: "Failed to create token", code: "TOKEN_CREATE_FAILED" }, 500);
    }

    return json({
      success: true,
      token,
      token_id: inserted.id,
      token_prefix: prefix,
      expires_at: expires_at.toISOString(),
      expires_in_seconds: 120,
      qr_payload: token,
      venue: { id: venue.id, name: venue.name },
      drink: { id: drink.id, name: drink.drink_name, image_url: drink.image_url, category: drink.category },
    });
  } catch (e) {
    console.error("unexpected", e);
    return json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
  }
});
