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
  imageKeys: string[];
  ticketNumber: string | null;
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
  imageKeys: [],
  ticketNumber: null,
};

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
