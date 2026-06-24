export type CategoryId =
  | "power"
  | "quality"
  | "poles"
  | "meter"
  | "drop"
  | "referrals"
  | "other";

export type Report = {
  id: string;
  title: string;
  category: CategoryId;
  type: string;
  date: string;
  status: "Received" | "In review" | "Assigned";
  ticket: string;
};

export type ComplaintFormState = {
  category: CategoryId | null;
  reportType: string;
  accountNumber: string;
  useHomeAddress: boolean;
  municipality: string;
  barangay: string;
  purok: string;
  landmark: string;
  description: string;
  desiredAction: string;
  photos: number;
  ticketNumber: string | null;
};

export const complaintCategories: Array<{
  id: CategoryId;
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: "power",
    title: "No Light/Power",
    description: "Total or partial loss of electricity in your home or area.",
    color: "#0b8ff0",
  },
  {
    id: "quality",
    title: "Power Quality",
    description: "Unstable power, dimming lights, or frequent voltage surges.",
    color: "#1fa62e",
  },
  {
    id: "poles",
    title: "Dist. Poles and Lines",
    description: "Hazards involving poles, lines, or wire obstructions.",
    color: "#e3a411",
  },
  {
    id: "meter",
    title: "Electric Meter",
    description: "Meter accuracy, damage, or relocation concerns.",
    color: "#c51643",
  },
  {
    id: "drop",
    title: "Service Drop",
    description: "Problems with wires connecting the street post to your house.",
    color: "#3520bf",
  },
  {
    id: "referrals",
    title: "Official Referrals",
    description: "Formal inquiries from government agencies.",
    color: "#0b8ff0",
  },
  {
    id: "other",
    title: "Others",
    description: "Illegal connections, employee conduct, or general concerns.",
    color: "#159a25",
  },
];

export const reportTypesByCategory: Record<CategoryId, string[]> = {
  power: ["No power", "Brownout", "Partial outage"],
  quality: ["Low voltage", "Power fluctuation", "Frequent interruption"],
  poles: ["Leaning pole", "Low-hanging wire", "Broken insulator"],
  meter: ["Damaged meter", "Meter reading concern", "Relocation request"],
  drop: ["Loose service drop", "Detached service wire", "Service wire hazard"],
  referrals: ["Barangay endorsement", "Agency referral", "Formal inquiry"],
  other: ["Illegal connection", "Employee conduct", "Other concern"],
};

export const recentReports: Report[] = [
  {
    id: "1",
    title: "No power since early morning",
    category: "power",
    type: "No power",
    date: "2026-06-24T07:10:00",
    status: "Assigned",
    ticket: "ALC-2026-281",
  },
  {
    id: "2",
    title: "Voltage keeps dropping",
    category: "quality",
    type: "Low voltage",
    date: "2026-06-23T16:35:00",
    status: "In review",
    ticket: "ALC-2026-276",
  },
  {
    id: "3",
    title: "Meter glass cracked",
    category: "meter",
    type: "Damaged meter",
    date: "2026-06-20T09:20:00",
    status: "Received",
    ticket: "ALC-2026-260",
  },
];

export const initialComplaintForm: ComplaintFormState = {
  category: null,
  reportType: "",
  accountNumber: "",
  useHomeAddress: true,
  municipality: "",
  barangay: "",
  purok: "",
  landmark: "",
  description: "",
  desiredAction: "",
  photos: 0,
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

export function nextTicketNumber() {
  return `ALC-${new Date().getFullYear()}-${Math.floor(280 + Math.random() * 700)}`;
}
