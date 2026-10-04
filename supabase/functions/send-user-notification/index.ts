import { authorize, corsHeaders, database, deliverNotification, failure, json } from '../_shared/notification-server.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = database();
    const adminId = await authorize(req, db, true);
    const input = await req.json();
    // Clients cannot override quiet hours, delivery policy, or trusted metadata.
    return json(await deliverNotification(db, { user_id: input.user_id, title: input.title, body: input.body,
      deep_link: input.deep_link, request_id: input.request_id, sent_by: adminId }));
  } catch (error) { return failure(error); }
});
