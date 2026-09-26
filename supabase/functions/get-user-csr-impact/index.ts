import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type DonationRow = {
  id?: string;
  created_at?: string;
  amount_huf?: number | null;
  venue_id?: string | null;
  charity_id?: string | null;
  venues?: { name?: string | null } | null;
  charities?: { name?: string | null } | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: donations, error } = await admin
    .from('csr_donations')
    .select('id,created_at,amount_huf,venue_id,charity_id,venues(name),charities(name)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<DonationRow[]>();

  if (error) return json({ error: error.message }, 500);

  const rows = donations ?? [];
  const totalDonationsHuf = rows.reduce((sum, row) => sum + (typeof row.amount_huf === 'number' ? row.amount_huf : 0), 0);
  const donationCount = rows.length;
  const recentDonations = rows.slice(0, 10).map((row) => ({
    date: row.created_at ?? new Date().toISOString(),
    amount: row.amount_huf ?? 0,
    impact_description: '+1 ember kap ma tiszta vizet',
    charity_name: row.charities?.name ?? 'Come Get It GIVE',
    venue_name: row.venues?.name ?? 'Partnerhely',
  }));

  return json({
    total_donations_huf: totalDonationsHuf,
    donation_count: donationCount,
    favorite_charity: rows[0]?.charities?.name ?? null,
    recent_donations: recentDonations,
    stats: {
      total_donations_huf: totalDonationsHuf,
      total_impact_units: donationCount,
      total_redemptions: donationCount,
      current_streak_days: 0,
      longest_streak_days: 0,
      last_donation_date: rows[0]?.created_at ?? null,
      global_rank: null,
      city_rank: null,
    },
    next_milestone: donationCount < 10
      ? {
          target_units: 10,
          current_units: donationCount,
          remaining_units: Math.max(0, 10 - donationCount),
          description: 'Tartsd életben a GIVE hatásod.',
        }
      : null,
    leaderboard_position: null,
  });
});
