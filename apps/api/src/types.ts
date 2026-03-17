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

export type Itinerary = {
  id: string;
  userId: string;
  title: string;
  status: "DRAFT" | "SENT" | "VALIDATED" | "BOOKED";
  days: Array<{ day: number; items: Array<{ serviceId: string; time: string }> }>;
  totalPrice: number;
  intakeForm: Record<string, unknown>;
};

export type GroupTrip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  program: Array<{ day: number; title: string; details: string }>;
  pricePerPerson: number;
  participants: number;
};
