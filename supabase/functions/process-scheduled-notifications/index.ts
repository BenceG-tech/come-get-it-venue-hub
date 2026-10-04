import { authorizeScheduler, corsHeaders, database, deliverNotification, failure, json } from '../_shared/notification-server.ts';
import { explicitAudience, isQuietTime, qualifies, validateMessage } from '../_shared/notification-policy.ts';
import { advanceProgress, hasDispatchBudget, resumeProgress } from '../_shared/notification-progress.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = database(), now = new Date(), deadline = Date.now() + 50000;
    if (!await authorizeScheduler(req, db)) return json({ error: 'Unauthorized' }, 401);
    // A timed-out worker may already have contacted Expo. Never auto-resend it.
    const { data: stale, error: staleError } = await db.from('notification_templates').select('id,dispatch_summary')
      .eq('dispatch_status', 'processing').lt('dispatch_started_at', new Date(now.getTime() - 10 * 60000).toISOString()).limit(20);
    if (staleError) throw new Error('A biztonsági migráció hiányzik vagy a feldolgozás nem érhető el.');
    for (const item of stale || []) await db.from('notification_templates').update({ dispatch_status: 'review', dispatch_summary: { ...(item.dispatch_summary || {}), reason: 'A feldolgozás megszakadt; kézi ellenőrzés szükséges.' } }).eq('id', item.id).eq('dispatch_status', 'processing');
    const { data: due, error } = await db.from('notification_templates').select('*')
      .eq('send_mode', 'scheduled').eq('is_active', true).eq('dispatch_status', 'pending').is('sent_at', null).not('dispatch_approved_at', 'is', null)
      .lte('scheduled_at', now.toISOString()).order('scheduled_at').limit(3);
    if (error) throw error;
    const details: Array<Record<string, unknown>> = [];
    for (const template of due || []) {
      if (!hasDispatchBudget(deadline)) break;
      try {
        if (isQuietTime(now, template.quiet_hours || undefined)) continue;
      } catch {
        await db.from('notification_templates').update({ dispatch_status: 'review', dispatch_summary: { reason: 'Érvénytelen csendes időszak.' } }).eq('id', template.id).eq('dispatch_status', 'pending');
        continue;
      }
      const { data: claim, error: claimError } = await db.from('notification_templates')
        .update({ dispatch_status: 'processing', dispatch_started_at: now.toISOString() })
        .eq('id', template.id).eq('dispatch_status', 'pending').eq('is_active', true).is('sent_at', null).not('dispatch_approved_at', 'is', null)
        .eq('updated_at', template.updated_at).select('id').maybeSingle();
      if (claimError) throw claimError;
      if (!claim) continue;
      try {
        validateMessage(template.title_hu, template.body_hu, template.deep_link);
        const ids = explicitAudience(template.targeting);
        const ttl = Math.min(template.ttl_hours || 24, 72);
        if (Date.parse(template.scheduled_at) + ttl * 3600000 < now.getTime()) throw new Error('Az értesítés elévült. Kérj új javaslatot.');
        const [{ data: profiles, error: profilesError }, { data: points, error: pointsError }] = await Promise.all([
          db.from('profiles').select('id,created_at,last_seen_at,is_admin').in('id', ids),
          db.from('user_points').select('user_id,balance').in('user_id', ids),
        ]);
        if (profilesError || pointsError) throw new Error('A célközönség friss ellenőrzése sikertelen.');
        const balances = new Map((points || []).map(p => [p.user_id, p.balance]));
        const kind = template.targeting?.recommendation_kind;
        const eligible = new Set((profiles || []).filter(p => !p.is_admin && (!kind || qualifies({ ...p, balance: balances.get(p.id) }, kind, now))).map(p => p.id));
        let progress = resumeProgress(template.dispatch_summary, ids.length);
        for (let index = progress.cursor; index < ids.length; index++) {
          if (!hasDispatchBudget(deadline)) break;
          const id = ids[index];
          // Check cancellation and time on every recipient, not just at the start of a batch.
          const { data: active, error: activeError } = await db.from('notification_templates').select('is_active').eq('id', template.id).single();
          if (activeError) throw new Error('A kampány állapota nem ellenőrizhető.');
          if (!active?.is_active) break;
          const result = !eligible.has(id) ? { status: 'ineligible' } : await deliverNotification(db, {
            user_id: id, template_id: template.id, title: template.title_hu, body: template.body_hu,
            deep_link: template.deep_link, quiet_hours: template.quiet_hours, frequency_limit: template.frequency_limit,
          });
          if (result.status === 'quiet_hours') break;
          progress = advanceProgress(progress, result.status);
          // Persist every recipient before starting another. A crashed worker is
          // marked review; only deliberate budget yields resume automatically.
          const { error: checkpointError } = await db.from('notification_templates').update({ dispatch_summary: progress }).eq('id', template.id).eq('dispatch_status', 'processing');
          if (checkpointError) throw new Error('A küldési állapot mentése sikertelen. Ellenőrzés szükséges.');
        }
        const complete = progress.cursor === ids.length;
        const needsReview = !!(progress.unknown || progress.duplicate);
        const { error: finishError } = await db.from('notification_templates').update({ dispatch_status: complete ? (needsReview ? 'review' : 'completed') : 'pending',
          dispatch_summary: progress, ...(complete && progress.sent ? { sent_at: new Date().toISOString() } : {}) }).eq('id', template.id).eq('dispatch_status', 'processing');
        if (finishError) throw new Error('A feldolgozás lezárása sikertelen; ellenőrzés szükséges.');
        details.push({ template_id: template.id, ...progress, complete });
      } catch (error) {
        const { data: current } = await db.from('notification_templates').select('dispatch_summary').eq('id', template.id).single();
        await db.from('notification_templates').update({ dispatch_status: 'review', dispatch_summary: { ...(current?.dispatch_summary || {}), reason: error instanceof Error ? error.message : 'Ellenőrzés szükséges.' } }).eq('id', template.id);
        details.push({ template_id: template.id, status: 'review' });
      }
    }
    return json({ ok: true, processed: details.length, details });
  } catch (error) { return failure(error); }
});
