# Morocco With You - MVP Tracking

## Implemented in repository

- Monorepo Turborepo with workspaces: `apps/web`, `apps/admin`, `apps/api`, `packages/db`, `packages/shared`
- Public web app (Next.js 14 App Router, TypeScript, Tailwind)
- Admin app scaffold (Next.js 14)
- API app (Fastify) with `/api/v1` versioning and validation by Zod
- API now connected to Prisma (PostgreSQL models) for core CRUD flows
- JWT auth flow with refresh token in httpOnly cookie
- Stripe payment intent endpoint + verified webhook handling
- BullMQ queues/workers integrated for booking emails and commission reports
- Booking worker now sends confirmation emails through Resend (when configured)
- Job execution logs persisted in database and exposed in admin API
- Commission reporting enhanced with CSV export endpoint and monthly PDF+CSV worker attachments
- Event Requests module implemented (public submit + admin listing)
- Admin pages implemented: providers CRUD, group trips CRUD, commissions/jobs, event requests inbox
- Public special request page implemented in web app
- Public catalog browsing UI implemented (`/experiences` + `/experiences/[id]`)
- Traveler bookings list flow implemented (`GET /bookings` + `/bookings` page + status deep-link)
- Authorization hardening in API:
  - Admin routes now pass through a centralized admin guard (ADMIN JWT or bootstrap token)
  - Traveler booking/itinerary access uses shared owner-or-admin checks
- Core endpoints in place:
  - `GET /api/v1/providers`
  - `GET /api/v1/providers/:id`
  - `POST /api/v1/bookings`
  - `GET /api/v1/bookings`
  - `GET /api/v1/bookings/:id`
  - `POST /api/v1/itineraries`
  - `GET /api/v1/itineraries/:id`
  - `POST /api/v1/itineraries/:id/validate`
  - `GET /api/v1/group-trips`
  - `POST /api/v1/group-trips/:id/join`
  - `GET /api/v1/admin/group-trips`
  - `POST /api/v1/admin/group-trips`
  - `PUT /api/v1/admin/group-trips/:id`
  - `DELETE /api/v1/admin/group-trips/:id`
  - `POST /api/v1/admin/providers`
  - `GET /api/v1/admin/commissions`
  - `POST /api/v1/stripe/webhook`
- Prisma schema with requested entities + enums
- Environment contract validation with Zod

## Next implementation priorities

1. Complete remaining role-aware policy checks for newly added future modules (group trip admin/user operations).
2. Add web booking flow UI connected to `POST /api/v1/bookings` and Stripe payment intent.
3. Add S3/R2 media uploads with MIME/size validation.
4. Add pgvector + recommendation endpoint for optional AI scope.
5. Add admin management screens for user operations.
6. Add provider-facing delivery workflow (recipient routing per provider contact) and richer commission report metrics.
