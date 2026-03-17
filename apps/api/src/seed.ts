import type { Provider, Service } from "./types.js";

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
