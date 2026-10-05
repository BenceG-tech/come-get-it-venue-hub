# Notification workflows — 2026-10-05

Implemented against the read-only inspected NRXF public schema. No production data was modified, no messages were sent by the implementation agent. Parent coordinates deployment and any production verification.

## Behavior

- Notifications opens with automatic, prompt-free recommendations: message, explicit audience count, evidence and editable Budapest schedule. The user detail uses the same component.
- Exactly four lifecycle drafts are returned: positive point balance, joined in the last 7 days, inactive at least 14 days with a known last-seen date, and general discovery. Empty groups remain visible with a reason and cannot be scheduled. No free-drink, stock, reward eligibility or purchase claims are invented.
- Drink filters use successful redemptions in the last 180 days joined to the recorded drink category. This is historical behavior, not a declared preference. Beer, coffee, wine, cocktail and non-alcoholic groups are supported; absent evidence produces an empty group. “Más-más ital csoportonként” returns four distinct beer/wine/cocktail/non-alcoholic discovery drafts in one batch, so distinct groups can be approved together.
- Campaign scans exclude admins. An explicitly selected user can be an admin; that exact one-user scope is preserved and revalidated during approval and dispatch.
- When available, the existing Lovable model ranks only candidate IDs. It receives aggregate counts, no names, tokens, recipient IDs or personal activity histories. Invalid/unavailable responses retain the visible “Szabályalapú javaslat” source.
- Candidates scan the latest 500 non-admin profiles; each proposal has at most 100 specific recipients. The UI shows this bound. This is not exhaustive global targeting or learned individual send-time optimization.
- Saved proposals expire after 24 hours; missing or future creation timestamps also fail closed. Approval rechecks membership, successful category history and opt-in, and inserts a stable template ID; repeated approval cannot create duplicate campaigns.
- Bulk approval accepts 1–4 selected draft IDs and delivery times. A database row lock serializes approval for the batch; each result is reported separately. Recipients already assigned to any earlier approved draft in that batch are excluded, including when retrying a partial failure. Processing follows stored display order, with general discovery after lifecycle-specific messages. Browser-supplied audiences and copy are ignored.
- Recommended times are editable. “Következő küldési kör” sets the earliest permitted time with a two-minute save margin, then waits for the five-minute scheduler and Budapest 22:00–08:00 quiet hours. It is scheduling, not immediate or guaranteed delivery; the server returns the actual saved time.
- Manual authoring offers name-based recipient search, a push preview, draft save and explicit scheduling. Geographic/global/unsupported targeting never degrades into a broadcast. Legacy templates are not automatically approved.
- Only tokens with explicit `marketing_opt_in=true` are eligible. Existing tokens default to false. The parent-owned register-push-token endpoint handles explicit opt-in and removal.
- Shared actual Expo sender is used by single, bulk and scheduled paths. `sent` means Expo accepted a ticket, not device delivery. Missing tokens, provider failures and uncertain responses are distinct and never reported as sent.
- Default Budapest quiet hours: 22:00–08:00. Atomic recipient reservations enforce at most 2 notifications in a rolling 24 hours and at least 6 hours between campaigns. Errors in the reservation or consent lookup stop sending.
- Approved scheduled campaigns are claimed atomically. Per-recipient progress is checkpointed. The worker has a 50-second budget and leaves 16 seconds before starting another provider call; deliberate yields resume at the next 5-minute cron run. Crashes and ambiguous provider acceptance require review; they are not blindly retried.
- Once processing starts, content/audience edits are blocked. Pausing prevents future recipient sends but cannot recall provider-accepted messages.
- Internal navigation uses data.url with whitelisted paths: /(tabs)/home, /(tabs)/rewards, /map, /venue/<uuid>, /reward/<uuid>. Android uses the offers channel.

## Incremental rollout for the 2026-10-05 recommendation update

1. Apply only `supabase/migrations/20261005103519_notification_bulk_approval.sql`. It adds service-role-only, SECURITY INVOKER RPCs `notification_segment_recipients` and `approve_notification_recommendations`. It does not send or approve any message on its own. The separate account-deletion migration is not a dependency.
2. Deploy `suggest-user-notification` and `process-scheduled-notifications`. Include `_shared/notification-policy.ts`, `_shared/notification-server.ts` and `_shared/notification-progress.ts` in their dependency bundle. Keep existing endpoint authentication configuration. Shared-policy changes are backward compatible with the existing single and bulk send endpoints.
3. Deploy the recommendation and manual-targeting frontend changes. Inspect the four-card empty/selected-user/mixed cases without approving a real campaign. Check readiness and empty-queue cron health without a real notification send.

## Original infrastructure rollout order

1. Review/apply `supabase/migrations/20261004211456_notification_dispatch_safety.sql`: opt-in fields, approval/dispatch metadata, service-role-only SECURITY INVOKER reservation RPC, recipient dispatch index. RLS of existing tables is retained; no legacy consent or approval is backfilled.
2. Review/apply `supabase/migrations/20261004213355_notification_scheduler.sql`: pg_cron + pg_net, dedicated random 256-bit key in Vault, hash/configuration in an RLS-enabled credentials table, grants only to service_role, 5-minute cron. The endpoint starts NULL, so clones never invoke a production project accidentally.
3. Deploy suggest-user-notification, send-user-notification, bulk-send-notification, process-scheduled-notifications with the notification `_shared` modules. Deploy the parent-owned register-push-token changes and its shared dependencies too. Preserve process-scheduled-notifications `verify_jwt=false`: it verifies its dedicated scheduler key itself. No service-role JWT is stored in the cron SQL.
4. Configure the intended project endpoint only after backend deployment. For NRXF: set notification_scheduler_credentials.endpoint_url to https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/process-scheduled-notifications, enabled=true, id='primary'. This URL is not a credential. Never print/decrypt the Vault key during verification.
5. Confirm cron job `cgi-notification-dispatch` is active and has a successful invocation; verify only redacted/count metadata and HTTP status. An empty due queue is sufficient for infrastructure verification; do not send to users as a deployment test.
6. Deploy frontend. Approvals and manual scheduling check scheduler readiness. Old templates remain unapproved; review/edit and explicitly approve before they can run. Regenerate shared Supabase types after rollout, then remove the temporary notificationClient schema overlay.
7. Verify the mobile explicit marketing opt-in/opt-out path and actual token lifecycle with a consenting test account. Device receipts/display and Android channel behavior need physical device validation.

## Verification performed

- `bun test tests/notifications/policy.test.ts tests/notifications/progress.test.ts`: 17 tests / 81 assertions, passing (four empty drafts, mixed distinct factual groups, explicit-admin scope, fail-closed targeting, Budapest/DST and safe next-run scheduling, copy evidence, token formats, URL whitelist, resumable progress and bounded worker budget).
- `node --test tests/notifications/recommendations-endpoint.mjs`: 7 tests, passing against the real handler source with mocked database/auth boundaries; no network. Covers empty/scoped-admin/mixed generation, request validation, partial bulk results, untrusted browser-field stripping, ASAP scheduling and idempotent single-approve compatibility.
- `tests/notifications/bulk-approval.mjs`: actual migration executed in PGlite, passing for scope/admin validation, revoked consent, exact successful category evidence, mixed targeting, same-batch overlap across retries, partial failures, stale/null/future timestamps, audience limits and service-only grants. Concurrent Promise calls exercise duplicate retries on PGlite’s serialized connection; this is not evidence of multi-connection production concurrency.
- `bun x deno test --allow-env tests/notifications/sender.deno.ts`: 8 tests, passing, mock provider only (no token, duplicate reservations, missing migration/consent failure, provider acceptance payload, uncertain response, quiet hours, dedicated scheduler authentication).
- `tests/notifications/migration.mjs`: PGlite real PostgreSQL execution, passing for migration syntax, no consent/approval backfill, duplicate reservation, cooldown, daily cap and function privilege checks. PGlite serializes queries; production multi-connection concurrency should also be exercised in staging.
- `tests/notifications/scheduler-migration.mjs`: PGlite PostgreSQL syntax, RLS/grants, configured/disabled gates and cron request construction passing. Vault/pg_cron/pg_net are stubbed locally, so actual extension installation and cron execution require the rollout check above.
- Deno typecheck on all four changed notification endpoints passed.
- Frontend TypeScript and production build passed during implementation; final aggregate checks are coordinated with the other agent edits. Existing large-bundle/browser-data warnings remain.
- Targeted frontend ESLint passed. No commit, push, deployment or real notification send was performed by this agent.

For SQL tests install @electric-sql/pglite in an isolated temporary directory and run the scripts with PGLITE_MODULE pointing to its dist/index.js. The implementation used version 0.5.8. Do not add test fixture roles/tables to production.

## Known operational limits

- Token ticket acceptance is observable; end-device delivery needs Expo receipts/device checks and is not claimed here.
- Unbounded broadcast, geographic and platform segment targeting remain unsupported. Templates must contain 1–100 explicit recipients. Drink segments are resolved to verified explicit IDs; the 500-profile scan is bounded and non-exhaustive.
- A provider timeout can mean delivery happened; these attempts are preserved as unknown/review with no automatic replay.
- An interrupted worker requires operator review. Deliberate time-budget yields resume automatically; crashed runs do not.
- Scheduler readiness checks configured state. Cron runtime health must be observed after deployment; disabling the cron job outside this system should also set credentials.enabled=false.
