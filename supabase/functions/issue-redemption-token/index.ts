import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IssueTokenRequest {
  venue_id: string;
  drink_id?: string;
  device_fingerprint: string;
}

// Generate random string
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// Hash token with SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Check if current time is within a free drink window
function isWindowActive(
  days: number[],
  startTime: string,
  endTime: string,
  timezone: string,
  now: Date
): boolean {
  // Get current day (0 = Sunday, 1 = Monday, etc.)
  const currentDay = now.getDay();
  
  if (!days.includes(currentDay)) {
    return false;
  }

  // Parse times and compare
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: IssueTokenRequest = await req.json();
    const { venue_id, drink_id, device_fingerprint } = body;

    if (!venue_id || !device_fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: "venue_id and device_fingerprint are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();

    // 1. Check if venue exists and is active
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, name, is_paused")
      .eq("id", venue_id)
      .single();

    if (venueError || !venue) {
      return new Response(
        JSON.stringify({ success: false, error: "Venue not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (venue.is_paused) {
      return new Response(
        JSON.stringify({ success: false, error: "Venue is currently paused" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check for active free drink window
    const { data: windows, error: windowsError } = await supabase
      .from("free_drink_windows")
      .select("id, days, start_time, end_time, timezone, drink_id")
      .eq("venue_id", venue_id);

    if (windowsError) {
      console.error("Error fetching windows:", windowsError);
      return new Response(
        JSON.stringify({ success: false, error: "Error checking free drink windows" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active window
    const activeWindow = windows?.find((w) =>
      isWindowActive(w.days, w.start_time, w.end_time, w.timezone, now)
    );

    if (!activeWindow) {
      return new Response(
        JSON.stringify({ success: false, error: "No active free drink window", code: "NO_ACTIVE_WINDOW" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use drink from window or provided drink_id
    const selectedDrinkId = drink_id || activeWindow.drink_id;

    // 3. Get drink details
    let drinkData = null;
    if (selectedDrinkId) {
      const { data: drink } = await supabase
        .from("venue_drinks")
        .select("id, drink_name, image_url, category")
        .eq("id", selectedDrinkId)
        .single();
      drinkData = drink;
    }

    // If no specific drink, get any free drink for the venue
    if (!drinkData) {
      const { data: freeDrink } = await supabase
        .from("venue_drinks")
        .select("id, drink_name, image_url, category")
        .eq("venue_id", venue_id)
        .eq("is_free_drink", true)
        .limit(1)
        .single();
      drinkData = freeDrink;
    }

    if (!drinkData) {
      return new Response(
        JSON.stringify({ success: false, error: "No free drink configured for this venue" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Rate limiting - check if device already has a token in last 5 minutes
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    
    const { data: recentTokens, error: rateLimitError } = await supabase
      .from("token_rate_limits")
      .select("id")
      .eq("venue_id", venue_id)
      .eq("identifier", device_fingerprint)
      .eq("identifier_type", "device")
      .gte("issued_at", fiveMinutesAgo);

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (recentTokens && recentTokens.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded. Please wait 5 minutes between token requests.",
          code: "RATE_LIMITED",
          retry_after_seconds: 300
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Check venue caps
    const { data: caps } = await supabase
      .from("caps")
      .select("daily, hourly, on_exhaust, alt_offer_text")
      .eq("venue_id", venue_id)
      .single();

    if (caps) {
      // Count today's redemptions
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const { count: todayCount } = await supabase
        .from("redemptions")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venue_id)
        .gte("redeemed_at", todayStart.toISOString());

      if (caps.daily && todayCount !== null && todayCount >= caps.daily) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: caps.alt_offer_text || "Daily redemption limit reached",
            code: "DAILY_CAP_REACHED"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Count this hour's redemptions
      if (caps.hourly) {
        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);
        
        const { count: hourCount } = await supabase
          .from("redemptions")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venue_id)
          .gte("redeemed_at", hourStart.toISOString());

        if (hourCount !== null && hourCount >= caps.hourly) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: caps.alt_offer_text || "Hourly redemption limit reached",
              code: "HOURLY_CAP_REACHED"
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 6. Generate token
    const tokenPrefix = generateRandomString(6).toUpperCase();
    const tokenSecret = generateRandomString(32);
    const fullToken = `CGI-${tokenPrefix}-${tokenSecret}`;
    const tokenHash = await hashToken(fullToken);

    // Token expires in 2 minutes
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);

    // 7. Save token to database
    const { error: insertError } = await supabase
      .from("redemption_tokens")
      .insert({
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        venue_id: venue_id,
        drink_id: drinkData.id,
        device_fingerprint: device_fingerprint,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: "issued",
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Record rate limit
    await supabase
      .from("token_rate_limits")
      .insert({
        venue_id: venue_id,
        identifier: device_fingerprint,
        identifier_type: "device",
        issued_at: now.toISOString(),
      });

    // 9. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        token: fullToken,
        token_prefix: tokenPrefix,
        expires_at: expiresAt.toISOString(),
        expires_in_seconds: 120,
        drink: {
          id: drinkData.id,
          name: drinkData.drink_name,
          image_url: drinkData.image_url,
          category: drinkData.category,
        },
        venue: {
          id: venue.id,
          name: venue.name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
