# API Reference (MVP)

Base URL: `/api/v1`

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

## Payments

- `POST /stripe/webhook`: payment webhook endpoint (stub for now)

## Health

- `GET /api/health`
