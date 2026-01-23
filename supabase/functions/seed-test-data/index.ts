import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Venue data from database
const VENUES = [
  { id: "46e22a84-b299-4896-8b23-4f294e1d3d58", name: "Vinozza", weight: 0.35 },
  { id: "725da57b-1c47-41a5-a308-11da9993494e", name: "Bartl Janos", weight: 0.25 },
  { id: "f67d7d8d-f664-48fd-8519-332713268bb3", name: "A KERT Bisztró", weight: 0.20 },
  { id: "b284be91-d0ef-4c2a-bf89-b9132729bf86", name: "BuBu", weight: 0.12 },
  { id: "fb1a7c64-95e5-4ad7-b351-a5206ce4de59", name: "Kiscsibe", weight: 0.08 },
];

const DRINKS = [
  { id: "dd0d634b-7164-4e58-8615-a22e60785536", name: "Peroni", venue_id: "46e22a84-b299-4896-8b23-4f294e1d3d58" },
  { id: "591cee0c-1beb-4fe0-8cb8-8456bfa098cd", name: "Bodzás Limonádé", venue_id: "46e22a84-b299-4896-8b23-4f294e1d3d58" },
  { id: "eeeeed48-641e-4094-8d72-91ef19813f12", name: "Peroni", venue_id: "725da57b-1c47-41a5-a308-11da9993494e" },
  { id: "f26a4f88-83c9-47e2-bb72-a122e771ffe6", name: "Limonádé", venue_id: "fb1a7c64-95e5-4ad7-b351-a5206ce4de59" },
];

// Virtual user "profiles" - using existing user ID but simulating different personas
const EXISTING_USER_ID = "46b15f9d-ed46-41b0-aa6a-5aa2334c407e";

const ACTIVITY_TYPES = [
  "app_open",
  "venue_view",
  "qr_generated",
  "reward_viewed",
  "notification_clicked",
  "profile_updated",
  "venue_searched",
];

const DRINK_NAMES = [
  "Peroni", "Bodzás Limonádé", "Limonádé", "Aperol Spritz", "Mojito", 
  "Gin Tonic", "Craft IPA", "Házi Bor", "Cappuccino", "Espresso Martini"
];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandomVenue(): typeof VENUES[0] {
  const r = Math.random();
  let cumulative = 0;
  for (const venue of VENUES) {
    cumulative += venue.weight;
    if (r <= cumulative) return venue;
  }
  return VENUES[0];
}

function getDayWeight(dayOfWeek: number): number {
  // 0=Sunday, 1=Monday, ... 6=Saturday
  if (dayOfWeek === 5 || dayOfWeek === 6) return 0.9; // Fri-Sat
  if (dayOfWeek === 0) return 0.3; // Sunday
  return 0.4; // Mon-Thu
}

function getHourWeight(hour: number): number {
  // Peak hours 17:00-21:00
  if (hour >= 17 && hour <= 21) return 0.9;
  if (hour >= 12 && hour <= 16) return 0.5;
  if (hour >= 10 && hour <= 11) return 0.3;
  return 0.1;
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateRandomDateWithHour(daysAgo: number): Date {
  const now = new Date();
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  
  // Adjust for day weight - prefer weekends
  const dayWeight = getDayWeight(date.getDay());
  if (Math.random() > dayWeight && daysAgo > 1) {
    // Move to Friday or Saturday
    const daysToWeekend = (5 - date.getDay() + 7) % 7 || 7;
    if (daysToWeekend <= 2) {
      date.setDate(date.getDate() + daysToWeekend);
    }
  }
  
  // Set random hour weighted towards peak times
  let hour = randomInt(10, 23);
  const hourWeight = getHourWeight(hour);
  if (Math.random() > hourWeight) {
    hour = randomInt(17, 21); // Force peak hour
  }
  date.setHours(hour, randomInt(0, 59), randomInt(0, 59), 0);
  
  return date;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already seeded
    const { count: redemptionCount } = await supabase
      .from("redemptions")
      .select("*", { count: "exact", head: true });
    
    if (redemptionCount && redemptionCount > 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Database already has redemptions, skipping seed",
          redemptionCount 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      redemptions: 0,
      activity_logs: 0,
      user_points: 0,
      points_transactions: 0,
    };

    const userId = EXISTING_USER_ID;

    // Track used venue+date combinations to enforce 1 redemption per day per venue
    // Key format: "venue_id:YYYY-MM-DD"
    const usedVenueDays = new Set<string>();

    // 1. Create redemptions respecting 1 per day per venue rule
    console.log("Creating redemptions with 1/day/venue rule...");
    const redemptionsToInsert: any[] = [];
    
    // Generate up to 100 valid redemptions (since we're limited by 30 days * 5 venues = 150 max)
    let attempts = 0;
    const maxAttempts = 500;
    const targetRedemptions = 100;
    
    while (redemptionsToInsert.length < targetRedemptions && attempts < maxAttempts) {
      attempts++;
      
      const venue = weightedRandomVenue();
      
      // Time distribution: 40% last 7 days, 25% 8-14 days, 20% 15-21 days, 15% 22-30 days
      let daysAgo: number;
      const timeRand = Math.random();
      if (timeRand < 0.40) daysAgo = randomInt(0, 7);
      else if (timeRand < 0.65) daysAgo = randomInt(8, 14);
      else if (timeRand < 0.85) daysAgo = randomInt(15, 21);
      else daysAgo = randomInt(22, 30);
      
      const redeemDate = generateRandomDateWithHour(daysAgo);
      const dateKey = getDateKey(redeemDate);
      const venueDay = `${venue.id}:${dateKey}`;
      
      // Skip if this venue+day combo was already used
      if (usedVenueDays.has(venueDay)) {
        continue;
      }
      
      // Mark as used
      usedVenueDays.add(venueDay);
      
      const venueDrinks = DRINKS.filter(d => d.venue_id === venue.id);
      const drink = venueDrinks.length > 0 ? randomChoice(venueDrinks) : null;
      const drinkName = drink ? drink.name : randomChoice(DRINK_NAMES);
      
      redemptionsToInsert.push({
        user_id: userId,
        venue_id: venue.id,
        drink_id: drink?.id || null,
        drink: drinkName,
        value: randomInt(800, 2500),
        redeemed_at: redeemDate.toISOString(),
        status: "success",
        metadata: {
          test_data: true,
          venue_name: venue.name,
        },
      });
    }

    // Batch insert redemptions
    const { error: redemptionError } = await supabase
      .from("redemptions")
      .insert(redemptionsToInsert);
    
    if (redemptionError) {
      console.error("Error inserting redemptions:", redemptionError);
      throw redemptionError;
    }
    results.redemptions = redemptionsToInsert.length;
    console.log(`Created ${results.redemptions} redemptions (respecting 1/day/venue rule)`);

    // 2. Create activity logs (500+)
    console.log("Creating activity logs...");
    const activityLogsToInsert: any[] = [];
    
    for (let i = 0; i < 500; i++) {
      const eventDate = generateRandomDateWithHour(randomInt(0, 30));
      const eventType = randomChoice(ACTIVITY_TYPES);
      const venue = eventType === "venue_view" ? weightedRandomVenue() : null;
      
      activityLogsToInsert.push({
        user_id: userId,
        event_type: eventType,
        venue_id: venue?.id || null,
        created_at: eventDate.toISOString(),
        device_info: randomChoice(["iOS 17.0", "Android 14", "iOS 16.5", "Android 13"]),
        app_version: randomChoice(["1.2.0", "1.1.5", "1.2.1", "1.0.9"]),
        metadata: {
          test_data: true,
          session_duration_seconds: randomInt(30, 600),
        },
      });
    }

    // Batch insert activity logs
    const { error: activityError } = await supabase
      .from("user_activity_logs")
      .insert(activityLogsToInsert);
    
    if (activityError) {
      console.error("Error inserting activity logs:", activityError);
      throw activityError;
    }
    results.activity_logs = activityLogsToInsert.length;
    console.log(`Created ${results.activity_logs} activity logs`);

    // 3. Create/update user points
    console.log("Creating user points...");
    
    const userPointsData = {
      user_id: userId,
      balance: 650,
      lifetime_earned: 2100,
      lifetime_spent: 1450,
      total_spend: 125000,
      last_transaction_at: new Date().toISOString(),
    };

    const { error: pointsError } = await supabase
      .from("user_points")
      .upsert(userPointsData, { onConflict: "user_id" });
    
    if (pointsError) {
      console.error("Error upserting user points:", pointsError);
      throw pointsError;
    }
    results.user_points = 1;
    console.log(`Created/updated user points`);

    // 4. Create points transactions (100+)
    console.log("Creating points transactions...");
    const pointsTransactionsToInsert: any[] = [];
    
    // Earning transactions
    for (let i = 0; i < 80; i++) {
      const venue = weightedRandomVenue();
      const earnDate = generateRandomDateWithHour(randomInt(0, 30));
      
      pointsTransactionsToInsert.push({
        user_id: userId,
        amount: randomInt(10, 100),
        type: "earn",
        reference_type: "transaction",
        venue_id: venue.id,
        description: `Vásárlás utáni pontjóváírás - ${venue.name}`,
        created_at: earnDate.toISOString(),
      });
    }
    
    // Spending transactions
    for (let i = 0; i < 20; i++) {
      const spendDate = generateRandomDateWithHour(randomInt(0, 25));
      
      pointsTransactionsToInsert.push({
        user_id: userId,
        amount: -randomInt(50, 200),
        type: "spend",
        reference_type: "reward_redemption",
        description: "Jutalom beváltása",
        created_at: spendDate.toISOString(),
      });
    }

    const { error: transactionsError } = await supabase
      .from("points_transactions")
      .insert(pointsTransactionsToInsert);
    
    if (transactionsError) {
      console.error("Error inserting points transactions:", transactionsError);
      throw transactionsError;
    }
    results.points_transactions = pointsTransactionsToInsert.length;
    console.log(`Created ${results.points_transactions} points transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test data seeded successfully (with 1 drink/day/venue rule)",
        results,
        userId,
        note: "Redemptions now respect the 1 drink per day per venue per user rule"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
