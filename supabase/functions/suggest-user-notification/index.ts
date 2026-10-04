import { authorize, corsHeaders, database, failure, json, schedulerReady } from '../_shared/notification-server.ts';
import { DEFAULT_LIMITS, DEFAULT_QUIET_HOURS, isQuietTime, makeRecommendations, qualifies, validExpoToken, validateMessage, UUID, type Recommendation } from '../_shared/notification-policy.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = database();
    const adminId = await authorize(req, db);
    const input = await req.json();
    const now = new Date();
    if (input.action === 'readiness') return json({ ready: await schedulerReady(db) });
    if (input.action === 'approve') {
      if (!await schedulerReady(db)) throw new Error('Az ütemező még nincs bekapcsolva. Az értesítés nem lett ütemezve.');
      if (!UUID.test(input.batch_id || '') || !UUID.test(input.suggestion_id || '')) throw new Error('Érvénytelen javaslat.');
      const { data: batch, error } = await db.from('ai_notification_suggestions').select('*').eq('id', input.batch_id).single();
      if (error || !batch) throw new Error('A javaslat nem található.');
      if (Date.parse(batch.generated_at) < now.getTime() - 24 * 3600000) throw new Error('A javaslat lejárt. Kérj friss javaslatokat.');
      const suggestion = (batch.suggestions as Recommendation[]).find(s => s.id === input.suggestion_id);
      if (!suggestion) throw new Error('A javaslat nem található.');
      const scheduledAt = input.scheduled_at || suggestion.scheduled_at;
      const scheduled = new Date(scheduledAt);
      if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() < now.getTime() + 60000 || scheduled.getTime() > now.getTime() + 7 * 86400000 || isQuietTime(scheduled)) throw new Error('Válassz jövőbeli időpontot 7 napon belül, 08:00 és 22:00 között (Budapest).');
      // The browser can edit delivery time, never the server-verified recipient list or claims.
      const { data: profiles, error: profileError } = await db.from('profiles').select('id,created_at,last_seen_at,is_admin').in('id', suggestion.user_ids);
      const { data: points, error: pointsError } = await db.from('user_points').select('user_id,balance').in('user_id', suggestion.user_ids);
      const { data: tokens, error: tokensError } = await db.from('push_tokens').select('user_id,token').eq('marketing_opt_in', true).in('user_id', suggestion.user_ids);
      if (profileError || pointsError || tokensError) throw new Error('A címzettek friss ellenőrzése sikertelen.');
      const reachable = new Set((tokens || []).filter(t => validExpoToken(t.token)).map(t => t.user_id));
      const balances = new Map((points || []).map(p => [p.user_id, p.balance]));
      const ids = (profiles || []).filter(p => reachable.has(p.id) && qualifies({ ...p, balance: balances.get(p.id) }, suggestion.type, now)).map(p => p.id);
      if (!ids.length) throw new Error('Már nincs elérhető címzett ebben a csoportban.');
      validateMessage(suggestion.title_hu, suggestion.body_hu, suggestion.deep_link);
      const { error: insertError } = await db.from('notification_templates').insert({
        id: suggestion.id, title_hu: suggestion.title_hu, body_hu: suggestion.body_hu,
        targeting: { user_ids: ids, platform: 'all', recommendation_kind: suggestion.type, evidence_checked_at: now.toISOString() },
        scheduled_at: scheduled.toISOString(), send_mode: 'scheduled', category: suggestion.type === 'points' ? 'points' : 'venue_status',
        priority: suggestion.priority, deep_link: suggestion.deep_link, created_by: adminId,
        is_active: true, dispatch_status: 'pending', dispatch_approved_at: now.toISOString(), quiet_hours: DEFAULT_QUIET_HOURS, frequency_limit: DEFAULT_LIMITS, ttl_hours: 24,
      });
      if (insertError && insertError.code !== '23505') throw new Error('Az ütemezés mentése sikertelen.');
      return json({ success: true, template_id: suggestion.id, status: insertError ? 'already_scheduled' : 'scheduled', recipient_count: ids.length });
    }
    if (input.user_id && !UUID.test(input.user_id)) throw new Error('Érvénytelen felhasználó.');
    // Bounded review batch. Never pretend this is the entire audience.
    let query = db.from('profiles').select('id,created_at,last_seen_at,is_admin').eq('is_admin', false).order('created_at', { ascending: false }).limit(501);
    if (input.user_id) query = query.eq('id', input.user_id);
    const { data: rawProfiles, error: profileError } = await query;
    if (profileError) throw new Error('A célközönség nem tölthető be.');
    const profiles = (rawProfiles || []).slice(0, 500), ids = profiles.map(p => p.id);
    if (!ids.length) return json({ suggestions: [], empty_reason: 'Még nincs elemezhető felhasználó.', scanned_count: 0 });
    const [{ data: tokens, error: tokenError }, { data: points, error: pointsError }] = await Promise.all([
      db.from('push_tokens').select('user_id,token').eq('marketing_opt_in', true).in('user_id', ids),
      db.from('user_points').select('user_id,balance').in('user_id', ids),
    ]);
    if (tokenError || pointsError) throw new Error('A címzettek ellenőrzése sikertelen.');
    const reachable = new Set((tokens || []).filter(t => validExpoToken(t.token)).map(t => t.user_id));
    const balances = new Map((points || []).map(p => [p.user_id, p.balance]));
    let suggestions = makeRecommendations(profiles.filter(p => reachable.has(p.id)).map(p => ({ ...p, balance: balances.get(p.id) })), now);
    // AI may only rank verified candidates. It cannot invent offers, claims, recipients or times.
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (key && suggestions.length > 1) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', temperature: 0,
            messages: [{ role: 'system', content: 'Rangsorold az ellenőrzött értesítési javaslatokat. Kizárólag JSON: {"order":["azonosító",...]}. Minden kapott azonosító pontosan egyszer szerepeljen. Ne adj hozzá szöveget vagy új tényt.' },
              { role: 'user', content: JSON.stringify(suggestions.map(s => ({ id: s.id, type: s.type, recipients: s.recipient_count }))) }] }),
        });
        if (response.ok) {
          const payload = await response.json();
          const content = payload.choices?.[0]?.message?.content || '';
          const order = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, '')).order;
          if (Array.isArray(order) && new Set(order).size === suggestions.length && order.length === suggestions.length && order.every(id => suggestions.some(s => s.id === id))) {
            suggestions = order.map(id => ({ ...suggestions.find(s => s.id === id)!, source: 'ai_ranked' }));
          }
        }
      } catch { /* Explicit rule source remains visible. */ }
    }
    if (!suggestions.length) return json({ suggestions: [], scanned_count: profiles.length, empty_reason: 'Nincs ellenőrzött, elérhető címzett a javasolt csoportokban.' });
    const { data: saved, error: saveError } = await db.from('ai_notification_suggestions').insert({
      user_id: input.user_id || adminId, created_by: adminId, suggestions,
      context: { scope: input.user_id ? 'user' : 'campaign', scanned_count: profiles.length, truncated: (rawProfiles || []).length > 500 },
    }).select('id').single();
    if (saveError || !saved) throw new Error('A javaslatok mentése sikertelen.');
    return json({ batch_id: saved.id, suggestions: suggestions.map(({ user_ids, ...visible }) => visible), scanned_count: profiles.length,
      truncated: (rawProfiles || []).length > 500, checked_at: now.toISOString() });
  } catch (error) { return failure(error); }
});
