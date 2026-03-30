import { NextRequest, NextResponse } from "next/server";
import { ADMIN_API_BASE } from "../../../lib/api";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month")?.trim();
  const providerId = request.nextUrl.searchParams.get("providerId")?.trim();

  const params = new URLSearchParams();
  if (month) {
    params.set("month", month);
  }
  if (providerId) {
    params.set("providerId", providerId);
  }

  const token = (process.env.ADMIN_ACCESS_TOKEN ?? process.env.ADMIN_BOOTSTRAP_TOKEN ?? "").trim();
  const response = await fetch(`${ADMIN_API_BASE}/admin/commissions/export.csv?${params.toString()}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Unable to export CSV" },
      { status: response.status }
    );
  }

  const csv = await response.text();
  const disposition = response.headers.get("content-disposition") ?? "attachment; filename=commissions.csv";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": disposition
    }
  });
}
