import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Consumer-safe field list — no admin/internal columns are exposed. */
const REWARD_FIELDS =
  'id,venue_id,name,description,points_required,valid_until,active,image_url,category,is_global,partner_id,priority,terms_conditions,max_redemptions,current_redemptions';

/** Current date in Europe/Budapest (YYYY-MM-DD). */
function todayBudapest(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole);

  // (1) Bearer token must be a valid Supabase Auth user token.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return json({ success: false, error: 'Missing authorization token' }, 401);
  }
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData?.user) {
    return json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const venueId = typeof body.venue_id === 'string' ? body.venue_id.trim() : '';

  let query = admin
    .from('rewards')
    .select(REWARD_FIELDS)
    .eq('active', true)
    .gte('valid_until', todayBudapest())
    .order('priority', { ascending: false, nullsFirst: false })
    .order('points_required', { ascending: true });

  if (UUID_RE.test(venueId)) {
    query = query.or(`venue_id.eq.${venueId},partner_id.eq.${venueId},is_global.eq.true`);
  } else {
    query = query.eq('is_global', true);
  }

  const { data, error } = await query;
  if (error) return json({ success: false, error: error.message }, 500);

  // (4) Only in-stock rewards: uncapped, or current_redemptions below the cap.
  const inStock = (data ?? []).filter((r: Record<string, unknown>) =>
    r.max_redemptions == null ||
    (Number(r.current_redemptions ?? 0) < Number(r.max_redemptions))
  );

  // (5) Non-global rewards are only returned when attached to a known,
  // non-paused venue.
  const venueIds = Array.from(
    new Set(
      inStock
        .filter((r: Record<string, unknown>) => !r.is_global && typeof r.venue_id === 'string')
        .map((r: Record<string, unknown>) => r.venue_id as string)
    )
  );

  const activeVenueIds = new Set<string>();
  if (venueIds.length > 0) {
    const { data: venues } = await admin
      .from('venues')
      .select('id,is_paused')
      .in('id', venueIds);
    for (const v of (venues ?? []) as Array<{ id: string; is_paused: boolean | null }>) {
      if (!v.is_paused) activeVenueIds.add(v.id);
    }
  }

  const rewards = inStock.filter((r: Record<string, unknown>) => {
    if (r.is_global) return true;
    if (typeof r.venue_id !== 'string') return false;
    return activeVenueIds.has(r.venue_id);
  });

  return json({ success: true, rewards });
});
