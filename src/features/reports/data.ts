export type ComplaintCategory = {
  id: string;
  title: string;
  description: string;
  color: string;
  requiresDescription: boolean;
  descriptionLabel?: string;
};

export type ComplaintType = {
  id: string;
  categoryId: string;
  title: string;
  priority: string | null;
  requiresDescription: boolean;
  descriptionLabel?: string;
  requiresKwhmTransfer: boolean;
};

export type ComplaintMunicipality = {
  code: string;
  name: string;
};

export type ComplaintBarangay = {
  code: string;
  name: string;
  municipalityCode: string;
  municipalityName: string;
};

export type ComplaintMeta = {
  categories: ComplaintCategory[];
  types: ComplaintType[];
  municipalities: ComplaintMunicipality[];
  barangays: ComplaintBarangay[];
};

export type Report = {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  typeId: string;
  typeTitle: string;
  createdAt: string;
  status: string;
  ticketNumber: string;
  description?: string | null;
  imageUrls?: string[];
};

export type ReportHistoryItem = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedAt: string;
};

export type IncidentPublicUpdate = {
  id: string;
  phase: string;
  publicNote: string;
  estimateStartAt: string | null;
  estimateEndAt: string | null;
  estimateUnavailableReason: string | null;
  nextUpdateDueAt: string;
  classification: "standard" | "extended_outage";
  publishedAt: string;
};

export type ReportDetail = Report & {
  imageUrlsExpiresAt: string | null;
  consumerMessage: string | null;
  actionDesired: string | null;
  purok: string | null;
  barangayPsgc: string | null;
  barangayName: string | null;
  municipalityName: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  history: ReportHistoryItem[];
  publicUpdates: IncidentPublicUpdate[];
  reportDetails?: {
    version: number;
    categoryDescription: string | null;
    typeDescription: string | null;
    kwhmTransfer: {
      currentRegisteredName: string;
      requestedRegisteredName: string;
    } | null;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function normalizeConsumerMessage(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildReportDetailTimeline(
  history: readonly ReportHistoryItem[],
  status: string,
  createdAt: string,
): ReportHistoryItem[] {
  if (history.length > 0) return [...history];
  return [{
    id: "created",
    fromStatus: null,
    toStatus: status,
    note: "Report received.",
    changedAt: createdAt,
  }];
}

export function consumerMessageTimelineIndex(
  timeline: readonly Pick<ReportHistoryItem, "toStatus" | "changedAt">[],
  consumerMessage: string | null,
) {
  if (!normalizeConsumerMessage(consumerMessage)) return null;

  let selectedIndex: number | null = null;
  let selectedChangedAt = Number.NaN;
  for (const [index, item] of timeline.entries()) {
    const normalizedStatus = item.toStatus.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (normalizedStatus !== "verified") continue;

    const changedAt = Date.parse(item.changedAt);
    if (
      selectedIndex === null
      || (
        Number.isFinite(changedAt)
        && Number.isFinite(selectedChangedAt)
        && changedAt >= selectedChangedAt
      )
      || !Number.isFinite(changedAt)
      || !Number.isFinite(selectedChangedAt)
    ) {
      selectedIndex = index;
      selectedChangedAt = changedAt;
    }
  }

  return selectedIndex;
}

export function parseReportDetailResponse(value: unknown): ReportDetail {
  const report = isRecord(value) && isRecord(value.report) ? value.report : null;
  const requiredStrings = [
    "id",
    "ticketNumber",
    "title",
    "status",
    "createdAt",
    "typeId",
    "typeTitle",
    "categoryId",
    "categoryTitle",
  ];
  if (
    !report ||
    requiredStrings.some(
      (key) => typeof report[key] !== "string" || !report[key].trim(),
    ) ||
    !Array.isArray(report.history) ||
    !Array.isArray(report.publicUpdates)
  ) {
    throw new Error("Report details response was incomplete.");
  }

  return {
    ...(report as unknown as ReportDetail),
    imageUrls: Array.isArray(report.imageUrls)
      ? report.imageUrls.filter(isHttpUrl)
      : [],
    imageUrlsExpiresAt:
      typeof report.imageUrlsExpiresAt === "string" &&
      Number.isFinite(Date.parse(report.imageUrlsExpiresAt))
        ? report.imageUrlsExpiresAt
        : null,
    consumerMessage: normalizeConsumerMessage(report.consumerMessage),
  };
}

export type ComplaintFormState = {
  categoryId: string;
  typeId: string;
  accountNumber: string;
  useHomeAddress: boolean;
  municipalityCode: string;
  barangayPsgc: string;
  purok: string;
  landmark: string;
  categoryDescription: string;
  typeDescription: string;
  currentRegisteredName: string;
  requestedRegisteredName: string;
  desiredAction: string;
  photos: string[];
  photoUploads: ComplaintPhotoUpload[];
  latitude: number | null;
  longitude: number | null;
  locationVerified: boolean;
  ticketId: string | null;
  ticketNumber: string | null;
};

export type ComplaintPhotoUpload = {
  id: string;
  uri: string;
  size: number | null;
  status: "processing" | "ready" | "failed";
  error?: string;
};

export const emptyComplaintMeta: ComplaintMeta = {
  categories: [],
  types: [],
  municipalities: [],
  barangays: [],
};

export const initialComplaintForm: ComplaintFormState = {
  categoryId: "",
  typeId: "",
  accountNumber: "",
  useHomeAddress: true,
  municipalityCode: "",
  barangayPsgc: "",
  purok: "",
  landmark: "",
  categoryDescription: "",
  typeDescription: "",
  currentRegisteredName: "",
  requestedRegisteredName: "",
  desiredAction: "",
  photos: [],
  photoUploads: [],
  latitude: null,
  longitude: null,
  locationVerified: false,
  ticketId: null,
  ticketNumber: null,
};

const complaintCategoryTitles: Record<string, string> = {
  "Complaints/Service on Service Drop": "Service Drop",
  "Complaints on KWHR Meter": "Electric Meter",
  "Distribution Pole Complaint and Others": "Poles and Lines",
  "Clearing of Distribution Line": "Line Clearing",
  "Other Verified Complaints": "Official Referrals",
};

export function formatComplaintCategoryTitle(title: string) {
  return complaintCategoryTitles[title] ?? title;
}

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
