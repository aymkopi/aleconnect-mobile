export interface ConsumerProfileView {
  readonly profileId: string;
  readonly accountNumber: string | null;
  readonly fullName: string;
  readonly contactNum: string | null;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly purokOrStreet: string | null;
  readonly barangayPsgc: string | null;
  readonly barangay: string | null;
  readonly municipalityCode: string | null;
  readonly municipality: string | null;
  readonly landmark: string | null;
  readonly fullAddress: string | null;
  readonly meterSerialNum: string | null;
  readonly poleNumber: string | null;
  readonly serviceType: string | null;
  readonly homeCoordinates: Record<string, unknown> | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ConsumerProfileViewCachePayload = Omit<
  ConsumerProfileView,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

function readString(
  value: unknown,
  fallback: string | null = null,
): string | null {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readDate(value: unknown): Date {
  if (typeof value === "string" || value instanceof Date) {
    return new Date(value);
  }

  return new Date();
}

export function parseConsumerCoordinates(
  value: unknown,
): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed !== value) return parseConsumerCoordinates(parsed);
    } catch {
      const match = value.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
      );
      if (!match) return null;

      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

export function toConsumerProfileView(
  row: Record<string, unknown>,
): ConsumerProfileView {
  return {
    profileId: String(row.profile_id ?? ""),
    accountNumber: readString(row.account_number),
    fullName: String(row.full_name ?? ""),
    contactNum: readString(row.contact_num),
    email: String(row.email ?? ""),
    avatarUrl: readString(row.avatar_url),
    purokOrStreet: readString(row.purok_or_street),
    barangayPsgc: readString(row.barangay_psgc),
    barangay: readString(row.barangay),
    municipalityCode: readString(row.municipality_code),
    municipality: readString(row.municipality),
    landmark: readString(row.landmark),
    fullAddress: readString(row.full_address),
    meterSerialNum: readString(row.meter_serial_num),
    poleNumber: readString(row.pole_number),
    serviceType: readString(row.service_type),
    homeCoordinates: parseConsumerCoordinates(row.home_coordinates),
    isActive: readBoolean(row.is_active),
    createdAt: readDate(row.created_at),
    updatedAt: readDate(row.updated_at),
  };
}

export function toConsumerProfileViewCachePayload(
  profile: ConsumerProfileView,
): ConsumerProfileViewCachePayload {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function fromConsumerProfileViewCachePayload(
  payload: ConsumerProfileViewCachePayload,
): ConsumerProfileView {
  return {
    ...payload,
    createdAt: readDate(payload.createdAt),
    updatedAt: readDate(payload.updatedAt),
  };
}
