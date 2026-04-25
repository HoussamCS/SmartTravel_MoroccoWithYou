import { Queue } from "bullmq";

// Queue configuration for job processing

// Redis connection settings
const redisConnection = {
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  maxRetriesPerRequest: null,
  // Slow down reconnect attempts when Redis is offline so the process stays stable
  retryStrategy: (times: number) => Math.min(times * 2000, 30000),
  enableOfflineQueue: false,
};

// Queue names
export const BOOKING_EMAIL_QUEUE = "booking-email";
export const COMMISSION_REPORT_QUEUE = "commission-report";

// Job types
export type BookingEmailJob = {
  bookingId: string;
  userId: string;
  emailType: "BOOKING_CONFIRMED";
};

export type BookingEmailJobName = "booking-confirmed-email";

export type CommissionReportJob = {
  providerId?: string;
  month: string;
};

export type CommissionReportJobName = "monthly-commission-report";

export const bookingEmailQueue = new Queue<BookingEmailJob, void, BookingEmailJobName>(BOOKING_EMAIL_QUEUE, {
  connection: redisConnection
});

// Suppress unhandled error events so missing Redis doesn't crash the process
bookingEmailQueue.on("error", (err) => {
  console.warn("[BullMQ] bookingEmailQueue error (non-fatal):", err.message);
});

export const commissionReportQueue = new Queue<CommissionReportJob, void, CommissionReportJobName>(
  COMMISSION_REPORT_QUEUE,
  { connection: redisConnection }
);

commissionReportQueue.on("error", (err) => {
  console.warn("[BullMQ] commissionReportQueue error (non-fatal):", err.message);
});

export { redisConnection };
