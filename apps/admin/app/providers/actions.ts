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

export const uploadProviderPhotoAction = async (formData: FormData) => {
  const id = String(formData.get("id") ?? "").trim();
  const existingPhotosRaw = String(formData.get("existingPhotos") ?? "[]");
  const photoFile = formData.get("photo");

  if (!(photoFile instanceof File) || photoFile.size === 0) {
    revalidatePath("/providers");
    return;
  }

  const uploadForm = new FormData();
  uploadForm.append("file", photoFile, photoFile.name);

  const uploadResponse = await fetch(`${ADMIN_API_BASE}/admin/uploads`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getAdminToken()}`
    },
    body: uploadForm
  });

  if (!uploadResponse.ok) {
    revalidatePath("/providers");
    return;
  }

  const uploadPayload = (await uploadResponse.json()) as { url?: string };
  if (!uploadPayload.url) {
    revalidatePath("/providers");
    return;
  }

  let existingPhotos: string[] = [];
  try {
    const parsed = JSON.parse(existingPhotosRaw) as unknown;
    if (Array.isArray(parsed)) {
      existingPhotos = parsed.filter((entry): entry is string => typeof entry === "string");
    }
  } catch {
    existingPhotos = [];
  }

  const nextPhotos = [...existingPhotos, uploadPayload.url];

  await fetch(`${ADMIN_API_BASE}/admin/providers/${id}/photos`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getAdminToken()}`
    },
    body: JSON.stringify({ photos: nextPhotos })
  });

  revalidatePath("/providers");
};
