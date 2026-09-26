import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const venueId = typeof body.venue_id === 'string' ? body.venue_id.trim() : '';

  let query = admin
    .from('rewards')
    .select('*')
    .eq('active', true)
    .gte('valid_until', today())
    .order('priority', { ascending: false, nullsFirst: false })
    .order('points_required', { ascending: true });

  if (UUID_RE.test(venueId)) {
    query = query.or(`venue_id.eq.${venueId},partner_id.eq.${venueId},is_global.eq.true`);
  } else {
    query = query.eq('is_global', true);
  }

  const { data, error } = await query;
  if (error) return json({ success: false, error: error.message }, 500);

  return json({ success: true, rewards: data ?? [] });
});
