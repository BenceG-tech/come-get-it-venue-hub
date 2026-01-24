import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

// Salt Edge webhook payload structure
interface SaltEdgeWebhookPayload {
  data: {
    id: string;
    connection_id: string;
    account_id: string;
    made_on: string;
    amount: number;
    currency_code: string;
    description: string;
    mode: string;
    status: string;
    category: string;
    extra?: {
      merchant_id?: string;
      mcc?: string;
      original_amount?: number;
      original_currency_code?: string;
    };
  };
  meta: {
    version: string;
    time: string;
  };
}

interface MerchantMatchRules {
  names?: string[];
  mcc?: string[];
  ibans?: string[];
  terminals?: string[];
  contains?: string[];
}

interface VenueWithRules {
  id: string;
  name: string;
  integration_type: string;
  merchant_match_rules: MerchantMatchRules | null;
  points_rules: { per_huf: number; min_amount_huf: number } | null;
}

interface MatchResult {
  venueId: string;
  venueName: string;
  confidence: number;
  matchMethod: string;
}

// Find venue by merchant matching rules
function findVenueByMerchant(
  transaction: { description: string; merchant_name?: string; mcc?: string },
  venues: VenueWithRules[]
): MatchResult | null {
  for (const venue of venues) {
    const rules = venue.merchant_match_rules;
    if (!rules) continue;

    const desc = (transaction.description || "").toLowerCase();
    const mName = (transaction.merchant_name || "").toLowerCase();
    const mcc = transaction.mcc || "";

    // 1. Exact name match (confidence: 1.0)
    if (rules.names?.some(n => mName.includes(n.toLowerCase()))) {
      return { 
        venueId: venue.id, 
        venueName: venue.name, 
        confidence: 1.0, 
        matchMethod: 'name_exact' 
      };
    }

    // 2. Contains match (confidence: 0.9)
    if (rules.contains?.some(c => desc.includes(c.toLowerCase()))) {
      return { 
        venueId: venue.id, 
        venueName: venue.name, 
        confidence: 0.9, 
        matchMethod: 'description_contains' 
      };
    }

    // 3. MCC match (confidence: 0.5 - less specific)
    if (rules.mcc?.includes(mcc)) {
      return { 
        venueId: venue.id, 
        venueName: venue.name, 
        confidence: 0.5, 
        matchMethod: 'mcc_category' 
      };
    }
  }
  return null;
}

// Calculate points based on amount
function calculatePoints(amount: number, pointsRules: { per_huf: number; min_amount_huf: number } | null): number {
  const absoluteAmount = Math.abs(amount);
  const rules = pointsRules || { per_huf: 100, min_amount_huf: 0 };
  
  if (absoluteAmount < rules.min_amount_huf) {
    return 0;
  }
  
  // 1 point per X HUF (default: 100 HUF = 1 point)
  return Math.floor(absoluteAmount / rules.per_huf);
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

    // Parse webhook payload
    const payload: SaltEdgeWebhookPayload = await req.json();
    const txData = payload.data;

    console.log(`[saltedge-webhook] Received transaction: ${txData.id}, amount: ${txData.amount} ${txData.currency_code}`);

    // Skip non-expense transactions (positive amounts are income)
    if (txData.amount >= 0) {
      console.log(`[saltedge-webhook] Skipping income transaction: ${txData.id}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "income_transaction" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Find user from connection
    const { data: connection, error: connError } = await supabase
      .from("saltedge_connections")
      .select("id, customer_id, saltedge_customers(user_id)")
      .eq("se_connection_id", txData.connection_id)
      .single();

    if (connError || !connection) {
      console.error(`[saltedge-webhook] Connection not found: ${txData.connection_id}`, connError);
      return new Response(
        JSON.stringify({ success: false, error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = (connection.saltedge_customers as any)?.user_id;
    if (!userId) {
      console.error(`[saltedge-webhook] User not found for connection: ${txData.connection_id}`);
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if transaction already exists
    const { data: existingTx } = await supabase
      .from("saltedge_transactions")
      .select("id")
      .eq("se_transaction_id", txData.id)
      .single();

    if (existingTx) {
      console.log(`[saltedge-webhook] Transaction already processed: ${txData.id}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get all Salt Edge integrated venues for matching
    const { data: venues, error: venuesError } = await supabase
      .from("venues")
      .select("id, name, integration_type, merchant_match_rules, points_rules")
      .eq("integration_type", "saltedge")
      .eq("is_paused", false);

    if (venuesError) {
      console.error(`[saltedge-webhook] Error fetching venues:`, venuesError);
    }

    // 4. Try to match merchant to venue
    const matchResult = findVenueByMerchant(
      {
        description: txData.description,
        merchant_name: txData.extra?.merchant_id,
        mcc: txData.extra?.mcc,
      },
      venues || []
    );

    const matchedVenueId = matchResult?.venueId || null;
    const matchConfidence = matchResult?.confidence || 0;
    const matchStatus = matchResult ? "matched" : "unmatched";

    // 5. Calculate points if matched
    let pointsAwarded = 0;
    if (matchResult) {
      const matchedVenue = venues?.find(v => v.id === matchResult.venueId);
      pointsAwarded = calculatePoints(txData.amount, matchedVenue?.points_rules || null);
    }

    // 6. Insert transaction record
    const { data: insertedTx, error: insertError } = await supabase
      .from("saltedge_transactions")
      .insert({
        user_id: userId,
        connection_id: connection.id,
        se_transaction_id: txData.id,
        made_on: txData.made_on,
        amount: Math.round(Math.abs(txData.amount) * 100), // Store as cents/fillér
        currency: txData.currency_code,
        merchant_name: txData.extra?.merchant_id || null,
        mcc: txData.extra?.mcc || null,
        description: txData.description,
        raw_payload: payload,
        matched_venue_id: matchedVenueId,
        match_status: matchStatus,
        match_confidence: matchConfidence,
        points_awarded: pointsAwarded,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[saltedge-webhook] Error inserting transaction:`, insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Award points if matched
    if (pointsAwarded > 0 && matchedVenueId) {
      const { error: pointsError } = await supabase.rpc("modify_user_points", {
        p_user_id: userId,
        p_amount: pointsAwarded,
        p_type: "earn",
        p_description: `Salt Edge: ${matchResult?.venueName || 'Partner venue'}`,
        p_reference_type: "saltedge_transaction",
        p_reference_id: insertedTx.id,
        p_venue_id: matchedVenueId,
      });

      if (pointsError) {
        console.error(`[saltedge-webhook] Error awarding points:`, pointsError);
      } else {
        console.log(`[saltedge-webhook] Awarded ${pointsAwarded} points to user ${userId}`);
      }
    }

    // 8. Try to match with recent redemption (async, don't wait)
    if (matchedVenueId) {
      try {
        // Find recent redemption for this user at this venue (last 2 hours)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        
        const { data: recentRedemptions } = await supabase
          .from("redemptions")
          .select("id, redeemed_at")
          .eq("user_id", userId)
          .eq("venue_id", matchedVenueId)
          .gte("redeemed_at", twoHoursAgo)
          .order("redeemed_at", { ascending: false })
          .limit(1);

        if (recentRedemptions && recentRedemptions.length > 0) {
          const redemption = recentRedemptions[0];
          const redemptionTime = new Date(redemption.redeemed_at).getTime();
          const txTime = new Date(txData.made_on).getTime();
          const timeDeltaSeconds = Math.floor((txTime - redemptionTime) / 1000);

          // Only match if transaction is AFTER redemption
          if (timeDeltaSeconds > 0 && timeDeltaSeconds < 7200) {
            await supabase.from("redemption_transaction_matches").insert({
              redemption_id: redemption.id,
              saltedge_transaction_id: insertedTx.id,
              match_confidence: matchConfidence * 0.8, // Slightly lower for bank data
              match_method: "saltedge_time_window",
              time_delta_seconds: timeDeltaSeconds,
            });
            console.log(`[saltedge-webhook] Matched redemption ${redemption.id} with transaction ${insertedTx.id}`);
          }
        }
      } catch (matchError) {
        console.error(`[saltedge-webhook] Redemption matching error:`, matchError);
      }
    }

    console.log(`[saltedge-webhook] Successfully processed transaction ${txData.id}, status: ${matchStatus}, points: ${pointsAwarded}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: insertedTx.id,
        match_status: matchStatus,
        matched_venue: matchResult?.venueName || null,
        points_awarded: pointsAwarded,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[saltedge-webhook] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
