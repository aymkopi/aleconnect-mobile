import type { ComplaintMeta, ComplaintPhotoUpload } from "./data.ts";
export const creationFixtureAccounts = [
  {
    id: "fixture-home",
    accountNumber: "4821",
    registeredName: "Home",
    isDefault: true,
    address: "Rawis, Legazpi City",
  },
  {
    id: "fixture-family",
    accountNumber: "7604",
    registeredName: "Family home",
    isDefault: false,
    address: "Bigaa, Legazpi City",
  },
];
const titles = [
  "No Light / Power",
  "Power Quality",
  "Service Drop",
  "Pole Complaint",
  "KWHR Meter",
  "Line Clearing",
  "Temp. Disconnection",
  "Temp. Lighting",
  "Transformer Check-up",
  "Others",
  "Verified Complaints",
];
export const creationFixtureMeta: ComplaintMeta = {
  categories: titles.map((title, index) => ({
    id: `fixture-category-${index}`,
    title,
    description: "",
    color: "",
    requiresDescription: index === 9,
  })),
  types: [
    ...[
      "Primary Line",
      "Distribution Transformer / Secondary Line",
      "Residence No Power",
    ].map((title, index) => ({
      id: `fixture-type-${index}`,
      categoryId: "fixture-category-0",
      title,
      priority: null,
      requiresDescription: false,
      requiresKwhmTransfer: false,
    })),
    ...titles.slice(1).map((title, index) => ({
      id: `fixture-other-type-${index}`,
      categoryId: `fixture-category-${index + 1}`,
      title: index === 3 ? "Transfer of KWHR meter name" : title,
      priority: null,
      requiresDescription: index === 8,
      requiresKwhmTransfer: index === 3,
    })),
  ],
  municipalities: [{ code: "0505060000", name: "Legazpi City" }],
  barangays: [
    {
      code: "0505060010",
      name: "Bigaa",
      municipalityCode: "0505060000",
      municipalityName: "Legazpi City",
    },
  ],
};
export const creationFixtureLocation = {
  municipalityCode: "0505060000",
  barangayPsgc: "0505060010",
  purok: "14 Rizal Street",
  landmark: "",
  latitude: 13.1806,
  longitude: 123.7416,
  locationVerified: true,
};
export function buildFixtureEvidence(
  uris: readonly string[],
  state: string,
): ComplaintPhotoUpload[] {
  if (state === "removed") return [];
  return uris
    .slice(0, 3)
    .map((uri, index) => ({
      id: `fixture-photo-${index}`,
      uri,
      size: state === "preparing" ? null : 30_000,
      status:
        state === "preparing"
          ? "processing"
          : state === "failed" && index === 0
            ? "failed"
            : "ready",
      ...(state === "failed" && index === 0
        ? {
            error:
              "Simulated preparation failure. Remove this photo and add it again.",
          }
        : {}),
    }));
}
