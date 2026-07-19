import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  ComplaintMeta,
  Report,
  ReportDetail,
} from "@/features/reports/data";
import { apiRequest } from "@/services/api";

export type EvidenceUpload = {
  key: string;
  uploadUrl: string;
};

const complaintMetaCacheKey = "complaint_meta_cache_v2";
const complaintMetaCacheTtlMs = 90 * 24 * 60 * 60 * 1000;
const complaintReportsCacheTtlMs = 60 * 1000;
const complaintReportsStaleTtlMs = 90 * 24 * 60 * 60 * 1000;

let complaintMetaMemoryCache: ComplaintMetaCache | null = null;
let complaintMetaRequest: Promise<ComplaintMeta> | null = null;
let complaintReportsMemoryCache:
  | { fetchedAt: number; userId: string; value: Report[] }
  | null = null;
let complaintReportsRequest: Promise<Report[]> | null = null;

type ComplaintMetaCache = {
  fetchedAt: number;
  value: ComplaintMeta;
};

async function readComplaintMetaCache(allowStale = false): Promise<ComplaintMeta | null> {
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
    if (!allowStale && Date.now() - parsed.fetchedAt > complaintMetaCacheTtlMs) {
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

export async function clearReportListCache(userId: string): Promise<void> {
  if (complaintReportsMemoryCache?.userId === userId) {
    complaintReportsMemoryCache = null;
  }
  complaintReportsRequest = null;
  await AsyncStorage.removeItem(`report_list_cache_v1:${userId}`);
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
    .catch(async (error) => {
      const cached = await readComplaintMetaCache(true);
      if (cached) return cached;
      throw error;
    })
    .finally(() => {
      complaintMetaRequest = null;
    });

  return complaintMetaRequest;
}

export async function fetchComplaintReports(
  options?: { force?: boolean; userId?: string },
): Promise<Report[]> {
  const userId = options?.userId ?? "";
  if (
    !options?.force &&
    userId &&
    complaintReportsMemoryCache &&
    complaintReportsMemoryCache.userId === userId &&
    Date.now() - complaintReportsMemoryCache.fetchedAt <=
      complaintReportsCacheTtlMs
  ) {
    return complaintReportsMemoryCache.value;
  }

  const storageKey = userId ? `report_list_cache_v1:${userId}` : null;
  const readStoredReports = async (allowStale: boolean) => {
    if (!storageKey) return null;
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        fetchedAt: number;
        value: Report[];
      };
      if (
        Date.now() - parsed.fetchedAt >
        (allowStale ? complaintReportsStaleTtlMs : complaintReportsCacheTtlMs)
      ) {
        return null;
      }
      complaintReportsMemoryCache = { ...parsed, userId };
      return parsed.value;
    } catch {
      return null;
    }
  };

  if (!options?.force) {
    const stored = await readStoredReports(false);
    if (stored) return stored;
  }

  if (complaintReportsRequest) {
    return complaintReportsRequest;
  }

  complaintReportsRequest = apiRequest<{ reports: Report[] }>(
    "/api/mobile/complaints",
  )
    .then(async (response) => {
      complaintReportsMemoryCache = {
        fetchedAt: Date.now(),
        userId,
        value: response.reports,
      };
      if (storageKey) {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            fetchedAt: complaintReportsMemoryCache.fetchedAt,
            value: response.reports,
          }),
        );
      }
      return response.reports;
    })
    .catch(async (error) => {
      const stored = await readStoredReports(true);
      if (stored) return stored;
      throw error;
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
  idempotencyKey: string;
  draftIds: string[];
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
