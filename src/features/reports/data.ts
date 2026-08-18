import {
  formatManilaDateTime,
  parseApiInstant,
} from "../../utils/manila-time.ts";

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
  displayAddress?: string | null;
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

export type ConsumerServiceMemoUpdate = {
  id: string;
  type: "additional_detail" | "operational_note" | "correction";
  body: string;
  publishedAt: string;
  operationalPhase: string | null;
  estimateStartAt: string | null;
  estimateEndAt: string | null;
  estimateUnavailableReason: string | null;
  nextUpdateDueAt: string | null;
  classification: "standard" | "extended_outage" | null;
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
  consumerUpdates: ConsumerServiceMemoUpdate[];
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
export function normalizeReportDisplayAddress(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeReportListItem(report: Report): Report {
  return {
    ...report,
    displayAddress: normalizeReportDisplayAddress(report.displayAddress),
  };
}
export function buildReportDetailTimeline(
  history: readonly ReportHistoryItem[],
  status: string,
  createdAt: string,
): ReportHistoryItem[] {
  if (history.length > 0) return [...history];
  return [
    {
      id: "created",
      fromStatus: null,
      toStatus: status,
      note: "Report received.",
      changedAt: createdAt,
    },
  ];
}

export function consumerMessageTimelineIndex(
  timeline: readonly Pick<ReportHistoryItem, "toStatus" | "changedAt">[],
  consumerMessage: string | null,
) {
  if (!normalizeConsumerMessage(consumerMessage)) return null;

  let selectedIndex: number | null = null;
  let selectedChangedAt: number | null = null;
  let hasValidTimestamp = false;
  for (const [index, item] of timeline.entries()) {
    const normalizedStatus = item.toStatus
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (normalizedStatus !== "verified") continue;

    const changedAt = parseApiInstant(item.changedAt)?.getTime();
    if (changedAt === undefined) {
      if (!hasValidTimestamp) selectedIndex = index;
      continue;
    }

    if (
      !hasValidTimestamp ||
      selectedChangedAt === null ||
      changedAt >= selectedChangedAt
    ) {
      selectedIndex = index;
      selectedChangedAt = changedAt;
      hasValidTimestamp = true;
    }
  }

  return selectedIndex;
}

const consumerServiceMemoUpdateTypes = new Set([
  "additional_detail",
  "operational_note",
  "correction",
]);

function optionalInstant(value: unknown) {
  return typeof value === "string" && parseApiInstant(value) ? value : null;
}

function parseConsumerServiceMemoUpdate(
  value: unknown,
): ConsumerServiceMemoUpdate | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const type = typeof value.type === "string" ? value.type.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const publishedAt = optionalInstant(value.publishedAt);
  if (!id || !consumerServiceMemoUpdateTypes.has(type) || !body || !publishedAt) {
    return null;
  }
  const classification = value.classification === "standard"
    || value.classification === "extended_outage"
    ? value.classification
    : null;
  return {
    id,
    type: type as ConsumerServiceMemoUpdate["type"],
    body,
    publishedAt,
    operationalPhase:
      typeof value.operationalPhase === "string" && value.operationalPhase.trim()
        ? value.operationalPhase.trim()
        : null,
    estimateStartAt: optionalInstant(value.estimateStartAt),
    estimateEndAt: optionalInstant(value.estimateEndAt),
    estimateUnavailableReason:
      typeof value.estimateUnavailableReason === "string"
      && value.estimateUnavailableReason.trim()
        ? value.estimateUnavailableReason.trim()
        : null,
    nextUpdateDueAt: optionalInstant(value.nextUpdateDueAt),
    classification,
  };
}

function legacyConsumerServiceMemoUpdate(
  update: IncidentPublicUpdate,
): ConsumerServiceMemoUpdate {
  return {
    id: update.id,
    type: "operational_note",
    body: update.publicNote,
    publishedAt: update.publishedAt,
    operationalPhase: update.phase,
    estimateStartAt: update.estimateStartAt,
    estimateEndAt: update.estimateEndAt,
    estimateUnavailableReason: update.estimateUnavailableReason,
    nextUpdateDueAt: update.nextUpdateDueAt,
    classification: update.classification,
  };
}

export function parseReportDetailResponse(value: unknown): ReportDetail {
  const report =
    isRecord(value) && isRecord(value.report) ? value.report : null;
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

  const publicUpdates = report.publicUpdates as IncidentPublicUpdate[];
  const consumerUpdates = Array.isArray(report.consumerUpdates)
    ? report.consumerUpdates
        .map(parseConsumerServiceMemoUpdate)
        .filter((update): update is ConsumerServiceMemoUpdate => update !== null)
    : publicUpdates.map(legacyConsumerServiceMemoUpdate);

  return {
    ...(report as unknown as ReportDetail),
    publicUpdates,
    consumerUpdates,
    imageUrls: Array.isArray(report.imageUrls)
      ? report.imageUrls.filter(isHttpUrl)
      : [],
    imageUrlsExpiresAt:
      typeof report.imageUrlsExpiresAt === "string" &&
      parseApiInstant(report.imageUrlsExpiresAt)
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
  return formatManilaDateTime(value);
}

export function formatStatus(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
