import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  ComplaintMeta,
  Report,
  ReportDetail,
} from "@/features/reports/data";
import { parseReportDetailResponse } from "@/features/reports/data";
import {
  ApiRequestError,
  apiRequest,
  createApiRequestId,
} from "@/services/api";
import { requestPhaseFailureMessage } from "@/utils/report-transport";
import { createPromiseRegistry } from "@/utils/async-coordination";
import { claimRefresh } from "@/utils/refresh-cooldown";

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
  | { fetchedAt: number; userId: string; value: ComplaintReportPage }
  | null = null;
const complaintReportRequests =
  createPromiseRegistry<string, ComplaintReportPage>();

export type ComplaintReportSort = "newest" | "oldest" | "status";

export type ComplaintReportPage = {
  reports: Report[];
  nextCursor: string | null;
  isStale?: boolean;
};

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

export async function clearComplaintCache(userId?: string): Promise<void> {
  complaintReportsMemoryCache = null;
  complaintReportRequests.clear();
  if (userId) {
    await AsyncStorage.removeItem(`report_list_cache_v1:${userId}`);
  }
  await clearComplaintMetaCache();
}

export async function clearReportListCache(userId: string): Promise<void> {
  if (complaintReportsMemoryCache?.userId === userId) {
    complaintReportsMemoryCache = null;
  }
  complaintReportRequests.clear();
  await AsyncStorage.removeItem(`report_list_cache_v1:${userId}`);
}

export async function fetchComplaintMeta(
  options?: { force?: boolean },
): Promise<ComplaintMeta> {
  const force =
    Boolean(options?.force) && claimRefresh("complaint-meta");
  if (!force) {
    const cached = await readComplaintMetaCache();
    if (cached) {
      return cached;
    }
  }

  if (complaintMetaRequest) {
    return complaintMetaRequest;
  }

  complaintMetaRequest = apiRequest<ComplaintMeta>(
    "/api/mobile/complaints/meta",
    {},
    { phase: "metadata", timeoutMs: 15_000 },
  )
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

export async function fetchComplaintReportPage(options?: {
  force?: boolean;
  userId?: string;
  cursor?: string | null;
  query?: string;
  categoryId?: string;
  sort?: ComplaintReportSort;
  limit?: number;
}): Promise<ComplaintReportPage> {
  const userId = options?.userId ?? "";
  const cursor = options?.cursor ?? null;
  const query = options?.query?.trim() ?? "";
  const categoryId =
    options?.categoryId && options.categoryId !== "all"
      ? options.categoryId
      : "";
  const sort = options?.sort ?? "newest";
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 50);
  const isDefaultPage =
    !cursor && !query && !categoryId && sort === "newest" && limit === 25;
  const force =
    Boolean(options?.force) &&
    claimRefresh(`reports:${userId}:${query}:${categoryId}:${sort}`);
  if (
    !force &&
    isDefaultPage &&
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
    if (!storageKey || !isDefaultPage) return null;
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        fetchedAt: number;
        value: Report[] | ComplaintReportPage;
      };
      if (
        Date.now() - parsed.fetchedAt >
        (allowStale ? complaintReportsStaleTtlMs : complaintReportsCacheTtlMs)
      ) {
        return null;
      }
      const value = Array.isArray(parsed.value)
        ? { reports: parsed.value, nextCursor: null }
        : parsed.value;
      complaintReportsMemoryCache = {
        fetchedAt: parsed.fetchedAt,
        userId,
        value,
      };
      return {
        ...value,
        isStale:
          allowStale &&
          Date.now() - parsed.fetchedAt > complaintReportsCacheTtlMs,
      };
    } catch {
      return null;
    }
  };

  if (!force) {
    const stored = await readStoredReports(false);
    if (stored) return stored;
  }

  const params = new URLSearchParams({
    limit: String(limit),
    sort,
  });
  if (cursor) params.set("cursor", cursor);
  if (query) params.set("query", query);
  if (categoryId) params.set("categoryId", categoryId);
  const requestKey = JSON.stringify({
    userId,
    cursor,
    query,
    categoryId,
    sort,
    limit,
  });

  return complaintReportRequests.run(requestKey, () =>
    apiRequest<ComplaintReportPage>(
      `/api/mobile/complaints?${params.toString()}`,
    )
      .then(async (response) => {
        if (isDefaultPage) {
          complaintReportsMemoryCache = {
            fetchedAt: Date.now(),
            userId,
            value: response,
          };
        }
        if (storageKey && isDefaultPage && complaintReportsMemoryCache) {
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({
              fetchedAt: complaintReportsMemoryCache.fetchedAt,
              value: response,
            }),
          );
        }
        return response;
      })
      .catch(async (error) => {
        const stored = await readStoredReports(true);
        if (stored) return stored;
        throw error;
      }),
  );
}

export async function fetchComplaintReports(
  options?: { force?: boolean; userId?: string },
): Promise<Report[]> {
  return fetchComplaintReportPage(options).then((page) => page.reports);
}

export async function fetchComplaintReportDetail(
  id: string,
  options?: { refreshEvidence?: boolean },
): Promise<ReportDetail> {
  const query = options?.refreshEvidence ? "?refreshEvidence=1" : "";
  return apiRequest<unknown>(
    `/api/mobile/complaints/${encodeURIComponent(id)}${query}`,
    {},
    { phase: "refresh", timeoutMs: 15_000 },
  ).then(parseReportDetailResponse);
}

export async function createEvidenceUploads(
  count: number,
  authToken?: string | null,
) {
  return apiRequest<{ draftId: string; uploads: EvidenceUpload[] }>(
    "/api/mobile/complaints/evidence-upload",
    {
      method: "POST",
      body: JSON.stringify({ count }),
    },
    { authToken, phase: "metadata", timeoutMs: 15_000 },
  );
}

export async function uploadEvidenceToR2(uploadUrl: string, imageBytes: ArrayBuffer) {
  const requestId = createApiRequestId();
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, 30_000);
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: imageBytes,
      signal: controller.signal,
    });
  } catch {
    throw new ApiRequestError(
      requestPhaseFailureMessage(
        "evidence upload",
        didTimeout ? "timeout" : "network",
      ),
      undefined,
      requestId,
      "evidence upload",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ApiRequestError(
      response.status >= 500
        ? requestPhaseFailureMessage("evidence upload", "network")
        : "Evidence upload was rejected; your report is still here. Retry upload.",
      response.status,
      requestId,
      "evidence upload",
      response.status >= 500,
    );
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
  actionDesired: string;
  imageKeys: string[];
  latitude: number | null;
  longitude: number | null;
  categoryDescription?: string | null;
  typeDescription?: string | null;
  currentRegisteredName?: string | null;
  requestedRegisteredName?: string | null;
  reportDetails?: {
    version: 1;
    categoryDescription: string | null;
    typeDescription: string | null;
    kwhmTransfer: {
      currentRegisteredName: string;
      requestedRegisteredName: string;
    } | null;
  };
};

export async function submitComplaint(
  input: SubmitComplaintInput,
  authToken?: string | null,
) {
  const response = await apiRequest<{ ticketId: string; ticketNumber: string }>(
    "/api/mobile/complaints",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    {
      authToken,
      phase: "final submit",
      timeoutMs: 30_000,
      idempotent: true,
    },
  );
  complaintReportsMemoryCache = null;
  return response;
}
