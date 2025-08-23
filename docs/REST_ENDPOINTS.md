
# PostgREST endpoints (Supabase)

Base URL:
- https://nrxfiblssxwzeziomlvc.supabase.co/rest/v1

Auth:
- Use the anon key as bearer token on the client-side:
  Authorization: Bearer {anon_key}
  apikey: {anon_key}

Common:
- Add `select=*` or specific columns to the query string
- Use RLS policies for access control

Examples:
- GET /rest/v1/venues?select=*
- GET /rest/v1/redemptions?venue_id=eq.{venue_id}&select=*
- POST /rest/v1/rewards
  - Body: { "venue_id": "...", "name": "...", "points_required": 100, "valid_until": "2025-12-31", "active": true, "description": "..." }
- PATCH /rest/v1/venues?id=eq.{id}
- DELETE /rest/v1/rewards?id=eq.{id}

Notes:
- RLS must allow the operation (admin sees all; owner/staff limited to own venues).
- For inserts/updates/deletes, include a valid authenticated session; otherwise requests will fail due to RLS.
