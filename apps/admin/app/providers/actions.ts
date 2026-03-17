"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_API_BASE } from "../../lib/api";

const getAdminToken = () => process.env.ADMIN_BOOTSTRAP_TOKEN ?? "";

export const createProviderAction = async (formData: FormData) => {
  const payload = {
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    category: String(formData.get("category") ?? "ACTIVITY"),
    description: String(formData.get("description") ?? ""),
    location: {
      lat: Number(formData.get("lat") ?? 0),
      lng: Number(formData.get("lng") ?? 0)
    }
  };

  await fetch(`${ADMIN_API_BASE}/admin/providers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getAdminToken()}`
    },
    body: JSON.stringify(payload)
  });

  revalidatePath("/providers");
};

export const updateProviderAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    category: String(formData.get("category") ?? "ACTIVITY"),
    description: String(formData.get("description") ?? ""),
    location: {
      lat: Number(formData.get("lat") ?? 0),
      lng: Number(formData.get("lng") ?? 0)
    },
    isActive: String(formData.get("isActive") ?? "true") === "true"
  };

  await fetch(`${ADMIN_API_BASE}/admin/providers/${id}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getAdminToken()}`
    },
    body: JSON.stringify(payload)
  });

  revalidatePath("/providers");
};

export const deleteProviderAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "");

  await fetch(`${ADMIN_API_BASE}/admin/providers/${id}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${getAdminToken()}`
    }
  });

  revalidatePath("/providers");
};
