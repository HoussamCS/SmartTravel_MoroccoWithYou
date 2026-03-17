import { Queue } from "bullmq";

const redisConnection = {
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  maxRetriesPerRequest: null
};

export const BOOKING_EMAIL_QUEUE = "booking-email";
export const COMMISSION_REPORT_QUEUE = "commission-report";

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

export const commissionReportQueue = new Queue<CommissionReportJob, void, CommissionReportJobName>(
  COMMISSION_REPORT_QUEUE,
  {
  connection: redisConnection
  }
);

export { redisConnection };
