import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  ComplaintMeta,
  Report,
  ReportDetail,
} from "@/features/complaints/data";
import { apiRequest } from "@/services/api";

export type EvidenceUpload = {
  key: string;
  uploadUrl: string;
};

const complaintMetaCacheKey = "complaint_meta_cache_v1";
const complaintMetaCacheTtlMs = 90 * 24 * 60 * 60 * 1000;
const complaintReportsCacheTtlMs = 60 * 1000;

let complaintMetaMemoryCache: ComplaintMetaCache | null = null;
let complaintMetaRequest: Promise<ComplaintMeta> | null = null;
let complaintReportsMemoryCache:
  | { fetchedAt: number; value: Report[] }
  | null = null;
let complaintReportsRequest: Promise<Report[]> | null = null;

type ComplaintMetaCache = {
  fetchedAt: number;
  value: ComplaintMeta;
};

async function readComplaintMetaCache(): Promise<ComplaintMeta | null> {
  if (
    complaintMetaMemoryCache &&
    Date.now() - complaintMetaMemoryCache.fetchedAt <= complaintMetaCacheTtlMs
  ) {
    return complaintMetaMemoryCache.value;
  }

  const raw = await AsyncStorage.getItem(complaintMetaCacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ComplaintMetaCache;
    if (Date.now() - parsed.fetchedAt > complaintMetaCacheTtlMs) {
      return null;
    }

    complaintMetaMemoryCache = parsed;
    return parsed.value;
  } catch {
    return null;
  }
}

async function writeComplaintMetaCache(value: ComplaintMeta): Promise<void> {
  complaintMetaMemoryCache = { fetchedAt: Date.now(), value };
  await AsyncStorage.setItem(
    complaintMetaCacheKey,
    JSON.stringify(complaintMetaMemoryCache satisfies ComplaintMetaCache),
  );
}

export async function clearComplaintMetaCache(): Promise<void> {
  complaintMetaMemoryCache = null;
  await AsyncStorage.removeItem(complaintMetaCacheKey);
}

export async function clearComplaintCache(): Promise<void> {
  complaintReportsMemoryCache = null;
  complaintReportsRequest = null;
  await clearComplaintMetaCache();
}

export async function fetchComplaintMeta(
  options?: { force?: boolean },
): Promise<ComplaintMeta> {
  if (!options?.force) {
    const cached = await readComplaintMetaCache();
    if (cached) {
      return cached;
    }
  }

  if (complaintMetaRequest) {
    return complaintMetaRequest;
  }

  complaintMetaRequest = apiRequest<ComplaintMeta>("/api/mobile/complaints/meta")
    .then(async (meta) => {
      await writeComplaintMetaCache(meta);
      return meta;
    })
    .finally(() => {
      complaintMetaRequest = null;
    });

  return complaintMetaRequest;
}

export async function fetchComplaintReports(
  options?: { force?: boolean },
): Promise<Report[]> {
  if (
    !options?.force &&
    complaintReportsMemoryCache &&
    Date.now() - complaintReportsMemoryCache.fetchedAt <=
      complaintReportsCacheTtlMs
  ) {
    return complaintReportsMemoryCache.value;
  }

  if (complaintReportsRequest) {
    return complaintReportsRequest;
  }

  complaintReportsRequest = apiRequest<{ reports: Report[] }>(
    "/api/mobile/complaints",
  )
    .then((response) => {
      complaintReportsMemoryCache = {
        fetchedAt: Date.now(),
        value: response.reports,
      };
      return response.reports;
    })
    .finally(() => {
      complaintReportsRequest = null;
    });

  return complaintReportsRequest;
}

export async function fetchComplaintReportDetail(id: string): Promise<ReportDetail> {
  return apiRequest<{ report: ReportDetail }>(
    `/api/mobile/complaints/${encodeURIComponent(id)}`,
  ).then((response) => response.report);
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
  latitude: number | null;
  longitude: number | null;
};

export async function submitComplaint(input: SubmitComplaintInput) {
  const response = await apiRequest<{ ticketId: string; ticketNumber: string }>(
    "/api/mobile/complaints",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  complaintReportsMemoryCache = null;
  return response;
}
