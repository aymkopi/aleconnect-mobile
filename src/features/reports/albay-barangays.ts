import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";

import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

import albayBarangaysJson from "@/assets/geo/albay_barangays.json";

type BarangayProperties = {
  adm1_psgc: number;
  adm2_psgc: number;
  adm3_psgc: number;
  adm4_psgc: number;
  adm4_en: string;
  geo_level: string;

  bbox?: number[];
};

type AlbayBarangayCollection = FeatureCollection<
  Polygon | MultiPolygon,
  BarangayProperties
>;

const albayBarangays = albayBarangaysJson as unknown as AlbayBarangayCollection;

function normalizePsgc(value: number | string) {
  return String(value).padStart(10, "0");
}
function isInsideBbox(longitude: number, latitude: number, bbox?: number[]) {
  if (!bbox || bbox.length < 4) {
    return true;
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;

  return (
    longitude >= minLongitude &&
    longitude <= maxLongitude &&
    latitude >= minLatitude &&
    latitude <= maxLatitude
  );
}

export type DetectedBarangay = {
  barangayPsgc: string;
  barangayName: string;
  municipalityPsgc: string;
};

export function findAlbayBarangay(
  latitude: number,
  longitude: number,
): DetectedBarangay | null {
  for (const feature of albayBarangays.features) {
    // Fast rejection before doing point-in-polygon.
    if (!isInsideBbox(longitude, latitude, feature.properties.bbox)) {
      continue;
    }

    const inside = booleanPointInPolygon([longitude, latitude], feature as any);

    if (!inside) continue;

    return {
      barangayPsgc: normalizePsgc(feature.properties.adm4_psgc),

      municipalityPsgc: normalizePsgc(feature.properties.adm3_psgc),

      barangayName: feature.properties.adm4_en,
    };
  }

  return null;
}
