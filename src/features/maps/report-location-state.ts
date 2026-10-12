import { isWithinAlbay } from "../reports/contract.ts";
import {
  findCanonicalLocationByBarangayPsgc,
  type HomeReportLocation,
} from "../reports/address.ts";
import type { ComplaintMeta } from "../reports/data.ts";
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
