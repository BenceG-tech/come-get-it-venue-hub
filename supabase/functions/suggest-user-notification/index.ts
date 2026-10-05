import { authorize, corsHeaders, database, failure, json, schedulerReady } from '../_shared/notification-server.ts';
import { earliestDispatchTime, makeMixedRecommendations, makeRecommendations, MIXED_DRINK_SEGMENTS, validDrinkSegment, validExpoToken, UUID, type DrinkSegment, type Recommendation } from '../_shared/notification-policy.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = database();
    const adminId = await authorize(req, db);
    const input = await req.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Érvénytelen kérés.');
    const now = new Date();
    if (input.action === 'readiness') return json({ ready: await schedulerReady(db) });
    if (input.action === 'approve' || input.action === 'approve_bulk') {
      if (!await schedulerReady(db)) throw new Error('Az ütemező még nincs bekapcsolva. Az értesítés nem lett ütemezve.');
      if (typeof input.batch_id !== 'string' || !UUID.test(input.batch_id)) throw new Error('Érvénytelen javaslatcsomag.');
      const selections = input.action === 'approve' ? [{ suggestion_id: input.suggestion_id, scheduled_at: input.scheduled_at }] : input.selections;
      if (!Array.isArray(selections) || !selections.length || selections.length > 4 ||
          selections.some(s => !s || typeof s !== 'object' || typeof s.suggestion_id !== 'string' || !UUID.test(s.suggestion_id) ||
            (s.scheduled_at !== undefined && (typeof s.scheduled_at !== 'string' || s.scheduled_at.length > 40))) ||
          new Set(selections.map(s => s.suggestion_id)).size !== selections.length) throw new Error('Válassz 1–4 különböző javaslatot.');
      const mode = input.delivery_mode || 'recommended';
      if (!['recommended', 'as_soon_as_possible'].includes(mode)) throw new Error('Ismeretlen ütemezési mód.');
      const selected = selections.map(s => ({ suggestion_id: s.suggestion_id,
        ...(mode === 'as_soon_as_possible' ? { scheduled_at: earliestDispatchTime(now) } : s.scheduled_at ? { scheduled_at: s.scheduled_at } : {}) }));
      // The database reads the immutable server draft, revalidates profiles,
      // consent, category evidence and time, and locks the entire batch. No
      // browser-supplied message, audience, category or scope reaches the insert.
      const { data, error } = await db.rpc('approve_notification_recommendations', {
        p_batch_id: input.batch_id, p_admin_id: adminId, p_selections: selected,
      });
      if (error || !Array.isArray(data?.results)) throw new Error('A biztonságos jóváhagyás nem érhető el. Frissítsd a javaslatokat, vagy ellenőrizd az ütemezési migrációt.');
      if (input.action === 'approve') {
        const result = data.results[0];
        if (!['scheduled', 'already_scheduled'].includes(result?.status)) throw new Error(result?.error || 'A javaslat nem ütemezhető.');
        return json({ success: true, ...result });
      }
      return json({ ...data, delivery_mode: mode });
    }
    if (input.action && input.action !== 'generate') throw new Error('Ismeretlen művelet.');
    if (input.user_id !== undefined && (typeof input.user_id !== 'string' || !UUID.test(input.user_id))) throw new Error('Érvénytelen felhasználó.');
    const segment = input.drink_segment || 'all';
    if (!validDrinkSegment(segment)) throw new Error('Ismeretlen italcsoport.');
    // A deliberately selected user's admin flag must not silently hide them.
    // Broadcast campaigns still exclude admins. Counts describe this bounded scan.
    let query = db.from('profiles').select('id,created_at,last_seen_at,is_admin').order('created_at', { ascending: false }).limit(501);
    query = input.user_id ? query.eq('id', input.user_id) : query.eq('is_admin', false);
    const { data: rawProfiles, error: profileError } = await query;
    if (profileError) throw new Error('A célközönség nem tölthető be.');
    const profiles = (rawProfiles || []).slice(0, 500), ids = profiles.map(p => p.id);
    let tokens: Array<{ user_id: string; token: string }> = [];
    let points: Array<{ user_id: string; balance: number }> = [];
    const segmentEvidence: Partial<Record<DrinkSegment, Set<string>>> = {};
    if (ids.length) {
      const requestedSegments = segment === 'mixed' ? MIXED_DRINK_SEGMENTS : [segment];
      const [tokenResult, pointsResult, segmentResults] = await Promise.all([
        db.from('push_tokens').select('user_id,token').eq('marketing_opt_in', true).in('user_id', ids),
        db.from('user_points').select('user_id,balance').in('user_id', ids),
        Promise.all(requestedSegments.map(async selectedSegment => ({ segment: selectedSegment, result: selectedSegment === 'all' ? { data: ids, error: null } :
          await db.rpc('notification_segment_recipients', { p_user_ids: ids, p_segment: selectedSegment }) }))),
      ]);
      if (tokenResult.error || pointsResult.error || segmentResults.some(entry => entry.result.error)) throw new Error('A címzettek és a beváltási előzmények ellenőrzése sikertelen.');
      tokens = tokenResult.data || []; points = pointsResult.data || [];
      for (const entry of segmentResults) segmentEvidence[entry.segment] = new Set(entry.result.data || []);
    }
    const reachable = new Set(tokens.filter(t => validExpoToken(t.token)).map(t => t.user_id));
    const balances = new Map(points.map(p => [p.user_id, p.balance]));
    const audience = profiles.filter(p => reachable.has(p.id)).map(p => ({ ...p, balance: balances.get(p.id) }));
    let suggestions = segment === 'mixed' ? makeMixedRecommendations(audience, now, { scopedUserId: input.user_id }, segmentEvidence) :
      makeRecommendations(audience, now, { scopedUserId: input.user_id, drinkSegment: segment, segmentUserIds: segmentEvidence[segment] });
    // AI may only rank verified candidates. It cannot invent offers, claims, recipients or times.
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (key && suggestions.length > 1) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', temperature: 0,
            messages: [{ role: 'system', content: 'Rangsorold az ellenőrzött értesítési javaslatokat. Kizárólag JSON: {"order":["azonosító",...]}. Minden kapott azonosító pontosan egyszer szerepeljen. Ne adj hozzá szöveget vagy új tényt.' },
              { role: 'user', content: JSON.stringify(suggestions.map(s => ({ id: s.id, type: s.type, drink_segment: s.drink_segment, recipients: s.recipient_count }))) }] }),
        });
        if (response.ok) {
          const payload = await response.json();
          const content = payload.choices?.[0]?.message?.content || '';
          const order = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, '')).order;
          if (Array.isArray(order) && new Set(order).size === suggestions.length && order.length === suggestions.length && order.every(id => suggestions.some(s => s.id === id))) {
            // General discovery cannot consume audiences before specific drafts.
            const ranked = order.map(id => suggestions.find(s => s.id === id)!);
            suggestions = [...ranked.filter(s => s.type !== 'discovery'), ...ranked.filter(s => s.type === 'discovery')]
              .map((s, i) => ({ ...s, source: 'ai_ranked', priority_order: i + 1 }));
          }
        }
      } catch { /* Explicit rule source remains visible. */ }
    }
    // Show usable choices before empty drafts, even if the model ranks an empty group first.
    suggestions = [...suggestions].sort((a, b) => Number(b.sendable) - Number(a.sendable))
      .map((suggestion, index) => ({ ...suggestion, priority_order: index + 1 }));
    const { data: saved, error: saveError } = await db.from('ai_notification_suggestions').insert({
      user_id: profiles.some(p => p.id === input.user_id) ? input.user_id : adminId, created_by: adminId, suggestions,
      context: { scope: input.user_id ? 'user' : 'campaign', scoped_user_id: input.user_id || null, drink_segment: segment, scanned_count: profiles.length, truncated: (rawProfiles || []).length > 500 },
    }).select('id').single();
    if (saveError || !saved) throw new Error('A javaslatok mentése sikertelen.');
    return json({ batch_id: saved.id, suggestions: suggestions.map(({ user_ids, ...visible }) => visible), scanned_count: profiles.length,
      truncated: (rawProfiles || []).length > 500, checked_at: now.toISOString(), scope: input.user_id ? 'user' : 'campaign', drink_segment: segment, approval_order: 'display_order' });
  } catch (error) { return failure(error); }
});
