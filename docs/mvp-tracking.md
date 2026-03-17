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
- Job execution logs persisted in database and exposed in admin API
- Event Requests module implemented (public submit + admin listing)
- Admin pages implemented: providers CRUD, commissions/jobs, event requests inbox
- Public special request page implemented in web app
- Core endpoints in place:
  - `GET /api/v1/providers`
  - `GET /api/v1/providers/:id`
  - `POST /api/v1/bookings`
  - `GET /api/v1/bookings/:id`
  - `POST /api/v1/itineraries`
  - `GET /api/v1/itineraries/:id`
  - `POST /api/v1/itineraries/:id/validate`
  - `GET /api/v1/group-trips`
  - `POST /api/v1/group-trips/:id/join`
  - `POST /api/v1/admin/providers`
  - `GET /api/v1/admin/commissions`
  - `POST /api/v1/stripe/webhook`
- Prisma schema with requested entities + enums
- Environment contract validation with Zod

## Next implementation priorities

1. Add role-aware policy checks for all admin actions and ownership checks for all traveler resources.
2. Add S3/R2 media uploads with MIME/size validation.
3. Add pgvector + recommendation endpoint for optional AI scope.
4. Add admin management screens for group trips and user operations.
5. Add automated monthly schedule bootstrapping (startup scheduler + retry/reporting metrics).
