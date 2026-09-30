# Partner access regression QC

Date: 2026-09-30
Scope: Venue Hub production source and Supabase authorization

## Expected behavior

- A platform admin can manage all venues.
- A venue owner can view and manage only assigned venues and their operational data.
- Venue staff can view operational data for assigned venues, but cannot change owner-level venue settings.
- Public consumer data remains available to the mobile app through its dedicated public surfaces.

## Fixes in this change

- Partner dashboard venue counts now use the authenticated session's assigned venue list.
- Owner and staff dashboards always send an assigned venue ID to scoped statistics endpoints.
- Venue, reward and redemption-filter lists are scoped to assigned venue IDs in the Venue Hub UI.
- Owner-only actions use a separate manageable-venue list, so a mixed owner/staff account cannot edit a venue where it is staff only.
- Transaction venue lookups are scoped to assigned venue IDs.
- Venue-owner analytics are authorized and computed only for the requested assigned venue.
- Venue staff cannot call the owner analytics endpoint directly; owner membership or direct ownership is required.
- The settings screen now reads and saves real venue data; mock venue data and the mock API-key card were removed.
- The staff-only pause button that changed UI state without changing production data was replaced with a read-only live status.

## Verification

- TypeScript project build: passed.
- Production Vite build: passed (3,587 modules).
- Targeted ESLint for newly rewritten screens: passed.
- Edge function TypeScript syntax parse: passed.
- Database role simulation, venue owner:
  - assigned venues: 1
  - manageable venues: 1
  - redemption data visible from venues: 1
- Database role simulation, venue staff:
  - assigned venues: 1
  - manageable venues: 0
  - redemption data visible from venues: 1

No production user identifiers or credentials are included in this report.
