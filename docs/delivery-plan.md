# SmartTravel Delivery Plan

## Goal
Deliver Morocco With You with all announced MVP functionalities implemented, tested, and deployable.

## Delivery Principles
- Ship in vertical slices (API + UI + validation + test evidence).
- Keep backward-compatible API contracts under `/api/v1`.
- Every feature is done only when: implementation + basic tests/manual QA + docs update are complete.

## Current Status Snapshot (2026-03-24)
- Done today:
  - Admin group-trips CRUD API implemented.
  - Admin group-trips management page implemented.
  - Booking confirmation worker now sends real emails via Resend.
- Already existing:
  - Auth JWT + refresh, providers catalog, bookings + Stripe webhook, itineraries intake/validate, public group-trips join, event requests, provider CRUD, commissions/jobs.

## Phase 1 - Critical Delivery Blockers (In Progress)
1. Email reliability and templates
   - Keep Resend send path.
   - Add `RESEND_FROM_EMAIL` env documentation.
   - Add failed-send retry/error observability in job logs.
2. Group trips admin completeness
   - API CRUD (done)
   - Admin CRUD page (done)
   - Add navigation links from admin dashboard (done)
3. Acceptance checks
   - Typecheck (done)
   - Manual smoke checks for create/edit/delete group trip and booking-confirmed email.

## Phase 2 - Booking and Traveler UX Hardening
1. Remove manual-token friction on traveler pages.
2. Booking success and payment state UX polish.
3. Add "my bookings" traveler page.
4. Improve error handling and auth expiry recovery.

## Phase 3 - Travel Planning Completion
1. Admin itinerary builder (day-by-day composition).
2. Persist itinerary days and computed totals.
3. Validation workflow to auto-create linked bookings.
4. Public read-only itinerary share link.

## Phase 4 - Media Uploads (S3/R2)
1. Add upload endpoint with strict MIME and max-size validation.
2. Persist uploaded URLs in provider photos.
3. Integrate upload into admin provider workflow.

## Phase 5 - Commissions & Reports
1. CSV export in admin commissions module.
2. Provider monthly report content generation.
3. PDF generation and provider email distribution.
4. Automatic monthly scheduler bootstrap on startup.

## Phase 6 - Search & Discovery
1. Price range and rating filter support in providers endpoint.
2. Full-text search optimization with PostgreSQL strategy.
3. UI controls for new filters.

## Phase 7 - Optional AI Scope
1. Recommendation endpoint scaffolding.
2. pgvector setup and embedding storage.
3. Controlled rollout under feature flag.

## Phase 8 - Release Engineering
1. Add lint/test jobs to CI, not just typecheck/build.
2. Add health and readiness checks in deployment docs.
3. Environment matrix and secret validation per environment.
4. Production cutover checklist and rollback plan.

## Definition of Done (Per Feature)
- API route implemented with validation and auth policy.
- UI integrated and user flow verified.
- Error states handled.
- Typecheck passes.
- Doc entry updated in `docs/api-reference.md` and `docs/mvp-tracking.md`.

## Immediate Next Items
1. Add admin navigation link for direct Group Trips access from layout.
2. Add API reference entries for new admin group-trips routes.
3. Implement traveler "my bookings" page and remove manual booking ID dependency.
4. Implement upload endpoint with R2 and integrate in admin providers.
