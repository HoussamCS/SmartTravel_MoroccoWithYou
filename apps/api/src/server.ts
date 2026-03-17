import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { z } from "zod";
import { appEnvSchema, providerFiltersSchema } from "@smarttravel/shared";
import { providers, services } from "./seed.js";
import type { Booking } from "./types.js";

const env = appEnvSchema.parse(process.env);

const app = Fastify({ logger: true });
const bookings = new Map<string, Booking>();

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

const start = async () => {
  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
