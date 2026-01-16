import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

interface GoorderzItem {
  name: string;
  category?: string;
  brand?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers?: string[];
}

interface GoorderzTransaction {
  order_id: string;
  venue_external_id: string;
  customer_token?: string;
  items: GoorderzItem[];
  subtotal: number;
  discounts?: { name: string; amount: number }[];
  total: number;
  payment_method?: string;
  staff_id?: string;
  table_number?: string;
  timestamp: string;
}

interface ActivePromotion {
  id: string;
  name: string;
  rule_type: string;
  rule_config: Record<string, unknown>;
  priority: number;
  sponsor_brand_id?: string;
}

interface AppliedPromotion {
  promotion_id: string;
  name: string;
  bonus_points: number;
  type: string;
}

// Verify webhook signature (HMAC)
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expectedSignature;
}

// Calculate points with promotion engine
function calculatePoints(
  transaction: GoorderzTransaction,
  promotions: ActivePromotion[]
): { basePoints: number; bonusPoints: number; appliedPromotions: AppliedPromotion[] } {
  // Base points: 1 point per 100 HUF
  const basePoints = Math.floor(transaction.total / 100);
  let bonusPoints = 0;
  const appliedPromotions: AppliedPromotion[] = [];

  // Sort promotions by priority (higher first)
  const sortedPromotions = [...promotions].sort((a, b) => b.priority - a.priority);

  for (const promo of sortedPromotions) {
    const config = promo.rule_config as Record<string, unknown>;

    switch (promo.rule_type) {
      case "category_multiplier": {
        const targetCategory = (config.category as string)?.toLowerCase();
        const multiplier = (config.multiplier as number) || 1;
        
        for (const item of transaction.items) {
          if (item.category?.toLowerCase() === targetCategory) {
            const itemBasePoints = Math.floor(item.total_price / 100);
            const bonus = Math.floor(itemBasePoints * (multiplier - 1));
            if (bonus > 0) {
              bonusPoints += bonus;
              appliedPromotions.push({
                promotion_id: promo.id,
                name: promo.name,
                bonus_points: bonus,
                type: "category_multiplier",
              });
            }
          }
        }
        break;
      }

      case "brand_bonus": {
        const brandKeywords = (config.brand_keywords as string[]) || [];
        const bonusPointsConfig = (config.bonus_points as number) || 0;
        
        for (const item of transaction.items) {
          const itemBrand = item.brand?.toLowerCase() || "";
          const itemName = item.name.toLowerCase();
          
          const matches = brandKeywords.some(
            (kw) => itemBrand.includes(kw.toLowerCase()) || itemName.includes(kw.toLowerCase())
          );
          
          if (matches) {
            bonusPoints += bonusPointsConfig * item.quantity;
            appliedPromotions.push({
              promotion_id: promo.id,
              name: promo.name,
              bonus_points: bonusPointsConfig * item.quantity,
              type: "brand_bonus",
            });
          }
        }
        break;
      }

      case "time_bonus": {
        const multiplier = (config.multiplier as number) || 1;
        const bonus = Math.floor(basePoints * (multiplier - 1));
        if (bonus > 0) {
          bonusPoints += bonus;
          appliedPromotions.push({
            promotion_id: promo.id,
            name: promo.name,
            bonus_points: bonus,
            type: "time_bonus",
          });
        }
        break;
      }

      case "spending_tier": {
        const minAmount = (config.min_amount as number) || 0;
        const tierBonus = (config.bonus_points as number) || 0;
        
        if (transaction.total >= minAmount) {
          bonusPoints += tierBonus;
          appliedPromotions.push({
            promotion_id: promo.id,
            name: promo.name,
            bonus_points: tierBonus,
            type: "spending_tier",
          });
        }
        break;
      }

      case "combo_bonus": {
        const requiredCategories = (config.required_categories as string[]) || [];
        const comboBonus = (config.bonus_points as number) || 0;
        
        const presentCategories = new Set(
          transaction.items.map((i) => i.category?.toLowerCase()).filter(Boolean)
        );
        
        const hasAllCategories = requiredCategories.every((cat) =>
          presentCategories.has(cat.toLowerCase())
        );
        
        if (hasAllCategories) {
          bonusPoints += comboBonus;
          appliedPromotions.push({
            promotion_id: promo.id,
            name: promo.name,
            bonus_points: comboBonus,
            type: "combo_bonus",
          });
        }
        break;
      }
    }
  }

  return { basePoints, bonusPoints, appliedPromotions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("GOORDERZ_WEBHOOK_SECRET");
    const signature = req.headers.get("X-Webhook-Signature");
    const rawBody = await req.text();

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const transaction: GoorderzTransaction = JSON.parse(rawBody);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find venue by external ID (Goorderz venue mapping)
    // For now, we'll try to match by name or use a venue_external_ids table
    const { data: venue } = await serviceClient
      .from("venues")
      .select("id, name")
      .eq("id", transaction.venue_external_id)
      .single();

    if (!venue) {
      console.error("Venue not found:", transaction.venue_external_id);
      return new Response(
        JSON.stringify({ error: "VENUE_NOT_FOUND", message: "Venue not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user token if provided
    let userId: string | null = null;
    if (transaction.customer_token) {
      // Hash the token
      const encoder = new TextEncoder();
      const data = encoder.encode(transaction.customer_token);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: tokenData } = await serviceClient
        .from("user_qr_tokens")
        .select("user_id, expires_at, used_at")
        .eq("token_hash", tokenHash)
        .single();

      if (tokenData && !tokenData.used_at && new Date(tokenData.expires_at) > new Date()) {
        userId = tokenData.user_id;
        
        // Mark token as used
        await serviceClient
          .from("user_qr_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("token_hash", tokenHash);
      }
    }

    // Get active promotions for this venue
    const now = new Date().toISOString();
    const { data: promotions } = await serviceClient
      .from("promotions")
      .select("id, name, rule_type, rule_config, priority, sponsor_brand_id")
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .or(`scope_type.eq.global,venue_ids.cs.{${venue.id}}`);

    // Calculate points
    const { basePoints, bonusPoints, appliedPromotions } = calculatePoints(
      transaction,
      (promotions || []) as ActivePromotion[]
    );
    const totalPoints = basePoints + bonusPoints;

    // Calculate discount amount
    const discountAmount = transaction.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0;

    // Store POS transaction
    const { data: posTransaction, error: posError } = await serviceClient
      .from("pos_transactions")
      .insert({
        external_order_id: transaction.order_id,
        venue_id: venue.id,
        user_id: userId,
        items: transaction.items,
        subtotal: transaction.subtotal,
        discount_amount: discountAmount,
        total_amount: transaction.total,
        base_points: basePoints,
        bonus_points: bonusPoints,
        total_points: totalPoints,
        applied_promotions: appliedPromotions,
        payment_method: transaction.payment_method,
        staff_id: transaction.staff_id,
        table_number: transaction.table_number,
        transaction_time: transaction.timestamp,
      })
      .select()
      .single();

    if (posError) {
      console.error("POS transaction insert error:", posError);
      return new Response(
        JSON.stringify({ error: "Failed to store transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Award points to user if identified
    if (userId && totalPoints > 0) {
      const { error: pointsError } = await serviceClient.rpc("modify_user_points", {
        p_user_id: userId,
        p_amount: totalPoints,
        p_type: "earn_purchase",
        p_reference_type: "pos_transaction",
        p_reference_id: posTransaction.id,
        p_venue_id: venue.id,
        p_description: `${totalPoints} pont - ${venue.name}`,
        p_spend_amount: transaction.total,
      });

      if (pointsError) {
        console.error("Points award error:", pointsError);
      }
    }

    // Update promotion usage counts
    for (const applied of appliedPromotions) {
      await serviceClient
        .from("promotions")
        .update({ current_uses: serviceClient.rpc("increment_counter", { row_id: applied.promotion_id }) })
        .eq("id", applied.promotion_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: posTransaction.id,
        user_identified: !!userId,
        points_awarded: userId ? totalPoints : 0,
        base_points: basePoints,
        bonus_points: bonusPoints,
        applied_promotions: appliedPromotions.map((p) => p.name),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
