export const WEB_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export type ProviderCategory = "RESTAURANT" | "ACTIVITY" | "TRANSPORT" | "ACCOM" | "EXCURSION";
export type ServiceUnit = "PER_PERSON" | "FLAT";

export type ProviderLocation = {
  lat: number;
  lng: number;
};

export type ProviderListItem = {
  id: string;
  name: string;
  city: string;
  category: ProviderCategory;
  description: string;
  location: ProviderLocation;
  photos: string[];
  isActive: boolean;
};

export type ServiceItem = {
  id: string;
  label: string;
  pricePublic: number | string;
  commissionAmount: number | string;
  unit: ServiceUnit;
};

export type ProviderDetail = ProviderListItem & {
  services: ServiceItem[];
};

export type ProviderListResponse = {
  page: number;
  pageSize: number;
  total: number;
  data: ProviderListItem[];
  error?: string;
};

export const categoryLabels: Record<ProviderCategory, string> = {
  RESTAURANT: "Restaurants",
  ACTIVITY: "Activites",
  TRANSPORT: "Transport",
  ACCOM: "Hebergements",
  EXCURSION: "Excursions"
};

export const unitLabels: Record<ServiceUnit, string> = {
  PER_PERSON: "par personne",
  FLAT: "forfait"
};

export const formatMoney = (value: number | string): string => {
  const numericValue = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export const fetchProviders = async (query: {
  q?: string;
  city?: string;
  category?: ProviderCategory;
  page?: number;
  pageSize?: number;
}): Promise<ProviderListResponse> => {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.city) params.set("city", query.city);
  if (query.category) params.set("category", query.category);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 9));

  try {
    const response = await fetch(`${WEB_API_BASE}/providers?${params.toString()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 9,
        total: 0,
        data: [],
        error: await readErrorMessage(response)
      };
    }

    return (await response.json()) as ProviderListResponse;
  } catch (error) {
    return {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 9,
      total: 0,
      data: [],
      error: error instanceof Error ? error.message : "Impossible de charger le catalogue"
    };
  }
};

export const fetchProvider = async (
  id: string
): Promise<{ data: ProviderDetail | null; error?: string; notFound?: boolean }> => {
  try {
    const response = await fetch(`${WEB_API_BASE}/providers/${id}`, {
      cache: "no-store"
    });

    if (response.status === 404) {
      return { data: null, notFound: true };
    }

    if (!response.ok) {
      return {
        data: null,
        error: await readErrorMessage(response)
      };
    }

    return {
      data: (await response.json()) as ProviderDetail
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Impossible de charger cette experience"
    };
  }
};