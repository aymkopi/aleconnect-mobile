import { albayBounds, isWithinAlbay } from "../reports/contract.ts";
import {
  findCanonicalLocationByBarangayPsgc,
  type HomeReportLocation,
} from "../reports/address.ts";
import type { ComplaintMeta } from "../reports/data.ts";
export const REPORT_MAP_BOUNDS: [number, number, number, number] = [
  albayBounds.minLongitude, albayBounds.minLatitude,
  albayBounds.maxLongitude, albayBounds.maxLatitude,
];
export const REPORT_MAP_MIN_ZOOM = 10;
export const REPORT_MAP_MAX_ZOOM = 20;
export function initialReportCoordinates(point: { latitude: number; longitude: number } | null) {
  return point && isWithinAlbay(point.latitude, point.longitude)
    ? point
    : { latitude: 13.1438, longitude: 123.7438 };
}
export function resolveReportPin(
  coordinates: { latitude: number; longitude: number },
  barangayPsgc: string | null,
  meta: Pick<ComplaintMeta, "municipalities" | "barangays">,
): HomeReportLocation | null {
  if (
    !barangayPsgc ||
    !isWithinAlbay(coordinates.latitude, coordinates.longitude)
  )
    return null;
  const canonical = findCanonicalLocationByBarangayPsgc(barangayPsgc, meta);
  if (!canonical.barangay || !canonical.municipality) return null;
  return {
    ...coordinates,
    municipalityCode: canonical.municipality.code,
    barangayPsgc: canonical.barangay.code,
    purok: "",
    landmark: "",
    locationVerified: true,
  };
}
