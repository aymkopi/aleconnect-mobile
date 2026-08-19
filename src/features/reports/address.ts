import type { LocationGeocodedAddress } from "expo-location";

import type { ComplaintMeta } from "./data.ts";

export type ResolvedReportAddress = {
  municipalityCode: string;
  municipalityName: string;
  barangayPsgc: string;
  barangayName: string;
  purok: string;
  province: string;
  isInAlbay: boolean;
};

export function canUseResolvedPin(address: ResolvedReportAddress | null) {
  return Boolean(address?.isInAlbay && address.municipalityCode);
}

function normalizePlaceName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(city|municipality|province|barangay|brgy|of)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findPlace<T extends { name: string }>(
  places: T[],
  candidates: (string | null)[],
) {
  const names = candidates.map(normalizePlaceName).filter(Boolean);
  return places.find((place) => {
    const placeName = normalizePlaceName(place.name);
    return names.some(
      (name) =>
        name === placeName ||
        (name.length > 3 &&
          placeName.length > 3 &&
          (name.includes(placeName) || placeName.includes(name))),
    );
  });
}

function normalizePsgc(value: string | number | null | undefined) {
  if (value == null) return "";
  return String(value).replace(/\D/g, "");
}

function getPsgcVariants(value: string | number | null | undefined) {
  const code = normalizePsgc(value);
  const variants = new Set<string>();

  if (!code) return variants;

  variants.add(code);

  if (code.length === 10) {
    variants.add(code.slice(0, 2) + code.slice(3));
  }

  if (code.length === 9) {
    variants.add(code.slice(0, 2) + "0" + code.slice(2));
  }

  return variants;
}

export function psgcMatches(
  first: string | number | null | undefined,
  second: string | number | null | undefined,
) {
  const firstVariants = getPsgcVariants(first);
  const secondVariants = getPsgcVariants(second);

  return [...firstVariants].some((value) => secondVariants.has(value));
}

export function findCanonicalLocationByBarangayPsgc(
  barangayPsgc: string,
  meta: Pick<ComplaintMeta, "municipalities" | "barangays">,
) {
  const barangay = meta.barangays.find((item) =>
    psgcMatches(item.code, barangayPsgc),
  );

  const municipality = barangay
    ? meta.municipalities.find(
        (item) => item.code === barangay.municipalityCode,
      )
    : undefined;

  return {
    barangay,
    municipality,
  };
}
export function resolvePsgcAddress(
  address: LocationGeocodedAddress,
  meta: Pick<ComplaintMeta, "municipalities" | "barangays">,
): ResolvedReportAddress {
  const municipality = findPlace(meta.municipalities, [
    address.city,
    address.subregion,
  ]);
  const barangay = municipality
    ? findPlace(
        meta.barangays.filter(
          (item) => item.municipalityCode === municipality.code,
        ),
        [address.district, address.name],
      )
    : undefined;
  const street = [address.streetNumber, address.street]
    .filter(Boolean)
    .join(" ")
    .trim();
  const province =
    [address.subregion, address.region].find(
      (value) => normalizePlaceName(value) === "albay",
    ) ?? "";

  return {
    municipalityCode: municipality?.code ?? "",
    municipalityName: municipality?.name ?? address.city ?? "",
    barangayPsgc: barangay?.code ?? "",
    barangayName: barangay?.name ?? address.district ?? "",
    purok: street || address.name || "",
    province,
    isInAlbay: Boolean(province),
  };
}

export function formatResolvedAddress(address: ResolvedReportAddress) {
  return [
    address.purok,
    address.barangayName,
    address.municipalityName,
    address.province,
  ]
    .filter(Boolean)
    .join(", ");
}
