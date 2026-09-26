import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WINDOW_SECONDS = 120;
const MAX_DISTANCE_METERS = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type VenueRow = {
  id: string;
  name: string;
  is_paused?: boolean | null;
  coordinates?: { lat?: number | string; lng?: number | string } | null;
};

type DrinkRow = {
  id: string;
  drink_name: string;
};

type WindowRow = {
  id: string;
  days?: number[] | null;
  start_time: string;
  end_time: string;
  timezone?: string | null;
};

function json(data: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function venueCoordinates(venue: VenueRow): { latitude: number; longitude: number } | null {
  const latitude = numeric(venue.coordinates?.lat);
  const longitude = numeric(venue.coordinates?.lng);
  if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) return null;
  return { latitude, longitude };
}

function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radius = 6371e3;
  const phi1 = (a.latitude * Math.PI) / 180;
  const phi2 = (b.latitude * Math.PI) / 180;
  const deltaPhi = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLambda = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function todayIsoDayInBudapest(): number {
  const day = Number(new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Europe/Budapest' })
    .formatToParts(new Date())
    .find((part) => part.type === 'weekday')?.value
    .replace('Mon', '1')
    .replace('Tue', '2')
    .replace('Wed', '3')
    .replace('Thu', '4')
    .replace('Fri', '5')
    .replace('Sat', '6')
    .replace('Sun', '7'));
  return Number.isFinite(day) ? day : 1;
}

function currentTimeInBudapest(): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Budapest',
  }).format(new Date());
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const body = Array.from(bytes).map((byte) => byte.toString(36).padStart(2, '0')).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return `CGI-${body.slice(0, 6)}-${body.slice(6, 12)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const serverDemoMode = Deno.env.get('DEMO_MODE') === 'true';

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({})) as JsonRecord;
  const venueId = body.venue_id;
  const drinkId = body.drink_id;
  const clientDemoMode = body.demo_mode === true;
  const demoMode = serverDemoMode && clientDemoMode;

  const { data: reviewAccess, error: reviewAccessError } = await admin
    .from('app_review_testers')
    .select('enabled')
    .eq('user_id', userData.user.id)
    .maybeSingle<{ enabled: boolean }>();
  if (reviewAccessError) {
    console.warn('[create-redemption-window] App Review allowlist lookup failed', reviewAccessError.message);
  }
  const appReviewMode = reviewAccess?.enabled === true;
  const bypassVenueChecks = demoMode || appReviewMode;

  if (!isUuid(venueId)) return json({ error: 'Missing or invalid venue_id' }, 400);
  if (drinkId !== null && drinkId !== undefined && !isUuid(drinkId)) return json({ error: 'Invalid drink_id' }, 400);

  const { data: venue, error: venueError } = await admin
    .from('venues')
    .select('id,name,is_paused,coordinates')
    .eq('id', venueId)
    .maybeSingle<VenueRow>();

  if (venueError) return json({ error: 'Venue lookup failed', detail: venueError.message }, 500);
  if (!venue) return json({ error: 'Venue not found' }, 404);
  if (venue.is_paused) return json({ error: 'Venue is paused' }, 403);

  if (!bypassVenueChecks) {
    const venueCoords = venueCoordinates(venue);
    const userLatitude = numeric(body.user_latitude);
    const userLongitude = numeric(body.user_longitude);
    if (!venueCoords) return json({ error: 'VENUE_LOCATION_MISSING' }, 409);
    if (userLatitude === null || userLongitude === null) return json({ error: 'LOCATION_REQUIRED' }, 400);

    const measured = distanceMeters({ latitude: userLatitude, longitude: userLongitude }, venueCoords);
    if (measured > MAX_DISTANCE_METERS) return json({ error: 'TOO_FAR', distance_meters: Math.round(measured) }, 403);
  }

  let drinkQuery = admin.from('venue_drinks').select('id,drink_name').eq('venue_id', venueId).eq('is_free_drink', true);
  if (isUuid(drinkId)) drinkQuery = drinkQuery.eq('id', drinkId);
  const { data: drinks, error: drinkError } = await drinkQuery.limit(1).returns<DrinkRow[]>();
  if (drinkError) return json({ error: 'Drink lookup failed', detail: drinkError.message }, 500);
  const drink = drinks?.[0];
  if (!drink) return json({ error: 'No free drink configured' }, 400);

  if (!bypassVenueChecks) {
    const { data: windows, error: windowError } = await admin
      .from('free_drink_windows')
      .select('id,days,start_time,end_time,timezone')
      .eq('venue_id', venueId)
      .eq('drink_id', drink.id)
      .returns<WindowRow[]>();
    if (windowError) return json({ error: 'Window lookup failed', detail: windowError.message }, 500);
    // Drinks without configured windows are redeemable anytime — only enforce
    // the time check when at least one window exists.
    const windowList = windows ?? [];
    if (windowList.length > 0) {
      const today = todayIsoDayInBudapest();
      const nowTime = currentTimeInBudapest();
      const active = windowList.some((window) => {
        const days = Array.isArray(window.days) ? window.days : [];
        return days.includes(today) && window.start_time <= nowTime && window.end_time >= nowTime;
      });
      if (!active) {
        console.log('[create-redemption-window] NO_ACTIVE_WINDOW', { today, nowTime, windows: windowList });
        return json({
          error: 'NO_ACTIVE_WINDOW',
          today_iso_day: today,
          current_time: nowTime,
          configured_windows: windowList.map((window) => ({
            days: Array.isArray(window.days) ? window.days : [],
            start_time: window.start_time,
            end_time: window.end_time,
          })),
        }, 400);
      }
    }
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + WINDOW_SECONDS * 1000).toISOString();
  const deviceFingerprint = `dusk-${userData.user.id.slice(0, 8)}-${Date.now()}`;

  const { data: tokenRow, error: tokenError } = await admin
    .from('redemption_tokens')
    .insert({
      token_hash: tokenHash,
      token_prefix: token.slice(0, 10),
      user_id: userData.user.id,
      venue_id: venueId,
      drink_id: drink.id,
      device_fingerprint: deviceFingerprint,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: 'issued',
    })
    .select('id')
    .single<{ id: string }>();

  if (tokenError) return json({ error: 'Token insert failed', detail: tokenError.message }, 500);

  return json({
    token,
    token_id: tokenRow.id,
    expires_at: expiresAt,
    expires_in_seconds: WINDOW_SECONDS,
    qr_payload: `cgi://redeem?t=${encodeURIComponent(token)}&v=${encodeURIComponent(venueId)}`,
    venue: { id: venue.id, name: venue.name },
    drink: { id: drink.id, name: drink.drink_name },
    demo_mode: demoMode,
    app_review_mode: appReviewMode,
  });
});
