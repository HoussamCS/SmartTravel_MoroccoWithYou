# API Reference (MVP)

Base URL: `/api/v1`

## Auth

- `POST /auth/register`: register account and receive access token + refresh cookie
- `POST /auth/login`: login and receive access token + refresh cookie
- `POST /auth/refresh`: rotate refresh token and issue a new access token
- `POST /auth/logout`: clear refresh cookie
- `GET /auth/me`: return current user claims from access token

### Authorization policy

- Traveler resources (`/bookings/:id`, `/payments/intent`, `/itineraries/:id`, `/itineraries/:id/validate`) enforce owner-or-admin access.
- Admin resources (`/admin/*`) require either:
	- a valid ADMIN JWT access token in `Authorization: Bearer <token>`, or
	- a configured bootstrap token (`ADMIN_BOOTSTRAP_TOKEN`) sent in `Authorization: Bearer <token>`.

## Providers

- `GET /providers`: list providers with filters `city`, `category`, `q`, `page`, `pageSize`
- `GET /providers/:id`: provider details + available services

## Bookings

- `POST /bookings`: create booking and compute total/commission
- `GET /bookings/:id`: get booking status

## Itineraries

- `POST /itineraries`: submit intake form and initialize draft itinerary
- `GET /itineraries/:id`: read itinerary status and days
- `POST /itineraries/:id/validate`: traveler validation step

## Group Trips

- `GET /group-trips`: list group trips + seats remaining
- `POST /group-trips/:id/join`: join a trip with `pax`

## Admin

- `POST /admin/providers`: create provider (auth required)
- `GET /admin/commissions`: grouped commission report (auth required)
- `POST /admin/commissions/report`: enqueue monthly commission report job
- `POST /admin/commissions/report/schedule`: schedule next monthly commission job
- `GET /admin/jobs/logs`: list worker execution logs
- `GET /admin/event-requests`: list event requests

## Event Requests

- `POST /event-requests`: submit special event request

## Payments

- `POST /payments/intent`: create Stripe PaymentIntent for a booking
- `POST /stripe/webhook`: Stripe webhook with signature verification

## Health

- `GET /api/health`
