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

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user data for story generation
    const [
      profileResult,
      pointsResult,
      redemptionsResult,
      activityLogsResult,
      notificationsResult,
      patternsResult
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_points").select("*").eq("user_id", userId).single(),
      supabase.from("redemptions").select(`*, venues:venue_id (name)`).eq("user_id", userId).order("redeemed_at", { ascending: false }).limit(30),
      supabase.from("user_activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("notification_logs").select("*").eq("user_id", userId).order("sent_at", { ascending: false }).limit(10),
      supabase.from("user_behavior_patterns").select("*").eq("user_id", userId).single()
    ]);

    const profile = profileResult.data;
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const points = pointsResult.data;
    const redemptions = redemptionsResult.data || [];
    const activityLogs = activityLogsResult.data || [];
    const notifications = notificationsResult.data || [];
    const patterns = patternsResult.data;

    // Calculate stats for story
    const now = Date.now();
    const daysSinceRegistration = Math.floor((now - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLastActivity = profile.last_seen_at
      ? Math.floor((now - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    const recentRedemptions = redemptions.filter(r => new Date(r.redeemed_at).getTime() > thirtyDaysAgo);
    const veryRecentRedemptions = redemptions.filter(r => new Date(r.redeemed_at).getTime() > fourteenDaysAgo);
    
    // Get venue distribution
    const venueCounts: Record<string, { name: string; count: number }> = {};
    redemptions.forEach(r => {
      const name = r.venues?.name || "Ismeretlen";
      if (!venueCounts[r.venue_id]) {
        venueCounts[r.venue_id] = { name, count: 0 };
      }
      venueCounts[r.venue_id].count++;
    });
    const topVenues = Object.values(venueCounts).sort((a, b) => b.count - a.count).slice(0, 3);

    // Get drink preferences
    const drinkCounts: Record<string, number> = {};
    redemptions.forEach(r => {
      drinkCounts[r.drink] = (drinkCounts[r.drink] || 0) + 1;
    });
    const topDrinks = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Notification engagement
    const openedNotifications = notifications.filter(n => n.opened_at).length;
    const notificationOpenRate = notifications.length > 0 ? Math.round((openedNotifications / notifications.length) * 100) : 0;

    // Activity trend
    const weekOneAgo = activityLogs.filter(l => {
      const t = new Date(l.created_at).getTime();
      return t > now - 7 * 24 * 60 * 60 * 1000;
    }).length;
    const weekTwoAgo = activityLogs.filter(l => {
      const t = new Date(l.created_at).getTime();
      return t > now - 14 * 24 * 60 * 60 * 1000 && t <= now - 7 * 24 * 60 * 60 * 1000;
    }).length;

    const activityTrend = weekTwoAgo > 0 ? ((weekOneAgo - weekTwoAgo) / weekTwoAgo * 100) : 0;

    // Build context for AI
    const userContext = {
      name: profile.name,
      daysSinceRegistration,
      daysSinceLastActivity,
      totalRedemptions: redemptions.length,
      recentRedemptions: recentRedemptions.length,
      veryRecentRedemptions: veryRecentRedemptions.length,
      points: points?.balance || 0,
      lifetimePoints: points?.lifetime_earned || 0,
      topVenues,
      topDrinks,
      patterns: patterns?.patterns || [],
      clusterName: patterns?.cluster_name,
      notificationOpenRate,
      activityTrend: Math.round(activityTrend),
      signupSource: profile.signup_source
    };

    // Generate story with AI
    let story = "";
    let insights: string[] = [];
    let recommendation = "";

    if (lovableApiKey) {
      try {
        const prompt = `Te egy üzleti elemző vagy aki egy italbeváltó app felhasználóinak viselkedését elemzi. 
        
A felhasználó adatai:
- Név: ${userContext.name}
- Regisztráció óta eltelt napok: ${userContext.daysSinceRegistration}
- Utolsó aktivitás óta eltelt napok: ${userContext.daysSinceLastActivity ?? "Nincs adat"}
- Összes beváltás: ${userContext.totalRedemptions}
- Beváltások az elmúlt 30 napban: ${userContext.recentRedemptions}
- Beváltások az elmúlt 14 napban: ${userContext.veryRecentRedemptions}
- Aktuális pontegyenleg: ${userContext.points}
- Top helyszínek: ${userContext.topVenues.map(v => `${v.name} (${v.count}x)`).join(", ") || "Nincs adat"}
- Top italok: ${userContext.topDrinks.map(([name, count]) => `${name} (${count}x)`).join(", ") || "Nincs adat"}
- Viselkedési minták: ${userContext.patterns.map((p: any) => p.nameHu).join(", ") || "Nincs azonosított minta"}
- Klaszter: ${userContext.clusterName || "Nincs besorolva"}
- Push értesítés megnyitási arány: ${userContext.notificationOpenRate}%
- Aktivitási trend (heti változás): ${userContext.activityTrend > 0 ? "+" : ""}${userContext.activityTrend}%

Készíts egy rövid, max 3-4 mondatos narratív összefoglalót a felhasználóról, ami emberi nyelven elmondja:
1. Ki ez a felhasználó (típus, viselkedés)
2. Mi változott az utóbbi időben
3. Mi a következtetés és mit érdemes tenni

Válaszolj JSON formátumban:
{
  "story": "A narratív összefoglaló...",
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendation": "Konkrét javaslat..."
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Te egy precíz üzleti elemző vagy. Válaszolj kizárólag valid JSON formátumban, magyar nyelven." },
              { role: "user", content: prompt }
            ],
            temperature: 0.85,
            max_tokens: 800
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            // Try to parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                story = parsed.story || "";
                insights = parsed.insights || [];
                recommendation = parsed.recommendation || "";
              } catch {
                story = content;
              }
            } else {
              story = content;
            }
          }
        } else {
          console.error("AI API error:", aiResponse.status);
        }
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
      }
    }

    // Fallback if AI didn't work
    if (!story) {
      // Generate template-based story
      let storyParts: string[] = [];
      
      storyParts.push(`${profile.name} ${daysSinceRegistration} napja csatlakozott és azóta ${redemptions.length}-szer váltott be italt.`);
      
      if (daysSinceLastActivity !== null) {
        if (daysSinceLastActivity > 14) {
          storyParts.push(`⚠️ Az elmúlt ${daysSinceLastActivity} napban nem volt aktív, ami magas lemorzsolódási kockázatot jelez.`);
          insights.push("Magas churn kockázat");
        } else if (daysSinceLastActivity > 7) {
          storyParts.push(`Az utolsó aktivitása ${daysSinceLastActivity} nappal ezelőtt volt.`);
          insights.push("Közepes aktivitás");
        }
      }

      if (topVenues.length > 0) {
        storyParts.push(`Kedvenc helyszíne: ${topVenues[0].name} (${topVenues[0].count} látogatás).`);
      }

      if (veryRecentRedemptions < recentRedemptions / 2 && recentRedemptions > 2) {
        storyParts.push(`📉 Az utóbbi 2 hétben jelentősen csökkent az aktivitása.`);
        insights.push("Csökkenő aktivitási trend");
      }

      if (userContext.patterns.length > 0) {
        insights.push(`Viselkedési minta: ${(userContext.patterns[0] as any).nameHu}`);
      }

      story = storyParts.join(" ");
      
      // Generate recommendation
      if (daysSinceLastActivity !== null && daysSinceLastActivity > 10) {
        recommendation = "Ajánlott személyre szabott visszacsábító promóció küldése exkluzív ajánlattal.";
      } else if (activityTrend < -20) {
        recommendation = "Engagement növelő kampány indítása - új helyszín ajánlatok vagy bónusz pontok.";
      } else {
        recommendation = "Fenntartó kommunikáció - heti értesítések a kedvenc helyszínekről.";
      }
    }

    const response = {
      story,
      insights: insights.slice(0, 5),
      recommendation,
      context: userContext,
      generatedAt: new Date().toISOString()
    };

    console.log(`User story generated for ${userId}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating user story:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
