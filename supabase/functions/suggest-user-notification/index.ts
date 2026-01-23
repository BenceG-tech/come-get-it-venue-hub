import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const userId = body.user_id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user data for AI context
    const [profileResult, pointsResult, redemptionsResult, activityResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_points").select("*").eq("user_id", userId).single(),
      supabase.from("redemptions").select("*, venues:venue_id (name)").eq("user_id", userId).order("redeemed_at", { ascending: false }).limit(10),
      supabase.from("user_activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)
    ]);

    const profile = profileResult.data;
    const points = pointsResult.data;
    const redemptions = redemptionsResult.data || [];
    const activity = activityResult.data || [];

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate user context
    const now = Date.now();
    const daysSinceLastActivity = profile.last_seen_at
      ? Math.floor((now - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const venueVisits: Record<string, { name: string; count: number }> = {};
    redemptions.forEach(r => {
      const venueId = r.venue_id;
      const venueName = r.venues?.name || "Unknown";
      if (!venueVisits[venueId]) {
        venueVisits[venueId] = { name: venueName, count: 0 };
      }
      venueVisits[venueId].count++;
    });

    const favoriteVenues = Object.entries(venueVisits)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([id, data]) => ({ id, ...data }));

    const drinkCounts: Record<string, number> = {};
    redemptions.forEach(r => {
      drinkCounts[r.drink] = (drinkCounts[r.drink] || 0) + 1;
    });
    const favoriteDrinks = Object.entries(drinkCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Determine churn risk
    let churnRisk = "low";
    if (daysSinceLastActivity === null || daysSinceLastActivity > 30) {
      churnRisk = "high";
    } else if (daysSinceLastActivity > 14) {
      churnRisk = "medium";
    }

    // Fetch active free drink windows and promotions
    const [windowsResult, promotionsResult, rewardsResult] = await Promise.all([
      supabase.from("free_drink_windows").select("*, venues:venue_id (name)").limit(5),
      supabase.from("promotions").select("*").eq("is_active", true).limit(5),
      supabase.from("rewards").select("*, venues:venue_id (name)").eq("active", true).order("points_required", { ascending: true }).limit(5)
    ]);

    const freeWindows = windowsResult.data || [];
    const promotions = promotionsResult.data || [];
    const rewards = rewardsResult.data || [];

    // Check if API key is available
    if (!lovableApiKey) {
      // Return mock suggestions if no API key
      const mockSuggestions = generateMockSuggestions(profile, points, daysSinceLastActivity, favoriteVenues, churnRisk);
      return new Response(
        JSON.stringify({ suggestions: mockSuggestions }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI context
    const userContext = {
      name: profile.name,
      days_since_last_activity: daysSinceLastActivity,
      churn_risk: churnRisk,
      current_points: points?.balance || 0,
      lifetime_points: points?.lifetime_earned || 0,
      total_redemptions: redemptions.length,
      favorite_venues: favoriteVenues,
      favorite_drinks: favoriteDrinks,
      recent_activity_count: activity.length
    };

    const availableContext = {
      free_drink_windows: freeWindows.slice(0, 3).map(w => ({
        venue: w.venues?.name,
        days: w.days,
        start_time: w.start_time,
        end_time: w.end_time
      })),
      promotions: promotions.slice(0, 3).map(p => ({
        name: p.name,
        description: p.description
      })),
      reachable_rewards: rewards
        .filter(r => (points?.balance || 0) >= r.points_required * 0.7)
        .slice(0, 3)
        .map(r => ({
          name: r.name,
          points_required: r.points_required,
          venue: r.venues?.name
        }))
    };

    const systemPrompt = `Te egy intelligens értesítés-ajánló rendszer vagy a "Come Get It" hűségprogram számára.
A felhasználó adatai és a kontextus alapján javasolj 2-3 személyre szabott push értesítést.

Felhasználó adatai:
${JSON.stringify(userContext, null, 2)}

Elérhető ajánlatok:
${JSON.stringify(availableContext, null, 2)}

Szabályok:
1. Az üzenetek legyenek személyesek - használd a {name} változót
2. Említsd a kedvenc helyszíneket/italokat ha releváns
3. Ha magas a churn risk, fókuszálj a visszacsábításra
4. Ha közel van egy jutalom, emlékeztesd a pontjaira
5. Az üzenetek legyenek rövidek (max 100 karakter a body)
6. Adj meg prioritást: high/medium/low
7. Adj meg reasoning-ot magyarul

Válaszolj CSAK érvényes JSON formátumban:
{
  "suggestions": [
    {
      "type": "reactivation|points_reminder|free_drink|reward_available|venue_suggestion|general",
      "priority": "high|medium|low",
      "title_hu": "Rövid cím",
      "body_hu": "Az üzenet tartalma {name} használatával",
      "reasoning": "Miért ezt javasoljuk",
      "confidence_score": 0.85
    }
  ]
}`;

    try {
      console.log("Calling AI API with user context:", JSON.stringify(userContext, null, 2));
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generálj személyre szabott értesítési javaslatokat a felhasználónak. Legyél kreatív és változatos!" }
          ],
          temperature: 0.95
        })
      });
      
      console.log("AI API response status:", aiResponse.status);

      if (!aiResponse.ok) {
        console.error("AI API error:", aiResponse.status);
        const mockSuggestions = generateMockSuggestions(profile, points, daysSinceLastActivity, favoriteVenues, churnRisk);
        return new Response(
          JSON.stringify({ suggestions: mockSuggestions }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Log the suggestion for audit
        await supabase.from("ai_notification_suggestions").insert({
          user_id: userId,
          suggestions: parsed.suggestions,
          context: { userContext, availableContext },
          created_by: adminUser.id
        });

        return new Response(
          JSON.stringify(parsed),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (aiError) {
      console.error("AI processing error:", aiError);
    }

    // Fallback to mock suggestions
    const mockSuggestions = generateMockSuggestions(profile, points, daysSinceLastActivity, favoriteVenues, churnRisk);
    return new Response(
      JSON.stringify({ suggestions: mockSuggestions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating suggestions:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateMockSuggestions(
  profile: any,
  points: any,
  daysSinceLastActivity: number | null,
  favoriteVenues: any[],
  churnRisk: string
): any[] {
  const suggestions = [];
  const firstName = profile.name?.split(" ")[0] || "Barátom";

  // Reactivation suggestion for high churn risk
  if (churnRisk === "high") {
    suggestions.push({
      type: "reactivation",
      priority: "high",
      title_hu: "Hiányzol nekünk! 🍺",
      body_hu: `Szia {name}! ${daysSinceLastActivity || 30}+ napja nem jártál nálunk. Gyere be egy ingyen italra!`,
      reasoning: `A felhasználó ${daysSinceLastActivity || 30}+ napja inaktív, magas a lemorzsolódási kockázat.`,
      confidence_score: 0.9
    });
  }

  // Points reminder
  const currentPoints = points?.balance || 0;
  if (currentPoints > 0) {
    suggestions.push({
      type: "points_reminder",
      priority: "medium",
      title_hu: "Pontjaid várnak! 🎯",
      body_hu: `Szia {name}! ${currentPoints} pontod van. Gyere be és használd fel őket!`,
      reasoning: `A felhasználónak ${currentPoints} beváltható pontja van.`,
      confidence_score: 0.75
    });
  }

  // Venue suggestion based on favorites
  if (favoriteVenues.length > 0) {
    const topVenue = favoriteVenues[0];
    suggestions.push({
      type: "venue_suggestion",
      priority: churnRisk === "low" ? "low" : "medium",
      title_hu: `${topVenue.name} vár! 📍`,
      body_hu: `Szia {name}! A kedvenc helyed, a ${topVenue.name}, ma különleges ajánlattal vár!`,
      reasoning: `A felhasználó kedvenc helyszíne: ${topVenue.name} (${topVenue.count} látogatás).`,
      confidence_score: 0.7
    });
  }

  return suggestions.slice(0, 3);
}