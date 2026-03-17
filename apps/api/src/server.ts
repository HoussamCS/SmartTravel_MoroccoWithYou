import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { z } from "zod";
import { appEnvSchema, providerFiltersSchema } from "@smarttravel/shared";
import { groupTrips, itineraries, providers, services } from "./seed.js";
import type { Booking, GroupTrip, Itinerary } from "./types.js";

const env = appEnvSchema.parse(process.env);

const app = Fastify({ logger: true });
const bookings = new Map<string, Booking>();
const itineraryStore = new Map<string, Itinerary>(itineraries.map((item) => [item.id, item]));
const groupTripStore = new Map<string, GroupTrip>(groupTrips.map((item) => [item.id, item]));

const authenticate = async (request: { headers: { authorization?: string } }) => {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    const err = new Error("Missing token") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  await app.jwt.verify(token);
};

await app.register(cookie);
await app.register(cors, {
  origin: env.ALLOWED_ORIGINS.split(","),
  credentials: true
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute"
});
await app.register(jwt, {
  secret: env.JWT_ACCESS_SECRET,
  sign: {
    expiresIn: `${env.JWT_ACCESS_EXPIRES_MIN}m`
  }
});

app.get("/api/health", async () => ({ ok: true, service: "smarttravel-api" }));

app.get("/api/v1/providers", async (request) => {
  const query = providerFiltersSchema.parse(request.query);
  const start = (query.page - 1) * query.pageSize;

  const filtered = providers.filter((provider) => {
    const byCity = query.city ? provider.city.toLowerCase() === query.city.toLowerCase() : true;
    const byCategory = query.category ? provider.category === query.category : true;
    const byQuery = query.q
      ? `${provider.name} ${provider.description}`.toLowerCase().includes(query.q.toLowerCase())
      : true;

    return byCity && byCategory && byQuery;
  });

  return {
    page: query.page,
    pageSize: query.pageSize,
    total: filtered.length,
    data: filtered.slice(start, start + query.pageSize)
  };
});

app.get("/api/v1/providers/:id", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const provider = providers.find((item) => item.id === params.id);

  if (!provider) {
    return reply.code(404).send({ message: "Provider not found" });
  }

  return {
    ...provider,
    services: services.filter((service) => service.providerId === provider.id)
  };
});

app.post("/api/v1/bookings", async (request, reply) => {
  const body = z
    .object({
      userId: z.string(),
      serviceId: z.string(),
      date: z.string(),
      pax: z.number().int().positive()
    })
    .parse(request.body);

  const service = services.find((item) => item.id === body.serviceId);
  if (!service) {
    return reply.code(404).send({ message: "Service not found" });
  }

  const id = `bk-${Date.now()}`;
  const totalPrice = service.unit === "PER_PERSON" ? service.pricePublic * body.pax : service.pricePublic;
  const commissionTotal = service.commissionAmount * body.pax;

  const booking: Booking = {
    id,
    userId: body.userId,
    serviceId: body.serviceId,
    date: body.date,
    pax: body.pax,
    status: "PENDING",
    totalPrice,
    commissionTotal
  };

  bookings.set(id, booking);

  return reply.code(201).send(booking);
});

app.get("/api/v1/bookings/:id", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const booking = bookings.get(params.id);

  if (!booking) {
    return reply.code(404).send({ message: "Booking not found" });
  }

  return booking;
});

app.post("/api/v1/stripe/webhook", async (_request, reply) => {
  return reply.code(200).send({ received: true });
});

app.post("/api/v1/itineraries", async (request, reply) => {
  const body = z
    .object({
      userId: z.string(),
      title: z.string().min(2),
      intakeForm: z.record(z.unknown())
    })
    .parse(request.body);

  const id = `iti-${Date.now()}`;
  const itinerary: Itinerary = {
    id,
    userId: body.userId,
    title: body.title,
    status: "DRAFT",
    days: [],
    totalPrice: 0,
    intakeForm: body.intakeForm
  };

  itineraryStore.set(id, itinerary);
  return reply.code(201).send(itinerary);
});

app.get("/api/v1/itineraries/:id", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const itinerary = itineraryStore.get(params.id);

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  return itinerary;
});

app.post("/api/v1/itineraries/:id/validate", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const itinerary = itineraryStore.get(params.id);

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  itinerary.status = "VALIDATED";
  itineraryStore.set(itinerary.id, itinerary);

  return reply.code(200).send(itinerary);
});

app.get("/api/v1/group-trips", async () => {
  return Array.from(groupTripStore.values()).map((trip) => ({
    ...trip,
    seatsRemaining: Math.max(trip.maxCapacity - trip.participants, 0)
  }));
});

app.post("/api/v1/group-trips/:id/join", async (request, reply) => {
  const params = z.object({ id: z.string() }).parse(request.params);
  const body = z.object({ userId: z.string(), pax: z.number().int().positive().default(1) }).parse(request.body);
  const trip = groupTripStore.get(params.id);

  if (!trip) {
    return reply.code(404).send({ message: "Group trip not found" });
  }

  if (trip.participants + body.pax > trip.maxCapacity) {
    return reply.code(400).send({ message: "Not enough seats available" });
  }

  trip.participants += body.pax;
  groupTripStore.set(trip.id, trip);

  return reply.code(201).send({
    id: `join-${Date.now()}`,
    groupTripId: trip.id,
    userId: body.userId,
    pax: body.pax,
    totalPrice: body.pax * trip.pricePerPerson
  });
});

app.post("/api/v1/admin/providers", async (request, reply) => {
  await authenticate(request);

  const body = z
    .object({
      name: z.string().min(2),
      city: z.string(),
      category: z.enum(["RESTAURANT", "ACTIVITY", "TRANSPORT", "ACCOM", "EXCURSION"]),
      description: z.string().default(""),
      location: z.object({ lat: z.number(), lng: z.number() })
    })
    .parse(request.body);

  const provider = {
    id: `prov-${Date.now()}`,
    ...body,
    photos: [],
    isActive: true
  };

  providers.push(provider);
  return reply.code(201).send(provider);
});

app.get("/api/v1/admin/commissions", async (request) => {
  await authenticate(request);

  const report = Array.from(bookings.values()).reduce<Record<string, { providerId: string; commissionTotal: number }>>(
    (acc, booking) => {
      const service = services.find((item) => item.id === booking.serviceId);
      if (!service) {
        return acc;
      }

      if (!acc[service.providerId]) {
        acc[service.providerId] = { providerId: service.providerId, commissionTotal: 0 };
      }

      acc[service.providerId].commissionTotal += booking.commissionTotal;
      return acc;
    },
    {}
  );

  return Object.values(report);
});

const start = async () => {
  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
