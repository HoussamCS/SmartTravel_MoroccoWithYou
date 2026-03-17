import type { GroupTrip, Itinerary, Provider, Service } from "./types.js";

export const providers: Provider[] = [
  {
    id: "prov-1",
    name: "Atlas Adventure",
    city: "Marrakech",
    category: "ACTIVITY",
    description: "Quad and desert excursions around Marrakech.",
    location: { lat: 31.6295, lng: -7.9811 },
    photos: [],
    isActive: true
  },
  {
    id: "prov-2",
    name: "Riad Taste",
    city: "Fes",
    category: "RESTAURANT",
    description: "Traditional dining experience in old medina.",
    location: { lat: 34.0181, lng: -5.0078 },
    photos: [],
    isActive: true
  }
];

export const services: Service[] = [
  {
    id: "svc-1",
    providerId: "prov-1",
    label: "Buggy 1h",
    pricePublic: 600,
    commissionAmount: 50,
    unit: "PER_PERSON"
  },
  {
    id: "svc-2",
    providerId: "prov-2",
    label: "Diner marocain",
    pricePublic: 250,
    commissionAmount: 25,
    unit: "PER_PERSON"
  }
];

export const itineraries: Itinerary[] = [
  {
    id: "iti-1",
    userId: "usr-1",
    title: "Weekend Marrakech",
    status: "SENT",
    days: [
      {
        day: 1,
        items: [{ serviceId: "svc-1", time: "10:00" }]
      }
    ],
    totalPrice: 1200,
    intakeForm: { style: "adventure", budget: 2500 }
  }
];

export const groupTrips: GroupTrip[] = [
  {
    id: "gt-1",
    title: "Sahara Escape",
    destination: "Merzouga",
    startDate: "2026-05-20",
    endDate: "2026-05-24",
    maxCapacity: 16,
    program: [
      { day: 1, title: "Depart Marrakech", details: "Route vers Ouarzazate" },
      { day: 2, title: "Dunes", details: "Bivouac et coucher de soleil" }
    ],
    pricePerPerson: 3400,
    participants: 6
  }
];
