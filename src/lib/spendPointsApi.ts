import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// The spend-points tables and RPCs come from the come-get-it-app migration
// 20261001200000_spend_points_and_acquisition and are not in the generated types yet.
const db = supabase as unknown as SupabaseClient;

export interface FreeDrinkImpactRow {
  venue_id: string;
  venue_name: string;
  redemptions: number;
  measurable_redemptions: number;
  converted_redemptions: number;
  new_guest_converted: number;
  total_spend_huf: number;
  avg_spend_huf: number | null;
  returned_30d: number;
}

export interface AcquisitionRow {
  venue_id: string;
  venue_name: string;
  new_users: number;
  venue_code_users: number;
  venue_walk_in_users: number;
  cgi_users: number;
  venue_sourced_active_elsewhere: number;
}

export interface SpendTransactionRow {
  id: string;
  made_on: string;
  amount_cents: number;
  currency: string;
  merchant_name: string | null;
  description: string | null;
  match_method: string | null;
  points_awarded: number | null;
  points_status: string;
  is_refund: boolean;
  is_pending: boolean;
  user_id: string;
  venues: { name: string } | null;
}

export async function fetchFreeDrinkImpact(from: string, to: string, includeTest: boolean): Promise<FreeDrinkImpactRow[]> {
  const { data, error } = await db.rpc("get_venue_free_drink_impact", {
    p_from: from,
    p_to: to,
    p_include_test: includeTest,
  });
  if (error) throw error;
  return (data ?? []) as FreeDrinkImpactRow[];
}

export async function fetchAcquisitionStats(from: string, to: string): Promise<AcquisitionRow[]> {
  const { data, error } = await db.rpc("get_venue_acquisition_stats", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as AcquisitionRow[];
}

export async function fetchReferralCodes(): Promise<Record<string, string | null>> {
  const { data, error } = await db.from("venues").select("id, referral_code");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row: { id: string; referral_code: string | null }) => [row.id, row.referral_code]));
}

export async function saveReferralCode(venueId: string, code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const { error } = await db.from("venues").update({ referral_code: normalized || null }).eq("id", venueId);
  if (error) throw error;
}

export async function fetchSpendTransactions(filters: { from?: string; to?: string; status?: string }): Promise<SpendTransactionRow[]> {
  let query = db
    .from("saltedge_transactions")
    .select("id, made_on, amount_cents, currency, merchant_name, description, match_method, points_awarded, points_status, is_refund, is_pending, user_id, venues:matched_venue_id(name)")
    .order("made_on", { ascending: false })
    .limit(500);
  if (filters.from) query = query.gte("made_on", filters.from);
  if (filters.to) query = query.lte("made_on", filters.to);
  if (filters.status && filters.status !== "all") query = query.eq("points_status", filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SpendTransactionRow[];
}

export interface MockTransactionInput {
  user_id: string;
  venue_id: string;
  amount_huf: number;
  made_on?: string;
  refund?: boolean;
  pending?: boolean;
}

export async function createMockTransaction(input: MockTransactionInput) {
  const { data, error } = await supabase.functions.invoke("saltedge-mock-transaction", { body: input });
  if (error) {
    // FunctionsHttpError keeps the JSON body on context; surface its code/message.
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.message ?? body?.error ?? error.message);
  }
  return data as { ok: boolean; transaction?: { points_awarded: number; points_status: string } };
}
