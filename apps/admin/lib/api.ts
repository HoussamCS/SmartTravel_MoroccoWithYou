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
