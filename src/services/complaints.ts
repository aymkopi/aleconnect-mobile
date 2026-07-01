import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ComplaintMeta, Report } from "@/features/complaints/data";
import { apiRequest } from "@/services/api";

export type EvidenceUpload = {
  key: string;
  uploadUrl: string;
};

const complaintMetaCacheKey = "complaint_meta_cache_v1";
const complaintMetaCacheTtlMs = 90 * 24 * 60 * 60 * 1000;

type ComplaintMetaCache = {
  fetchedAt: number;
  value: ComplaintMeta;
};

async function readComplaintMetaCache(): Promise<ComplaintMeta | null> {
  const raw = await AsyncStorage.getItem(complaintMetaCacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ComplaintMetaCache;
    if (Date.now() - parsed.fetchedAt > complaintMetaCacheTtlMs) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

async function writeComplaintMetaCache(value: ComplaintMeta): Promise<void> {
  await AsyncStorage.setItem(
    complaintMetaCacheKey,
    JSON.stringify({ fetchedAt: Date.now(), value } satisfies ComplaintMetaCache),
  );
}

export async function clearComplaintMetaCache(): Promise<void> {
  await AsyncStorage.removeItem(complaintMetaCacheKey);
}

export async function fetchComplaintMeta(): Promise<ComplaintMeta> {
  const cached = await readComplaintMetaCache();
  if (cached) {
    return cached;
  }

  const meta = await apiRequest<ComplaintMeta>("/api/mobile/complaints/meta");
  await writeComplaintMetaCache(meta);
  return meta;
}

export async function fetchComplaintReports(): Promise<Report[]> {
  const response = await apiRequest<{ reports: Report[] }>(
    "/api/mobile/complaints",
  );
  return response.reports;
}

export async function createEvidenceUploads(count: number) {
  return apiRequest<{ draftId: string; uploads: EvidenceUpload[] }>(
    "/api/mobile/complaints/evidence-upload",
    {
      method: "POST",
      body: JSON.stringify({ count }),
    },
  );
}

export async function uploadEvidenceToR2(uploadUrl: string, imageBytes: ArrayBuffer) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/webp" },
    body: imageBytes,
  });

  if (!response.ok) {
    throw new Error(`Evidence upload failed with ${response.status}`);
  }
}

export type SubmitComplaintInput = {
  typeId: string;
  accountNumber: string;
  barangayPsgc: string;
  purok: string;
  landmark: string;
  description: string;
  actionDesired: string;
  imageKeys: string[];
};

export async function submitComplaint(input: SubmitComplaintInput) {
  return apiRequest<{ ticketId: string; ticketNumber: string }>(
    "/api/mobile/complaints",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
