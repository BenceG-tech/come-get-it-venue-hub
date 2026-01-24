import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchResult {
  redemption_id: string;
  transaction_id?: string;
  saltedge_transaction_id?: string;
  match_confidence: number;
  match_method: string;
  time_delta_seconds: number;
}

function calculateConfidence(timeDeltaSeconds: number): number {
  if (timeDeltaSeconds < 900) return 1.0;    // < 15 min
  if (timeDeltaSeconds < 1800) return 0.8;   // < 30 min
  if (timeDeltaSeconds < 3600) return 0.6;   // < 60 min
  if (timeDeltaSeconds < 7200) return 0.4;   // < 120 min
  return 0.2; // > 120 min
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { redemption_id, venue_id, user_id, redeemed_at, batch_mode } = await req.json();

    // Single redemption matching
    if (redemption_id) {
      const result = await matchSingleRedemption(supabase, redemption_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch mode: match all unmatched redemptions for a venue
    if (batch_mode && venue_id) {
      const results = await matchVenueRedemptions(supabase, venue_id);
      return new Response(JSON.stringify({ matched: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct match with provided data
    if (venue_id && user_id && redeemed_at) {
      const result = await findMatchingTransaction(supabase, venue_id, user_id, redeemed_at);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in match-redemption-transaction:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function matchSingleRedemption(supabase: any, redemptionId: string): Promise<MatchResult | null> {
  // Get the redemption details
  const { data: redemption, error: redemptionError } = await supabase
    .from("redemptions")
    .select("id, venue_id, user_id, redeemed_at")
    .eq("id", redemptionId)
    .single();

  if (redemptionError || !redemption) {
    console.error("Redemption not found:", redemptionError);
    return null;
  }

  // Check if already matched
  const { data: existingMatch } = await supabase
    .from("redemption_transaction_matches")
    .select("id")
    .eq("redemption_id", redemptionId)
    .maybeSingle();

  if (existingMatch) {
    console.log("Redemption already matched:", redemptionId);
    return null;
  }

  // Get venue integration type
  const { data: venue } = await supabase
    .from("venues")
    .select("id, integration_type")
    .eq("id", redemption.venue_id)
    .single();

  if (!venue) {
    console.error("Venue not found for redemption:", redemptionId);
    return null;
  }

  return findMatchingTransaction(supabase, redemption.venue_id, redemption.user_id, redemption.redeemed_at, redemptionId, venue.integration_type);
}

async function findMatchingTransaction(
  supabase: any, 
  venueId: string, 
  userId: string, 
  redeemedAt: string,
  redemptionId?: string,
  integrationType?: string
): Promise<MatchResult | null> {
  const redemptionTime = new Date(redeemedAt);
  const maxWindowMs = 120 * 60 * 1000; // 120 minutes
  const windowEnd = new Date(redemptionTime.getTime() + maxWindowMs);

  // Search for POS transactions (Goorderz)
  if (!integrationType || integrationType === 'goorderz' || integrationType === 'none') {
    const { data: posTransactions } = await supabase
      .from("pos_transactions")
      .select("id, transaction_time, total_amount")
      .eq("venue_id", venueId)
      .eq("user_id", userId)
      .gte("transaction_time", redeemedAt)
      .lte("transaction_time", windowEnd.toISOString())
      .order("transaction_time", { ascending: true })
      .limit(1);

    if (posTransactions && posTransactions.length > 0) {
      const transaction = posTransactions[0];
      const transactionTime = new Date(transaction.transaction_time);
      const timeDelta = Math.floor((transactionTime.getTime() - redemptionTime.getTime()) / 1000);
      const confidence = calculateConfidence(timeDelta);

      const matchResult: MatchResult = {
        redemption_id: redemptionId || "",
        transaction_id: transaction.id,
        match_confidence: confidence,
        match_method: "time_window",
        time_delta_seconds: timeDelta,
      };

      // Save the match if we have a redemption_id
      if (redemptionId) {
        await supabase.from("redemption_transaction_matches").insert({
          redemption_id: redemptionId,
          transaction_id: transaction.id,
          match_confidence: confidence,
          match_method: "time_window",
          time_delta_seconds: timeDelta,
        });
      }

      return matchResult;
    }
  }

  // Search for Salt Edge/Fidel transactions
  if (!integrationType || integrationType === 'saltedge') {
    const { data: bankTransactions } = await supabase
      .from("fidel_transactions")
      .select("id, transaction_date, amount")
      .eq("venue_id", venueId)
      .eq("user_id", userId)
      .gte("transaction_date", redeemedAt)
      .lte("transaction_date", windowEnd.toISOString())
      .order("transaction_date", { ascending: true })
      .limit(1);

    if (bankTransactions && bankTransactions.length > 0) {
      const transaction = bankTransactions[0];
      const transactionTime = new Date(transaction.transaction_date);
      const timeDelta = Math.floor((transactionTime.getTime() - redemptionTime.getTime()) / 1000);
      const confidence = calculateConfidence(timeDelta) * 0.9; // Slightly lower confidence for bank transactions

      const matchResult: MatchResult = {
        redemption_id: redemptionId || "",
        saltedge_transaction_id: transaction.id,
        match_confidence: confidence,
        match_method: "time_window",
        time_delta_seconds: timeDelta,
      };

      // Save the match if we have a redemption_id
      if (redemptionId) {
        await supabase.from("redemption_transaction_matches").insert({
          redemption_id: redemptionId,
          saltedge_transaction_id: transaction.id,
          match_confidence: confidence,
          match_method: "time_window",
          time_delta_seconds: timeDelta,
        });
      }

      return matchResult;
    }
  }

  return null;
}

async function matchVenueRedemptions(supabase: any, venueId: string): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  // Get unmatched redemptions from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: redemptions } = await supabase
    .from("redemptions")
    .select("id, venue_id, user_id, redeemed_at")
    .eq("venue_id", venueId)
    .gte("redeemed_at", sevenDaysAgo.toISOString())
    .order("redeemed_at", { ascending: true });

  if (!redemptions) return results;

  // Get venue integration type
  const { data: venue } = await supabase
    .from("venues")
    .select("integration_type")
    .eq("id", venueId)
    .single();

  for (const redemption of redemptions) {
    // Check if already matched
    const { data: existingMatch } = await supabase
      .from("redemption_transaction_matches")
      .select("id")
      .eq("redemption_id", redemption.id)
      .maybeSingle();

    if (existingMatch) continue;

    const match = await findMatchingTransaction(
      supabase, 
      redemption.venue_id, 
      redemption.user_id, 
      redemption.redeemed_at,
      redemption.id,
      venue?.integration_type
    );

    if (match) {
      results.push(match);
    }
  }

  return results;
}
