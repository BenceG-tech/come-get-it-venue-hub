import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRole);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: 'Unauthorized' }, 401);

  // A partnerhely tulajdonosának törlése üzleti adatot is törölne a jelenlegi sémában.
  const { count: ownedVenueCount, error: venueCheckError } = await admin
    .from('venues')
    .select('id', { count: 'exact', head: true })
    .eq('owner_profile_id', user.id);
  if (venueCheckError) return json({ error: 'Account dependency check failed' }, 500);
  if ((ownedVenueCount ?? 0) > 0) {
    return json({ error: 'Venue owner accounts require assisted deletion', code: 'VENUE_OWNER' }, 409);
  }

  const deleteRows = async (table: string, column: string) => {
    const { error } = await admin.from(table).delete().eq(column, user.id);
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  const clearReference = async (table: string, column: string) => {
    const { error } = await admin.from(table).update({ [column]: null }).eq(column, user.id);
    if (error) throw new Error(`${table}: ${error.message}`);
  };

  try {
    // Személyes aktivitás törlése; üzleti szintű, nem személyes naplóknál a hivatkozás anonimizálása.
    await deleteRows('csr_donations', 'user_id');
    await deleteRows('notification_logs', 'user_id');
    await deleteRows('ai_notification_suggestions', 'user_id');
    await deleteRows('ai_notification_suggestions', 'created_by');
    await deleteRows('notification_templates', 'created_by');
    await deleteRows('redemptions', 'user_id');
    await clearReference('redemptions', 'staff_id');
    await clearReference('redemption_tokens', 'consumed_by_staff_id');
    await deleteRows('redemption_tokens', 'user_id');
    await clearReference('fidel_transactions', 'user_id');
    await clearReference('pos_transactions', 'user_id');
    await clearReference('anomaly_logs', 'resolved_by');
    await clearReference('autopilot_rules', 'created_by');
    await clearReference('platform_settings', 'updated_by');
    // A profiles.id oszlop nincs közvetlenül ON DELETE CASCADE kapcsolva az auth.users táblához.
    await deleteRows('profiles', 'id');

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return json({ success: true });
  } catch (error) {
    console.error('[delete-account] failed', error);
    return json({ error: 'Account deletion failed' }, 500);
  }
});
