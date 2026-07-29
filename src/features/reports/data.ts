export type ComplaintCategory = {
  id: string;
  title: string;
  description: string;
  color: string;
};

export type ComplaintType = {
  id: string;
  categoryId: string;
  title: string;
  priority: string | null;
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
};

export type ComplaintFormState = {
  categoryId: string;
  typeId: string;
  accountNumber: string;
  useHomeAddress: boolean;
  municipalityCode: string;
  barangayPsgc: string;
  purok: string;
  landmark: string;
  description: string;
  desiredAction: string;
  photos: string[];
  photoUploads: ComplaintPhotoUpload[];
  latitude: number | null;
  longitude: number | null;
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
  description: "",
  desiredAction: "",
  photos: [],
  photoUploads: [],
  latitude: null,
  longitude: null,
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
