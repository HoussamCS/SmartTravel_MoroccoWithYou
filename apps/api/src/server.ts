import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@smarttravel/db";
import { appEnvSchema, providerFiltersSchema, roleSchema } from "@smarttravel/shared";
import bcrypt from "bcryptjs";
import Fastify from "fastify";
import fastifyRawBody from "fastify-raw-body";
import jwt, { type JwtPayload } from "jsonwebtoken";
import Stripe from "stripe";
import { z } from "zod";
import { deleteByPattern, getJsonCache, setJsonCache } from "./cache/redis.js";
import { bookingEmailQueue, commissionReportQueue } from "./jobs/queues.js";
import { uploadToR2 } from "./lib/s3.js";

const env = appEnvSchema.parse(process.env);

const app = Fastify({ logger: true });
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const eventRequestInputSchema = z.object({
  eventType: z.string().min(2),
  date: z.string(),
  budget: z.number().positive().optional(),
  peopleCount: z.number().int().positive(),
  message: z.string().min(5),
  requesterName: z.string().optional(),
  requesterMail: z.string().email().optional()
});

type EventRequestFallback = {
  id: string;
  eventType: string;
  date: Date;
  budget: number | null;
  peopleCount: number;
  message: string;
  requesterName: string | null;
  requesterMail: string | null;
  createdAt: Date;
};

const eventRequestsFallbackStore: EventRequestFallback[] = [];

type AuthClaims = {
  sub: string;
  role: "TRAVELER" | "ADMIN";
  email: string;
};

type AuthedRequest = { headers: { authorization?: string }; cookies: Record<string, string | undefined> };

const toNumber = (value: Prisma.Decimal | number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
};

const ADMIN_BOOTSTRAP_TOKEN = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
const ADMIN_BOOTSTRAP_CLAIMS: AuthClaims = {
  sub: "00000000-0000-0000-0000-000000000001",
  role: "ADMIN",
  email: "admin-bootstrap@local"
};

const signAccessToken = (claims: AuthClaims): string => {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.JWT_ACCESS_EXPIRES_MIN}m`
  });
};

const signRefreshToken = (claims: AuthClaims): string => {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d`
  });
};

const parseClaims = (decoded: string | JwtPayload): AuthClaims => {
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  const claims = {
    sub: String(decoded.sub),
    role: decoded.role,
    email: decoded.email
  };

  return z
    .object({
      sub: z.string().uuid(),
      role: roleSchema,
      email: z.string().email()
    })
    .parse(claims);
};

const setRefreshCookie = (reply: { setCookie: Function }, token: string): void => {
  reply.setCookie("refresh_token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60
  });
};

const clearRefreshCookie = (reply: { clearCookie: Function }): void => {
  reply.clearCookie("refresh_token", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
};

const requireAuth = (request: AuthedRequest): AuthClaims => {
  const token = request.headers.authorization?.replace("Bearer ", "").trim();

  if (!token) {
    const err = new Error("Missing access token") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return parseClaims(decoded);
  } catch {
    const err = new Error("Invalid access token") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
};

const requireAdminAccess = (request: AuthedRequest): AuthClaims => {
  const token = request.headers.authorization?.replace("Bearer ", "").trim();

  if (ADMIN_BOOTSTRAP_TOKEN && token === ADMIN_BOOTSTRAP_TOKEN) {
    return ADMIN_BOOTSTRAP_CLAIMS;
  }

  const claims = requireAuth(request);
  requireRole(claims, "ADMIN");
  return claims;
};

const requireRole = (claims: AuthClaims, role: "ADMIN" | "TRAVELER"): void => {
  if (claims.role !== role) {
    const err = new Error("Forbidden") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }
};

const assertOwnerOrAdmin = (claims: AuthClaims, ownerUserId: string): void => {
  if (claims.role !== "ADMIN" && claims.sub !== ownerUserId) {
    const err = new Error("Forbidden") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }
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
await app.register(fastifyRawBody, {
  field: "rawBody",
  global: false,
  encoding: "utf8",
  runFirst: true,
  routes: ["/api/v1/stripe/webhook"]
});
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

app.setErrorHandler((error, request, reply) => {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    request.log.error(error, "Database unavailable");
    return reply.code(503).send({
      message: "Database is unavailable. Start PostgreSQL and retry."
    });
  }

  const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
  if (statusCode >= 500) {
    request.log.error(error);
    return reply.code(statusCode).send({ message: "Internal server error" });
  }

  const safeMessage = error instanceof Error ? error.message : "Request failed";
  return reply.code(statusCode).send({ message: safeMessage });
});

app.get("/api/health", async () => ({ ok: true, service: "smarttravel-api" }));

app.post("/api/v1/auth/register", async (request, reply) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      role: roleSchema.optional()
    })
    .parse(request.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) {
    return reply.code(409).send({ message: "Email already exists" });
  }

  const hash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: hash,
      role: body.role ?? "TRAVELER",
      profile: {}
    }
  });

  const claims: AuthClaims = { sub: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);

  setRefreshCookie(reply, refreshToken);

  return reply.code(201).send({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });
});

app.post("/api/v1/auth/login", async (request, reply) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(8)
    })
    .parse(request.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return reply.code(401).send({ message: "Invalid credentials" });
  }

  const passwordOk = await bcrypt.compare(body.password, user.password);
  if (!passwordOk) {
    return reply.code(401).send({ message: "Invalid credentials" });
  }

  const claims: AuthClaims = { sub: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);

  setRefreshCookie(reply, refreshToken);

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
});

app.post("/api/v1/auth/refresh", async (request, reply) => {
  const refreshToken = request.cookies.refresh_token;

  if (!refreshToken) {
    return reply.code(401).send({ message: "Missing refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const claims = parseClaims(decoded);
    const accessToken = signAccessToken(claims);
    const newRefreshToken = signRefreshToken(claims);

    setRefreshCookie(reply, newRefreshToken);
    return { accessToken };
  } catch {
    return reply.code(401).send({ message: "Invalid refresh token" });
  }
});

app.post("/api/v1/auth/logout", async (_request, reply) => {
  clearRefreshCookie(reply);
  return reply.code(200).send({ ok: true });
});

app.get("/api/v1/auth/me", async (request, reply) => {
  try {
    const claims = await requireAuth(request);
    return claims;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }
});

app.get("/api/v1/providers", async (request) => {
  const query = providerFiltersSchema.parse(request.query);
  const skip = (query.page - 1) * query.pageSize;
  const cacheKey = `providers:${JSON.stringify(query)}`;

  const cached = await getJsonCache<{
    page: number;
    pageSize: number;
    total: number;
    data: Array<unknown>;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const where: Prisma.ProviderWhereInput = {
    isActive: true,
    ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [data, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { createdAt: "desc" }
    }),
    prisma.provider.count({ where })
  ]);

  const payload = {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data
  };

  await setJsonCache(cacheKey, payload, 60);
  return payload;
});

app.get("/api/v1/providers/:id", async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const provider = await prisma.provider.findUnique({
    where: { id: params.id },
    include: { services: true }
  });

  if (!provider) {
    return reply.code(404).send({ message: "Provider not found" });
  }

  return provider;
});

app.post("/api/v1/bookings", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      serviceId: z.string().uuid(),
      date: z.string(),
      pax: z.number().int().positive()
    })
    .parse(request.body);

  const service = await prisma.service.findUnique({ where: { id: body.serviceId } });
  if (!service) {
    return reply.code(404).send({ message: "Service not found" });
  }

  const servicePrice = toNumber(service.pricePublic);
  const serviceCommission = toNumber(service.commissionAmount);
  const totalPrice = service.unit === "PER_PERSON" ? servicePrice * body.pax : servicePrice;
  const commissionTotal = serviceCommission * body.pax;

  const booking = await prisma.booking.create({
    data: {
      userId: claims.sub,
      serviceId: body.serviceId,
      date: new Date(body.date),
      pax: body.pax,
      status: "PENDING",
      totalPrice,
      commissionTotal
    }
  });

  return reply.code(201).send({
    ...booking,
    totalPrice: toNumber(booking.totalPrice),
    commissionTotal: toNumber(booking.commissionTotal)
  });
});

app.get("/api/v1/bookings/:id", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });

  if (!booking) {
    return reply.code(404).send({ message: "Booking not found" });
  }

  try {
    assertOwnerOrAdmin(claims, booking.userId);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  return {
    ...booking,
    totalPrice: toNumber(booking.totalPrice),
    commissionTotal: toNumber(booking.commissionTotal)
  };
});

app.get("/api/v1/bookings", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const query = z
    .object({
      status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(50).default(10)
    })
    .parse(request.query);

  const skip = (query.page - 1) * query.pageSize;
  const where: Prisma.BookingWhereInput = {
    ...(claims.role === "ADMIN" ? {} : { userId: claims.sub }),
    ...(query.status ? { status: query.status } : {})
  };

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
      include: {
        service: {
          select: {
            label: true,
            provider: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data: rows.map((row) => ({
      ...row,
      totalPrice: toNumber(row.totalPrice),
      commissionTotal: toNumber(row.commissionTotal),
      serviceLabel: row.service.label,
      providerName: row.service.provider.name
    }))
  };
});

app.post("/api/v1/payments/intent", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      bookingId: z.string().uuid(),
      currency: z.string().default("mad")
    })
    .parse(request.body);

  const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
  if (!booking) {
    return reply.code(404).send({ message: "Booking not found" });
  }

  try {
    assertOwnerOrAdmin(claims, booking.userId);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const amount = Math.round(toNumber(booking.totalPrice) * 100);
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: body.currency.toLowerCase(),
    metadata: {
      bookingId: booking.id,
      userId: booking.userId
    }
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentIntent: intent.id }
  });

  return {
    bookingId: booking.id,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret
  };
});

app.post("/api/v1/stripe/webhook", async (request, reply) => {
  const signature = request.headers["stripe-signature"];
  const rawBody = (request as unknown as { rawBody?: string }).rawBody;

  if (!signature || !rawBody) {
    return reply.code(400).send({ message: "Missing webhook signature or body" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return reply.code(400).send({ message: "Invalid webhook signature" });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const update = await prisma.booking.updateMany({
      where: { paymentIntent: intent.id },
      data: { status: "CONFIRMED" }
    });

    if (update.count > 0) {
      const booking = await prisma.booking.findFirst({ where: { paymentIntent: intent.id } });
      if (booking) {
        await bookingEmailQueue.add(
          "booking-confirmed-email",
          {
            bookingId: booking.id,
            userId: booking.userId,
            emailType: "BOOKING_CONFIRMED"
          },
          { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
        );
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await prisma.booking.updateMany({
      where: { paymentIntent: intent.id },
      data: { status: "CANCELLED" }
    });
  }

  return reply.code(200).send({ received: true });
});

app.post("/api/v1/itineraries", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      title: z.string().min(2),
      intakeForm: z.record(z.unknown())
    })
    .parse(request.body);

  const itinerary = await prisma.itinerary.create({
    data: {
      userId: claims.sub,
      title: body.title,
      status: "DRAFT",
      days: [] as Prisma.InputJsonValue,
      totalPrice: 0,
      intakeForm: body.intakeForm as Prisma.InputJsonValue
    }
  });

  return reply.code(201).send({
    ...itinerary,
    totalPrice: toNumber(itinerary.totalPrice)
  });
});

app.get("/api/v1/itineraries/:id", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const itinerary = await prisma.itinerary.findUnique({ where: { id: params.id } });

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  try {
    assertOwnerOrAdmin(claims, itinerary.userId);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  return {
    ...itinerary,
    totalPrice: toNumber(itinerary.totalPrice)
  };
});

app.post("/api/v1/itineraries/:id/validate", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const itinerary = await prisma.itinerary.findUnique({ where: { id: params.id } });

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  try {
    assertOwnerOrAdmin(claims, itinerary.userId);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 403;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const updated = await prisma.itinerary.update({
    where: { id: itinerary.id },
    data: { status: "VALIDATED" }
  });

  return reply.code(200).send({
    ...updated,
    totalPrice: toNumber(updated.totalPrice)
  });
});

app.get("/api/v1/group-trips", async () => {
  const trips = await prisma.groupTrip.findMany({
    include: { joins: { select: { pax: true } } },
    orderBy: { startDate: "asc" }
  });

  return trips.map((trip) => {
    const occupied = trip.joins.reduce((sum, item) => sum + item.pax, 0);
    return {
      ...trip,
      pricePerPerson: toNumber(trip.pricePerPerson),
      seatsRemaining: Math.max(trip.maxCapacity - occupied, 0)
    };
  });
});

app.post("/api/v1/group-trips/:id/join", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = await requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({ pax: z.number().int().positive().default(1) }).parse(request.body);

  try {
    const join = await prisma.$transaction(async (tx) => {
      const trip = await tx.groupTrip.findUnique({
        where: { id: params.id },
        include: { joins: { select: { pax: true } } }
      });

      if (!trip) {
        throw new Error("Group trip not found");
      }

      const occupied = trip.joins.reduce((sum, item) => sum + item.pax, 0);
      if (occupied + body.pax > trip.maxCapacity) {
        throw new Error("Not enough seats available");
      }

      const totalPrice = toNumber(trip.pricePerPerson) * body.pax;
      return tx.groupTripJoin.create({
        data: {
          groupTripId: trip.id,
          userId: claims.sub,
          pax: body.pax,
          totalPrice
        }
      });
    });

    return reply.code(201).send({
      ...join,
      totalPrice: toNumber(join.totalPrice)
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Group trip not found") {
      return reply.code(404).send({ message });
    }

    if (message === "Not enough seats available") {
      return reply.code(400).send({ message });
    }

    return reply.code(500).send({ message: "Failed to join trip" });
  }
});

app.get("/api/v1/admin/group-trips", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const trips = await prisma.groupTrip.findMany({
    include: { joins: { select: { pax: true } } },
    orderBy: { startDate: "asc" }
  });

  return trips.map((trip) => {
    const occupied = trip.joins.reduce((sum, item) => sum + item.pax, 0);
    return {
      ...trip,
      pricePerPerson: toNumber(trip.pricePerPerson),
      seatsRemaining: Math.max(trip.maxCapacity - occupied, 0)
    };
  });
});

app.post("/api/v1/admin/group-trips", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      title: z.string().min(2),
      destination: z.string().min(2),
      startDate: z.string(),
      endDate: z.string(),
      maxCapacity: z.number().int().positive(),
      pricePerPerson: z.number().positive(),
      program: z.array(z.unknown()).default([])
    })
    .parse(request.body);

  const trip = await prisma.groupTrip.create({
    data: {
      title: body.title,
      destination: body.destination,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      maxCapacity: body.maxCapacity,
      pricePerPerson: body.pricePerPerson,
      program: body.program as Prisma.InputJsonValue
    }
  });

  return reply.code(201).send({
    ...trip,
    pricePerPerson: toNumber(trip.pricePerPerson),
    seatsRemaining: trip.maxCapacity
  });
});

app.put("/api/v1/admin/group-trips/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z
    .object({
      title: z.string().min(2).optional(),
      destination: z.string().min(2).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      maxCapacity: z.number().int().positive().optional(),
      pricePerPerson: z.number().positive().optional(),
      program: z.array(z.unknown()).optional()
    })
    .parse(request.body);

  const data: Prisma.GroupTripUpdateInput = {
    ...(body.title ? { title: body.title } : {}),
    ...(body.destination ? { destination: body.destination } : {}),
    ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
    ...(body.endDate ? { endDate: new Date(body.endDate) } : {}),
    ...(body.maxCapacity !== undefined ? { maxCapacity: body.maxCapacity } : {}),
    ...(body.pricePerPerson !== undefined ? { pricePerPerson: body.pricePerPerson } : {}),
    ...(body.program ? { program: body.program as Prisma.InputJsonValue } : {})
  };

  try {
    const trip = await prisma.groupTrip.update({
      where: { id: params.id },
      data,
      include: { joins: { select: { pax: true } } }
    });

    const occupied = trip.joins.reduce((sum, item) => sum + item.pax, 0);
    return reply.code(200).send({
      ...trip,
      pricePerPerson: toNumber(trip.pricePerPerson),
      seatsRemaining: Math.max(trip.maxCapacity - occupied, 0)
    });
  } catch {
    return reply.code(404).send({ message: "Group trip not found" });
  }
});

app.delete("/api/v1/admin/group-trips/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);

  try {
    await prisma.groupTrip.delete({ where: { id: params.id } });
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: "Group trip not found" });
  }
});

app.post("/api/v1/admin/providers", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      name: z.string().min(2),
      city: z.string(),
      category: z.enum(["RESTAURANT", "ACTIVITY", "TRANSPORT", "ACCOM", "EXCURSION"]),
      description: z.string().default(""),
      location: z.object({ lat: z.number(), lng: z.number() })
    })
    .parse(request.body);

  const provider = await prisma.provider.create({
    data: {
      ...body,
      photos: [],
      isActive: true
    }
  });

  await deleteByPattern("providers:*");

  return reply.code(201).send(provider);
});

app.put("/api/v1/admin/providers/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z
    .object({
      name: z.string().min(2).optional(),
      city: z.string().optional(),
      category: z.enum(["RESTAURANT", "ACTIVITY", "TRANSPORT", "ACCOM", "EXCURSION"]).optional(),
      description: z.string().optional(),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
      isActive: z.boolean().optional()
    })
    .parse(request.body);

  try {
    const provider = await prisma.provider.update({
      where: { id: params.id },
      data: body
    });

    await deleteByPattern("providers:*");

    return reply.code(200).send(provider);
  } catch {
    return reply.code(404).send({ message: "Provider not found" });
  }
});

app.delete("/api/v1/admin/providers/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);

  try {
    await prisma.provider.delete({ where: { id: params.id } });
    await deleteByPattern("providers:*");
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: "Provider not found" });
  }
});

const commissionQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  providerId: z.string().uuid().optional()
});

const resolveMonthBounds = (month?: string): { start?: Date; end?: Date } => {
  if (!month) {
    return {};
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
};

app.get("/api/v1/admin/commissions", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const query = commissionQuerySchema.parse(request.query);
  const { start, end } = resolveMonthBounds(query.month);

  const records = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      ...(start && end
        ? {
            createdAt: {
              gte: start,
              lt: end
            }
          }
        : {}),
      ...(query.providerId
        ? {
            service: {
              providerId: query.providerId
            }
          }
        : {})
    },
    include: {
      service: {
        select: {
          providerId: true,
          provider: {
            select: { name: true }
          }
        }
      }
    }
  });

  const grouped = records.reduce<Record<string, { providerId: string; providerName: string; commissionTotal: number }>>(
    (acc, booking) => {
      const key = booking.service.providerId;
      if (!acc[key]) {
        acc[key] = {
          providerId: key,
          providerName: booking.service.provider.name,
          commissionTotal: 0
        };
      }

      acc[key].commissionTotal += toNumber(booking.commissionTotal);
      return acc;
    },
    {}
  );

  return Object.values(grouped);
});

app.get("/api/v1/admin/commissions/export.csv", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const query = commissionQuerySchema.parse(request.query);
  const { start, end } = resolveMonthBounds(query.month);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      ...(start && end
        ? {
            createdAt: {
              gte: start,
              lt: end
            }
          }
        : {}),
      ...(query.providerId
        ? {
            service: {
              providerId: query.providerId
            }
          }
        : {})
    },
    include: {
      service: {
        select: {
          label: true,
          providerId: true,
          provider: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const escapeCsv = (value: string | number): string => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = [
    "booking_id",
    "provider_id",
    "provider_name",
    "service_label",
    "created_at",
    "pax",
    "total_price_mad",
    "commission_total_mad",
    "status"
  ];

  const lines = [header.join(",")];
  for (const booking of bookings) {
    lines.push(
      [
        booking.id,
        booking.service.providerId,
        booking.service.provider.name,
        booking.service.label,
        booking.createdAt.toISOString(),
        booking.pax,
        toNumber(booking.totalPrice).toFixed(2),
        toNumber(booking.commissionTotal).toFixed(2),
        booking.status
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const totalCommission = bookings.reduce((sum, item) => sum + toNumber(item.commissionTotal), 0);
  lines.push(["TOTAL", "", "", "", "", "", "", totalCommission.toFixed(2), ""].join(","));

  const monthPart = query.month ?? "all";
  const providerPart = query.providerId ?? "all";

  reply.header("content-type", "text/csv; charset=utf-8");
  reply.header("content-disposition", `attachment; filename=commissions-${monthPart}-${providerPart}.csv`);
  return reply.send(lines.join("\n"));
});

app.post("/api/v1/admin/commissions/report", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      providerId: z.string().uuid().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/)
    })
    .parse(request.body);

  const job = await commissionReportQueue.add(
    "monthly-commission-report",
    {
      providerId: body.providerId,
      month: body.month
    },
    { attempts: 3, backoff: { type: "exponential", delay: 3000 } }
  );

  return reply.code(202).send({ queued: true, jobId: job.id });
});

app.post("/api/v1/admin/commissions/report/schedule", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const body = z
    .object({
      providerId: z.string().uuid().optional()
    })
    .parse(request.body);

  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 5, 0));
  const delay = Math.max(next.getTime() - now.getTime(), 1);
  const month = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;

  const job = await commissionReportQueue.add(
    "monthly-commission-report",
    {
      providerId: body.providerId,
      month
    },
    { delay, attempts: 3, backoff: { type: "exponential", delay: 3000 } }
  );

  return reply.code(202).send({ queued: true, jobId: job.id, scheduledFor: next.toISOString() });
});

app.get("/api/v1/admin/jobs/logs", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const query = z
    .object({
      queueName: z.string().optional(),
      limit: z.coerce.number().int().positive().max(100).default(25)
    })
    .parse(request.query);

  const logs = await prisma.jobExecutionLog.findMany({
    where: query.queueName ? { queueName: query.queueName } : undefined,
    orderBy: { processedAt: "desc" },
    take: query.limit
  });

  return logs;
});

app.post("/api/v1/event-requests", async (request, reply) => {
  const body = eventRequestInputSchema.parse(request.body);

  try {
    const eventRequest = await prisma.eventRequest.create({
      data: {
        eventType: body.eventType,
        date: new Date(body.date),
        budget: body.budget,
        peopleCount: body.peopleCount,
        message: body.message,
        requesterName: body.requesterName,
        requesterMail: body.requesterMail
      }
    });

    return reply.code(201).send({
      ...eventRequest,
      budget: eventRequest.budget ? toNumber(eventRequest.budget) : null
    });
  } catch (error) {
    app.log.warn({ err: error }, "Database unavailable, storing event request in fallback memory store");

    const fallbackItem: EventRequestFallback = {
      id: randomUUID(),
      eventType: body.eventType,
      date: new Date(body.date),
      budget: body.budget ?? null,
      peopleCount: body.peopleCount,
      message: body.message,
      requesterName: body.requesterName ?? null,
      requesterMail: body.requesterMail ?? null,
      createdAt: new Date()
    };

    eventRequestsFallbackStore.unshift(fallbackItem);

    return reply.code(201).send(fallbackItem);
  }
});

app.get("/api/v1/admin/event-requests", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  try {
    const rows = await prisma.eventRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return rows.map((row) => ({
      ...row,
      budget: row.budget ? toNumber(row.budget) : null
    }));
  } catch (error) {
    app.log.warn({ err: error }, "Database unavailable, reading event requests from fallback memory store");
    return eventRequestsFallbackStore.slice(0, 100);
  }
});

// ─── S3/R2 Upload ────────────────────────────────────────────────────────────
app.post("/api/v1/admin/uploads", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET || !env.R2_PUBLIC_URL) {
    return reply.code(503).send({ message: "S3/R2 storage is not configured on this server." });
  }

  const data = await request.file();
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded." });
  }

  const buffer = await data.toBuffer();

  try {
    const result = await uploadToR2({
      buffer,
      mimeType: data.mimetype,
      originalName: data.filename,
      r2Endpoint: env.R2_ENDPOINT,
      r2AccessKeyId: env.R2_ACCESS_KEY_ID,
      r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY,
      r2Bucket: env.R2_BUCKET,
      r2PublicUrl: env.R2_PUBLIC_URL,
    });
    return reply.code(201).send(result);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }
});

// ─── Full-Text Provider Search ────────────────────────────────────────────────
// This endpoint replaces the ILIKE fallback with PostgreSQL tsvector when a search term is present
app.get("/api/v1/providers/search", async (request) => {
  const query = providerFiltersSchema.parse(request.query);
  const skip = (query.page - 1) * query.pageSize;

  if (!query.q) {
    // Fall through to the main providers endpoint logic
    const where: Prisma.ProviderWhereInput = {
      isActive: true,
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.provider.findMany({ where, skip, take: query.pageSize, orderBy: { createdAt: "desc" } }),
      prisma.provider.count({ where }),
    ]);
    return { page: query.page, pageSize: query.pageSize, total, data };
  }

  // Full-text search via raw SQL tsvector
  const tsquery = query.q.trim().split(/\s+/).filter(Boolean).join(" & ");
  const categoryFilter = query.category ? Prisma.sql`AND p.category = ${query.category}::\"ProviderCategory\"` : Prisma.sql``;
  const cityFilter = query.city ? Prisma.sql`AND LOWER(p.city) = LOWER(${query.city})` : Prisma.sql``;

  const results = await prisma.$queryRaw<Array<{ id: string; name: string; city: string; category: string; description: string; location: unknown; photos: string[]; isActive: boolean; createdAt: Date; updatedAt: Date }>>(
    Prisma.sql`
      SELECT p.id, p.name, p.city, p.category, p.description, p.location, p.photos, p."isActive", p."createdAt", p."updatedAt"
      FROM "Provider" p
      WHERE p."isActive" = true
        AND to_tsvector('french', p.name || ' ' || p.description) @@ to_tsquery('french', ${tsquery})
        ${categoryFilter}
        ${cityFilter}
      ORDER BY ts_rank(to_tsvector('french', p.name || ' ' || p.description), to_tsquery('french', ${tsquery})) DESC
      LIMIT ${query.pageSize} OFFSET ${skip}
    `
  );

  const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM "Provider" p
      WHERE p."isActive" = true
        AND to_tsvector('french', p.name || ' ' || p.description) @@ to_tsquery('french', ${tsquery})
        ${categoryFilter}
        ${cityFilter}
    `
  );

  const total = Number(countResult[0]?.count ?? 0);
  return { page: query.page, pageSize: query.pageSize, total, data: results };
});

// ─── Public Itinerary (no auth) ───────────────────────────────────────────────
app.get("/api/v1/itineraries/public/:id", async (request, reply) => {
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const itinerary = await prisma.itinerary.findUnique({ where: { id: params.id } });

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  // Return safe read-only fields (no user PII)
  return {
    id: itinerary.id,
    title: itinerary.title,
    status: itinerary.status,
    days: itinerary.days,
    totalPrice: toNumber(itinerary.totalPrice),
    createdAt: itinerary.createdAt,
  };
});

// ─── Admin: Update Itinerary Days (Builder Save) ─────────────────────────────
app.put("/api/v1/admin/itineraries/:id/days", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({
    days: z.array(z.unknown()),
    totalPrice: z.number().nonnegative().optional(),
    status: z.enum(["DRAFT", "SENT", "VALIDATED", "BOOKED"]).optional(),
  }).parse(request.body);

  try {
    const updated = await prisma.itinerary.update({
      where: { id: params.id },
      data: {
        days: body.days as Prisma.InputJsonValue,
        ...(body.totalPrice !== undefined ? { totalPrice: body.totalPrice } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    return reply.code(200).send({ ...updated, totalPrice: toNumber(updated.totalPrice) });
  } catch {
    return reply.code(404).send({ message: "Itinerary not found" });
  }
});

// Admin: List all itineraries
app.get("/api/v1/admin/itineraries", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const query = z.object({
    status: z.enum(["DRAFT", "SENT", "VALIDATED", "BOOKED"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
  }).parse(request.query);

  const skip = (query.page - 1) * query.pageSize;
  const where = query.status ? { status: query.status } : {};

  const [itineraries, total] = await Promise.all([
    prisma.itinerary.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { email: true, profile: true } } },
    }),
    prisma.itinerary.count({ where }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data: itineraries.map((it) => ({ ...it, totalPrice: toNumber(it.totalPrice) })),
  };
});

// Admin: Get single itinerary with services detail
app.get("/api/v1/admin/itineraries/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const itinerary = await prisma.itinerary.findUnique({
    where: { id: params.id },
    include: { user: { select: { email: true, profile: true } } },
  });

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  return { ...itinerary, totalPrice: toNumber(itinerary.totalPrice) };
});

// ─── Admin: User Management ───────────────────────────────────────────────────
app.get("/api/v1/admin/users", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const query = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
    role: z.enum(["TRAVELER", "ADMIN"]).optional(),
    q: z.string().optional(),
  }).parse(request.query);

  const skip = (query.page - 1) * query.pageSize;
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.q ? { email: { contains: query.q, mode: "insensitive" } } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, profile: true, createdAt: true, _count: { select: { bookings: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return { page: query.page, pageSize: query.pageSize, total, data: users };
});

app.put("/api/v1/admin/users/:id/suspend", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({ suspended: z.boolean() }).parse(request.body);

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        profile: {
          suspended: body.suspended,
          suspendedAt: body.suspended ? new Date().toISOString() : null,
        },
      },
      select: { id: true, email: true, role: true, profile: true },
    });
    return reply.code(200).send(user);
  } catch {
    return reply.code(404).send({ message: "User not found" });
  }
});

app.get("/api/v1/admin/users/:id/bookings", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);

  const bookings = await prisma.booking.findMany({
    where: { userId: params.id },
    include: { service: { include: { provider: { select: { name: true, city: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((b) => ({
    ...b,
    totalPrice: toNumber(b.totalPrice),
    commissionTotal: toNumber(b.commissionTotal),
  }));
});

// Admin: Update provider photos (after upload)
app.put("/api/v1/admin/providers/:id/photos", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({ photos: z.array(z.string().url()) }).parse(request.body);

  try {
    const provider = await prisma.provider.update({
      where: { id: params.id },
      data: { photos: body.photos },
    });
    await deleteByPattern("providers:*");
    return reply.code(200).send(provider);
  } catch {
    return reply.code(404).send({ message: "Provider not found" });
  }
});

// Admin: Add/manage services for a provider
app.post("/api/v1/admin/providers/:id/services", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({
    label: z.string().min(1),
    pricePublic: z.number().positive(),
    commissionAmount: z.number().nonnegative(),
    unit: z.enum(["PER_PERSON", "FLAT"]),
  }).parse(request.body);

  const provider = await prisma.provider.findUnique({ where: { id: params.id } });
  if (!provider) return reply.code(404).send({ message: "Provider not found" });

  const service = await prisma.service.create({
    data: { providerId: params.id, ...body },
  });
  await deleteByPattern("providers:*");
  return reply.code(201).send(service);
});

app.put("/api/v1/admin/services/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const body = z.object({
    label: z.string().min(1).optional(),
    pricePublic: z.number().positive().optional(),
    commissionAmount: z.number().nonnegative().optional(),
    unit: z.enum(["PER_PERSON", "FLAT"]).optional(),
  }).parse(request.body);

  try {
    const service = await prisma.service.update({ where: { id: params.id }, data: body });
    await deleteByPattern("providers:*");
    return reply.code(200).send(service);
  } catch {
    return reply.code(404).send({ message: "Service not found" });
  }
});

app.delete("/api/v1/admin/services/:id", async (request, reply) => {
  try {
    requireAdminAccess(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);

  try {
    await prisma.service.delete({ where: { id: params.id } });
    await deleteByPattern("providers:*");
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: "Service not found" });
  }
});

const ensureMonthlyCommissionAutoScheduler = async (): Promise<void> => {
  try {
    await Promise.race([
      commissionReportQueue.add(
        "monthly-commission-report",
        {
          month: "AUTO"
        },
        {
          jobId: "monthly-commission-report-auto",
          repeat: {
            pattern: "5 0 1 * *"
          }
        }
      ),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Redis scheduler bootstrap timeout")), 2000);
      })
    ]);
  } catch (error) {
    app.log.warn({ err: error }, "Failed to ensure monthly commission auto scheduler");
  }
};

const start = async () => {
  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
    void ensureMonthlyCommissionAutoScheduler();
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

await start();

