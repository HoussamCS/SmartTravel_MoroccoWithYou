import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
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

const env = appEnvSchema.parse(process.env);

const app = Fastify({ logger: true });
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

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

const requireRole = (claims: AuthClaims, role: "ADMIN" | "TRAVELER"): void => {
  if (claims.role !== role) {
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
    const claims = requireAuth(request);
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
    claims = requireAuth(request);
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
    claims = requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const booking = await prisma.booking.findUnique({ where: { id: params.id } });

  if (!booking) {
    return reply.code(404).send({ message: "Booking not found" });
  }

  if (booking.userId !== claims.sub && claims.role !== "ADMIN") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  return {
    ...booking,
    totalPrice: toNumber(booking.totalPrice),
    commissionTotal: toNumber(booking.commissionTotal)
  };
});

app.post("/api/v1/payments/intent", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
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

  if (booking.userId !== claims.sub && claims.role !== "ADMIN") {
    return reply.code(403).send({ message: "Forbidden" });
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
    claims = requireAuth(request);
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
    claims = requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const itinerary = await prisma.itinerary.findUnique({ where: { id: params.id } });

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  if (itinerary.userId !== claims.sub && claims.role !== "ADMIN") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  return {
    ...itinerary,
    totalPrice: toNumber(itinerary.totalPrice)
  };
});

app.post("/api/v1/itineraries/:id/validate", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const itinerary = await prisma.itinerary.findUnique({ where: { id: params.id } });

  if (!itinerary) {
    return reply.code(404).send({ message: "Itinerary not found" });
  }

  if (itinerary.userId !== claims.sub && claims.role !== "ADMIN") {
    return reply.code(403).send({ message: "Forbidden" });
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
    claims = requireAuth(request);
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

app.post("/api/v1/admin/providers", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
    requireRole(claims, "ADMIN");
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
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
    requireRole(claims, "ADMIN");
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
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
    requireRole(claims, "ADMIN");
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

app.get("/api/v1/admin/commissions", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
    requireRole(claims, "ADMIN");
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 401;
    return reply.code(statusCode).send({ message: (error as Error).message });
  }

  const records = await prisma.booking.findMany({
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

app.post("/api/v1/admin/commissions/report", async (request, reply) => {
  let claims: AuthClaims;
  try {
    claims = requireAuth(request);
    requireRole(claims, "ADMIN");
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

const start = async () => {
  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

await start();
