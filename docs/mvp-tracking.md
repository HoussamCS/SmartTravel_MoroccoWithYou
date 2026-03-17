# Morocco With You - MVP Tracking

## Implemented in repository

- Monorepo Turborepo with workspaces: `apps/web`, `apps/admin`, `apps/api`, `packages/db`, `packages/shared`
- Public web app (Next.js 14 App Router, TypeScript, Tailwind)
- Admin app scaffold (Next.js 14)
- API app (Fastify) with `/api/v1` versioning and validation by Zod
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

1. Connect API to Prisma repositories instead of in-memory stores.
2. Add JWT refresh token flow (httpOnly cookie) and role-based authorization layer.
3. Implement Stripe payment intent + webhook signature verification.
4. Add BullMQ jobs for confirmation emails and monthly commission reports.
5. Build admin CRUD screens with forms and table filters.
6. Add pgvector + recommendation endpoint for optional AI scope.
