import { Worker } from "bullmq";
import { prisma } from "@smarttravel/db";
import { Resend } from "resend";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  BOOKING_EMAIL_QUEUE,
  COMMISSION_REPORT_QUEUE,
  type BookingEmailJobName,
  type BookingEmailJob,
  type CommissionReportJobName,
  type CommissionReportJob,
  redisConnection
} from "../jobs/queues.js";

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resendFrom = process.env.RESEND_FROM_EMAIL?.trim() ?? "Morocco With You <noreply@moroccowithyou.ma>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const adminReportEmail = process.env.ADMIN_REPORT_EMAIL?.trim();
const providerReportRecipientsRaw = process.env.PROVIDER_REPORT_RECIPIENTS?.trim();

const providerReportRecipients = (() => {
  if (!providerReportRecipientsRaw) {
    return {} as Record<string, string>;
  }

  try {
    const parsed = JSON.parse(providerReportRecipientsRaw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn("[worker] PROVIDER_REPORT_RECIPIENTS must be a JSON object map");
      return {} as Record<string, string>;
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [providerId, email]) => {
      if (typeof email === "string" && email.trim()) {
        acc[providerId] = email.trim();
      }
      return acc;
    }, {});
  } catch {
    console.warn("[worker] Failed to parse PROVIDER_REPORT_RECIPIENTS, falling back to ADMIN_REPORT_EMAIL");
    return {} as Record<string, string>;
  }
})();

const normalizeMonth = (month: string): string => {
  if (month !== "AUTO") {
    return month;
  }

  const now = new Date();
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}`;
};

const buildCommissionCsv = (
  month: string,
  providerScope: string,
  rows: Array<{
    bookingId: string;
    providerName: string;
    serviceLabel: string;
    date: string;
    pax: number;
    totalPrice: number;
    commissionTotal: number;
  }>,
  totalCommission: number
): string => {
  const header = ["month", "provider_scope", "booking_id", "provider", "service", "date", "pax", "total_price_mad", "commission_mad"];

  const escape = (value: string | number): string => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        month,
        providerScope,
        row.bookingId,
        row.providerName,
        row.serviceLabel,
        row.date,
        row.pax,
        row.totalPrice.toFixed(2),
        row.commissionTotal.toFixed(2)
      ]
        .map(escape)
        .join(",")
    );
  }

  lines.push(["TOTAL", providerScope, "", "", "", "", "", "", totalCommission.toFixed(2)].join(","));
  return lines.join("\n");
};

const buildCommissionPdf = async (
  month: string,
  providerScope: string,
  rows: Array<{
    bookingId: string;
    providerName: string;
    serviceLabel: string;
    date: string;
    pax: number;
    totalPrice: number;
    commissionTotal: number;
  }>,
  totalCommission: number
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595, 842]);
  let y = 800;

  const drawLine = (text: string, weight: "normal" | "bold" = "normal", size = 10) => {
    if (y < 60) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, {
      x: 40,
      y,
      size,
      font: weight === "bold" ? bold : font
    });
    y -= size + 6;
  };

  drawLine("Morocco With You - Commission Report", "bold", 16);
  drawLine(`Month: ${month}`, "normal", 11);
  drawLine(`Provider scope: ${providerScope}`, "normal", 11);
  drawLine(`Bookings: ${rows.length}`, "normal", 11);
  drawLine(`Total commissions: ${totalCommission.toFixed(2)} MAD`, "bold", 11);
  y -= 4;
  drawLine("---", "normal", 10);

  for (const row of rows) {
    drawLine(
      `${row.date} | ${row.providerName} | ${row.serviceLabel} | pax=${row.pax} | total=${row.totalPrice.toFixed(2)} | commission=${row.commissionTotal.toFixed(2)}`,
      "normal",
      9
    );
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
};

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

    if (resend) {
      await resend.emails.send({
        from: resendFrom,
        to: booking.user.email,
        subject: "Confirmation de reservation - Morocco With You",
        text: [
          `Bonjour,`,
          "",
          "Votre reservation a ete confirmee.",
          `Booking ID: ${booking.id}`,
          `Prestataire: ${booking.service.provider.name}`,
          `Service: ${booking.service.label}`,
          `Date: ${booking.date.toISOString().slice(0, 10)}`,
          `Pax: ${booking.pax}`,
          `Total: ${booking.totalPrice.toString()} MAD`,
          "",
          "Merci pour votre confiance.",
          "Morocco With You"
        ].join("\n")
      });
    } else {
      console.warn("[worker] RESEND_API_KEY not set, booking confirmation email skipped");
    }

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
    const month = normalizeMonth(job.data.month);
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
    const flattenedRows = bookings.map((booking) => ({
      bookingId: booking.id,
      providerName: booking.service.provider.name,
      serviceLabel: booking.service.label,
      date: booking.date.toISOString().slice(0, 10),
      pax: booking.pax,
      totalPrice: Number(booking.totalPrice),
      commissionTotal: Number(booking.commissionTotal)
    }));
    const providerScope = job.data.providerId ?? "ALL";
    const csvContent = buildCommissionCsv(month, providerScope, flattenedRows, totalCommission);
    const pdfBuffer = await buildCommissionPdf(month, providerScope, flattenedRows, totalCommission);
    const reportRecipient = job.data.providerId
      ? providerReportRecipients[job.data.providerId] ?? adminReportEmail
      : adminReportEmail;

    if (resend && reportRecipient) {
      await resend.emails.send({
        from: resendFrom,
        to: reportRecipient,
        subject: `Rapport commissions ${month} (${providerScope})`,
        text: [
          `Rapport commissions pour ${month}`,
          `Perimetre: ${providerScope}`,
          `Nombre de reservations: ${flattenedRows.length}`,
          `Total commissions: ${totalCommission.toFixed(2)} MAD`
        ].join("\n"),
        attachments: [
          {
            filename: `commission-report-${month}-${providerScope}.csv`,
            content: Buffer.from(csvContent, "utf8")
          },
          {
            filename: `commission-report-${month}-${providerScope}.pdf`,
            content: pdfBuffer
          }
        ]
      });
    }

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
          totalCommission,
          month,
          emailedTo: reportRecipient ?? null,
          attachments: [
            `commission-report-${month}-${providerScope}.csv`,
            `commission-report-${month}-${providerScope}.pdf`
          ]
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
