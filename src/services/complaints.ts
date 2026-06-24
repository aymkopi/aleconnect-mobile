import type { ComplaintMeta, Report } from "@/features/complaints/data";
import { apiRequest } from "@/services/api";

export type EvidenceUpload = {
  key: string;
  uploadUrl: string;
};

export async function fetchComplaintMeta(): Promise<ComplaintMeta> {
  return apiRequest<ComplaintMeta>("/api/mobile/complaints/meta");
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
