import { Worker } from "bullmq";
import { prisma } from "@smarttravel/db";
import {
  BOOKING_EMAIL_QUEUE,
  COMMISSION_REPORT_QUEUE,
  type BookingEmailJobName,
  type BookingEmailJob,
  type CommissionReportJobName,
  type CommissionReportJob,
  redisConnection
} from "../jobs/queues.js";

const bookingWorker = new Worker<BookingEmailJob, void, BookingEmailJobName>(
  BOOKING_EMAIL_QUEUE,
  async (job) => {
    const booking = await prisma.booking.findUnique({
      where: { id: job.data.bookingId },
      include: { user: true, service: { include: { provider: true } } }
    });

    if (!booking) {
      throw new Error("Booking not found for email job");
    }

    console.log(
      `[worker] ${job.data.emailType} -> ${booking.user.email} for booking ${booking.id} (${booking.service.provider.name})`
    );

    await prisma.jobExecutionLog.create({
      data: {
        queueName: BOOKING_EMAIL_QUEUE,
        jobName: job.name,
        status: "SUCCESS",
        payload: job.data,
        result: {
          bookingId: booking.id,
          recipient: booking.user.email
        }
      }
    });
  },
  { connection: redisConnection }
);

const commissionWorker = new Worker<CommissionReportJob, void, CommissionReportJobName>(
  COMMISSION_REPORT_QUEUE,
  async (job) => {
    const month = job.data.month;
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: {
          gte: monthStart,
          lt: monthEnd
        },
        ...(job.data.providerId
          ? {
              service: {
                providerId: job.data.providerId
              }
            }
          : {})
      },
      include: {
        service: {
          include: {
            provider: true
          }
        }
      }
    });

    const totalCommission = bookings.reduce((sum, booking) => sum + Number(booking.commissionTotal), 0);
    console.log(
      `[worker] commission report month=${month} provider=${job.data.providerId ?? "ALL"} bookings=${bookings.length} total=${totalCommission}`
    );

    await prisma.jobExecutionLog.create({
      data: {
        queueName: COMMISSION_REPORT_QUEUE,
        jobName: job.name,
        status: "SUCCESS",
        payload: job.data,
        result: {
          bookings: bookings.length,
          totalCommission
        }
      }
    });
  },
  { connection: redisConnection }
);

bookingWorker.on("failed", (job, error) => {
  console.error(`[worker] booking job failed ${job?.id}:`, error.message);
  if (!job) {
    return;
  }

  prisma.jobExecutionLog
    .create({
      data: {
        queueName: BOOKING_EMAIL_QUEUE,
        jobName: job.name,
        status: "FAILED",
        payload: job.data,
        error: error.message
      }
    })
    .catch(() => undefined);
});

commissionWorker.on("failed", (job, error) => {
  console.error(`[worker] commission job failed ${job?.id}:`, error.message);
  if (!job) {
    return;
  }

  prisma.jobExecutionLog
    .create({
      data: {
        queueName: COMMISSION_REPORT_QUEUE,
        jobName: job.name,
        status: "FAILED",
        payload: job.data,
        error: error.message
      }
    })
    .catch(() => undefined);
});

process.on("SIGINT", async () => {
  await Promise.all([bookingWorker.close(), commissionWorker.close(), prisma.$disconnect()]);
  process.exit(0);
});

console.log("[worker] jobs worker started");
