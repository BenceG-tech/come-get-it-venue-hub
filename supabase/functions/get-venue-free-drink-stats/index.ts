import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FreeDrinkWindow {
  id: string;
  drink_id: string;
  days: number[];
  start_time: string;
  end_time: string;
  timezone: string;
}

interface ActiveFreeDrink {
  id: string;
  name: string;
  image_url?: string;
  category?: string;
  windows: FreeDrinkWindow[];
}

function getTodayStartBudapest(now: Date): Date {
  const budapestFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const budapestDateStr = budapestFormatter.format(now);
  return new Date(`${budapestDateStr}T00:00:00+01:00`);
}

function isWindowActive(
  days: number[],
  startTime: string,
  endTime: string,
  timezone: string,
  now: Date
): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const weekdayStr = parts.find(p => p.type === "weekday")?.value || "";
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  const currentDay = dayMap[weekdayStr] || 1;
  
  if (!days.includes(currentDay)) {
    return false;
  }
  
  const currentMinutes = hour * 60 + minute;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function getNextWindow(
  windows: FreeDrinkWindow[],
  now: Date
): FreeDrinkWindow | null {
  if (!windows.length) return null;
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const weekdayStr = parts.find(p => p.type === "weekday")?.value || "";
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  const currentDay = dayMap[weekdayStr] || 1;
  const currentMinutes = hour * 60 + minute;
  
  // Find next window today
  for (const window of windows) {
    if (!window.days.includes(currentDay)) continue;
    const [startH, startM] = window.start_time.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    if (startMinutes > currentMinutes) {
      return window;
    }
  }
  
  // Find next window in upcoming days
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const checkDay = ((currentDay - 1 + dayOffset) % 7) + 1;
    const dayWindows = windows.filter(w => w.days.includes(checkDay));
    if (dayWindows.length > 0) {
      dayWindows.sort((a, b) => a.start_time.localeCompare(b.start_time));
      return dayWindows[0];
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { venue_id } = await req.json();
    
    if (!venue_id) {
      return new Response(
        JSON.stringify({ error: "venue_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const todayStart = getTodayStartBudapest(now);

    // Fetch venue data
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, name, caps, is_paused")
      .eq("id", venue_id)
      .single();

    if (venueError || !venue) {
      return new Response(
        JSON.stringify({ error: "Venue not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch venue drinks (is_free_drink = true)
    const { data: drinks, error: drinksError } = await supabase
      .from("venue_drinks")
      .select("id, drink_name, image_url, category, is_free_drink")
      .eq("venue_id", venue_id)
      .eq("is_free_drink", true);

    if (drinksError) {
      console.error("Error fetching drinks:", drinksError);
    }

    // Fetch free drink windows
    const { data: windows, error: windowsError } = await supabase
      .from("free_drink_windows")
      .select("id, drink_id, days, start_time, end_time, timezone")
      .eq("venue_id", venue_id);

    if (windowsError) {
      console.error("Error fetching windows:", windowsError);
    }

    // Count today's redemptions
    const { count: todayRedemptions, error: redemptionsError } = await supabase
      .from("redemptions")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venue_id)
      .eq("status", "success")
      .gte("redeemed_at", todayStart.toISOString());

    if (redemptionsError) {
      console.error("Error counting redemptions:", redemptionsError);
    }

    // Build active free drinks with their windows
    const activeFreeDrinks: ActiveFreeDrink[] = (drinks || []).map((drink) => ({
      id: drink.id,
      name: drink.drink_name,
      image_url: drink.image_url,
      category: drink.category,
      windows: (windows || [])
        .filter((w) => w.drink_id === drink.id)
        .map((w) => ({
          id: w.id,
          drink_id: w.drink_id,
          days: w.days,
          start_time: w.start_time,
          end_time: w.end_time,
          timezone: w.timezone,
        })),
    }));

    // Find current active window
    let currentActiveWindow: FreeDrinkWindow | null = null;
    let isActiveNow = false;
    
    for (const window of windows || []) {
      if (isWindowActive(window.days, window.start_time, window.end_time, window.timezone, now)) {
        currentActiveWindow = {
          id: window.id,
          drink_id: window.drink_id,
          days: window.days,
          start_time: window.start_time,
          end_time: window.end_time,
          timezone: window.timezone,
        };
        isActiveNow = !venue.is_paused;
        break;
      }
    }

    // Find next window if not currently active
    const allWindows = (windows || []).map((w) => ({
      id: w.id,
      drink_id: w.drink_id,
      days: w.days,
      start_time: w.start_time,
      end_time: w.end_time,
      timezone: w.timezone,
    }));
    const nextWindow = currentActiveWindow ? null : getNextWindow(allWindows, now);

    // Calculate cap usage
    const caps = venue.caps || { daily: 0, perUser: 1, onExhaust: "close" };
    const dailyLimit = caps.daily || 0;
    const usedCount = todayRedemptions || 0;
    const capUsagePct = dailyLimit > 0 ? (usedCount / dailyLimit) * 100 : 0;

    const response = {
      today_redemptions: usedCount,
      cap_usage_pct: Math.min(capUsagePct, 100),
      active_free_drinks: activeFreeDrinks,
      current_active_window: currentActiveWindow,
      next_window: nextWindow,
      caps: {
        daily: dailyLimit,
        perUserDaily: caps.perUserDaily || caps.perUser || 1,
        hourly: caps.hourly || 0,
        onExhaust: caps.onExhaust || "close",
      },
      is_active_now: isActiveNow,
      is_paused: venue.is_paused,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-venue-free-drink-stats:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
