import { authorize, corsHeaders, database, deliverNotification, failure, json } from '../_shared/notification-server.ts';
import { explicitAudience, validateMessage } from '../_shared/notification-policy.ts';
import { hasDispatchBudget } from '../_shared/notification-progress.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = database();
    const adminId = await authorize(req, db);
    const input = await req.json();
    const ids = explicitAudience({ user_ids: input.user_ids });
    validateMessage(input.title, input.body, input.deep_link);
    const counts: Record<string, number> = {};
    const deadline = Date.now() + 50000;
    for (let index = 0; index < ids.length; index++) {
      if (!hasDispatchBudget(deadline)) { counts.not_processed = ids.length - index; break; }
      const id = ids[index];
      const result = await deliverNotification(db, { user_id: id, title: input.title, body: input.body,
        deep_link: input.deep_link, request_id: input.request_id, sent_by: adminId });
      counts[result.status] = (counts[result.status] || 0) + 1;
    }
    const sent = counts.sent || 0;
    return json({ success: sent > 0, sent_count: sent, targeted_count: ids.length,
      skipped_count: ids.length - sent, counts,
      ...(sent ? {} : { error: 'Egy értesítést sem vett át a push szolgáltató.', status: Object.keys(counts)[0] || 'failed' }) });
  } catch (error) { return failure(error); }
});
