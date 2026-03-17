export type Role = "TRAVELER" | "ADMIN";

export type Provider = {
  id: string;
  name: string;
  city: string;
  category: "RESTAURANT" | "ACTIVITY" | "TRANSPORT" | "ACCOM" | "EXCURSION";
  description: string;
  location: { lat: number; lng: number };
  photos: string[];
  isActive: boolean;
};

export type Service = {
  id: string;
  providerId: string;
  label: string;
  pricePublic: number;
  commissionAmount: number;
  unit: "PER_PERSON" | "FLAT";
};

export type Booking = {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  pax: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  totalPrice: number;
  commissionTotal: number;
  paymentIntent?: string;
};
