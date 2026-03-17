"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_API_BASE } from "../../lib/api";

const headers = {
  "content-type": "application/json",
  authorization: `Bearer ${process.env.ADMIN_BOOTSTRAP_TOKEN ?? ""}`
};

export const queueCommissionReportAction = async (formData: FormData) => {
  const month = String(formData.get("month") ?? "");
  const providerId = String(formData.get("providerId") ?? "").trim();

  await fetch(`${ADMIN_API_BASE}/admin/commissions/report`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      month,
      providerId: providerId.length > 0 ? providerId : undefined
    })
  });

  revalidatePath("/commissions");
};

export const scheduleCommissionReportAction = async (formData: FormData) => {
  const providerId = String(formData.get("providerId") ?? "").trim();

  await fetch(`${ADMIN_API_BASE}/admin/commissions/report/schedule`, {
    method: "POST",
    headers,
    body: JSON.stringify({ providerId: providerId.length > 0 ? providerId : undefined })
  });

  revalidatePath("/commissions");
};
