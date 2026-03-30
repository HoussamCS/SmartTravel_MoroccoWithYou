"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_API_BASE } from "../../lib/api";

const getHeaders = (): HeadersInit => ({
  "content-type": "application/json",
  authorization: `Bearer ${process.env.ADMIN_ACCESS_TOKEN ?? process.env.ADMIN_BOOTSTRAP_TOKEN ?? ""}`
});

export const createGroupTripAction = async (formData: FormData) => {
  const payload = {
    title: String(formData.get("title") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    maxCapacity: Number(formData.get("maxCapacity") ?? 1),
    pricePerPerson: Number(formData.get("pricePerPerson") ?? 0),
    program: []
  };

  await fetch(`${ADMIN_API_BASE}/admin/group-trips`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  revalidatePath("/group-trips");
};

export const updateGroupTripAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "").trim();
  const payload = {
    title: String(formData.get("title") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    maxCapacity: Number(formData.get("maxCapacity") ?? 1),
    pricePerPerson: Number(formData.get("pricePerPerson") ?? 0)
  };

  await fetch(`${ADMIN_API_BASE}/admin/group-trips/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  revalidatePath("/group-trips");
};

export const deleteGroupTripAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "").trim();

  await fetch(`${ADMIN_API_BASE}/admin/group-trips/${id}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${process.env.ADMIN_ACCESS_TOKEN ?? process.env.ADMIN_BOOTSTRAP_TOKEN ?? ""}`
    }
  });

  revalidatePath("/group-trips");
};
