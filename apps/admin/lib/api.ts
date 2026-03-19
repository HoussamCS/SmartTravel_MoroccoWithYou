export const ADMIN_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export type ProviderCategory = "RESTAURANT" | "ACTIVITY" | "TRANSPORT" | "ACCOM" | "EXCURSION";

export type ProviderItem = {
  id: string;
  name: string;
  city: string;
  category: ProviderCategory;
  description: string;
  location: { lat: number; lng: number };
  isActive: boolean;
};

export type CommissionRow = {
  providerId: string;
  providerName: string;
  commissionTotal: number;
};

export type JobLogRow = {
  id: string;
  queueName: string;
  jobName: string;
  status: string;
  processedAt: string;
  error?: string | null;
};

export type EventRequestRow = {
  id: string;
  eventType: string;
  date: string;
  budget: number | null;
  peopleCount: number;
  message: string;
  requesterName?: string | null;
  requesterMail?: string | null;
  createdAt: string;
};

export const fetchProviders = async (): Promise<ProviderItem[]> => {
  const response = await fetch(`${ADMIN_API_BASE}/providers?page=1&pageSize=100`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: ProviderItem[] };
  return payload.data ?? [];
};

const getHeaders = (): HeadersInit | undefined => {
  const token = (process.env.ADMIN_ACCESS_TOKEN ?? process.env.ADMIN_BOOTSTRAP_TOKEN ?? "").trim();

  if (!token) {
    return undefined;
  }

  return {
    authorization: `Bearer ${token}`
  };
};

export const fetchCommissions = async (): Promise<CommissionRow[]> => {
  const response = await fetch(`${ADMIN_API_BASE}/admin/commissions`, {
    cache: "no-store",
    headers: getHeaders()
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as CommissionRow[];
};

export const fetchJobLogs = async (): Promise<JobLogRow[]> => {
  const response = await fetch(`${ADMIN_API_BASE}/admin/jobs/logs?limit=30`, {
    cache: "no-store",
    headers: getHeaders()
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as JobLogRow[];
};

export const fetchEventRequests = async (): Promise<EventRequestRow[]> => {
  const response = await fetch(`${ADMIN_API_BASE}/admin/event-requests`, {
    cache: "no-store",
    headers: getHeaders()
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as EventRequestRow[];
};
