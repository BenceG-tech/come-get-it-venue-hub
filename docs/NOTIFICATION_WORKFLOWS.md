# Notification workflows — 2026-10-04

Implemented against the read-only inspected NRXF public schema. No production data was modified, no messages were sent by the implementation agent. Parent coordinates deployment and any production verification.

## Behavior

- Notifications opens with automatic, prompt-free recommendations: message, explicit audience count, evidence and editable Budapest schedule. The user detail uses the same component.
- Verified rule candidates: joined in the last 7 days; inactive at least 14 days with a known last-seen date; positive point balance. No free-drink, stock, reward eligibility or purchase claims are invented.
- When available, the existing Lovable model ranks only candidate IDs. It receives aggregate counts, no names, tokens, recipient IDs or personal activity histories. Invalid/unavailable responses retain the visible “Ellenőrzött szabályjavaslat” source.
- Candidates scan the latest 500 non-admin profiles; each proposal has at most 100 specific recipients. The UI shows this bound. This is not exhaustive global targeting or learned individual send-time optimization.
- Saved proposals expire after 24 hours. Approval rechecks membership and opt-in, and inserts a stable template ID; repeated approval cannot create duplicate campaigns.
- Manual authoring offers name-based recipient search, a push preview, draft save and explicit scheduling. Geographic/global/unsupported targeting never degrades into a broadcast. Legacy templates are not automatically approved.
- Only tokens with explicit `marketing_opt_in=true` are eligible. Existing tokens default to false. The parent-owned register-push-token endpoint handles explicit opt-in and removal.
- Shared actual Expo sender is used by single, bulk and scheduled paths. `sent` means Expo accepted a ticket, not device delivery. Missing tokens, provider failures and uncertain responses are distinct and never reported as sent.
- Default Budapest quiet hours: 22:00–08:00. Atomic recipient reservations enforce at most 2 notifications in a rolling 24 hours and at least 6 hours between campaigns. Errors in the reservation or consent lookup stop sending.
- Approved scheduled campaigns are claimed atomically. Per-recipient progress is checkpointed. The worker has a 50-second budget and leaves 16 seconds before starting another provider call; deliberate yields resume at the next 5-minute cron run. Crashes and ambiguous provider acceptance require review; they are not blindly retried.
- Once processing starts, content/audience edits are blocked. Pausing prevents future recipient sends but cannot recall provider-accepted messages.
- Internal navigation uses data.url with whitelisted paths: /(tabs)/home, /(tabs)/rewards, /map, /venue/<uuid>, /reward/<uuid>. Android uses the offers channel.

## Required rollout order

1. Review/apply `supabase/migrations/20261004211456_notification_dispatch_safety.sql`: opt-in fields, approval/dispatch metadata, service-role-only SECURITY INVOKER reservation RPC, recipient dispatch index. RLS of existing tables is retained; no legacy consent or approval is backfilled.
2. Review/apply `supabase/migrations/20261004213355_notification_scheduler.sql`: pg_cron + pg_net, dedicated random 256-bit key in Vault, hash/configuration in an RLS-enabled credentials table, grants only to service_role, 5-minute cron. The endpoint starts NULL, so clones never invoke a production project accidentally.
3. Deploy suggest-user-notification, send-user-notification, bulk-send-notification, process-scheduled-notifications with the notification `_shared` modules. Deploy the parent-owned register-push-token changes and its shared dependencies too. Preserve process-scheduled-notifications `verify_jwt=false`: it verifies its dedicated scheduler key itself. No service-role JWT is stored in the cron SQL.
4. Configure the intended project endpoint only after backend deployment. For NRXF: set notification_scheduler_credentials.endpoint_url to https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/process-scheduled-notifications, enabled=true, id='primary'. This URL is not a credential. Never print/decrypt the Vault key during verification.
5. Confirm cron job `cgi-notification-dispatch` is active and has a successful invocation; verify only redacted/count metadata and HTTP status. An empty due queue is sufficient for infrastructure verification; do not send to users as a deployment test.
6. Deploy frontend. Approvals and manual scheduling check scheduler readiness. Old templates remain unapproved; review/edit and explicitly approve before they can run. Regenerate shared Supabase types after rollout, then remove the temporary notificationClient schema overlay.
7. Verify the mobile explicit marketing opt-in/opt-out path and actual token lifecycle with a consenting test account. Device receipts/display and Android channel behavior need physical device validation.

## Verification performed

- `bun test tests/notifications/policy.test.ts tests/notifications/progress.test.ts`: 12 tests / 52 assertions, passing (fail-closed audiences, Budapest/DST scheduling, copy evidence, token formats, URL whitelist, resumable progress and bounded worker budget).
- `bun x deno test --allow-env tests/notifications/sender.deno.ts`: 8 tests, passing, mock provider only (no token, duplicate reservations, missing migration/consent failure, provider acceptance payload, uncertain response, quiet hours, dedicated scheduler authentication).
- `tests/notifications/migration.mjs`: PGlite real PostgreSQL execution, passing for migration syntax, no consent/approval backfill, duplicate reservation, cooldown, daily cap and function privilege checks. PGlite serializes queries; production multi-connection concurrency should also be exercised in staging.
- `tests/notifications/scheduler-migration.mjs`: PGlite PostgreSQL syntax, RLS/grants, configured/disabled gates and cron request construction passing. Vault/pg_cron/pg_net are stubbed locally, so actual extension installation and cron execution require the rollout check above.
- Deno typecheck on all four changed notification endpoints passed.
- Frontend TypeScript and production build passed during implementation; final aggregate checks are coordinated with the other agent edits. Existing large-bundle/browser-data warnings remain.
- Targeted frontend ESLint passed. No commit, push, deployment or real notification send was performed by this agent.

For SQL tests install @electric-sql/pglite in an isolated temporary directory and run the scripts with PGLITE_MODULE pointing to its dist/index.js. The implementation used version 0.5.8. Do not add test fixture roles/tables to production.

## Known operational limits

- Token ticket acceptance is observable; end-device delivery needs Expo receipts/device checks and is not claimed here.
- Global/geo/platform segment targeting remains intentionally unsupported. Templates must contain 1–100 explicit recipients.
- A provider timeout can mean delivery happened; these attempts are preserved as unknown/review with no automatic replay.
- An interrupted worker requires operator review. Deliberate time-budget yields resume automatically; crashed runs do not.
- Scheduler readiness checks configured state. Cron runtime health must be observed after deployment; disabling the cron job outside this system should also set credentials.enabled=false.
