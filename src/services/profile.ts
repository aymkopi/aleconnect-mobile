import { toConsumerProfileView, type ConsumerProfileView } from "@/models/consumer-profile-view";
import { apiRequest } from "@/services/api";

export type ConsumerProfileScope = { serviceAccountId: string; accessRevision: number };

type MobileProfileResponse = {
  id: string; name: string; email: string; username: string | null; phoneNumber: string | null;
  avatarUrl: string | null; mapCoordinates: string | null; purokOrStreet: string | null;
  barangayPsgc: string | null; barangayName: string | null; municipalityCode: string | null;
  municipalityName: string | null; landmark: string | null; customerClass: string | null;
  poleNumber: string | null; meterSerialNumber: string | null; mustChangePassword: boolean;
  serviceAccountId?: string; accessRevision?: number;
  emailScope?: "identity" | "service_account"; emailEditable?: boolean;
};

function profilePath(scope?: ConsumerProfileScope): string {
  if (!scope) return "/api/mobile/profile";
  const query = new URLSearchParams({ serviceAccountId: scope.serviceAccountId });
  return `/api/mobile/profile?${query.toString()}`;
}

function toProfileRow(profile: MobileProfileResponse): Record<string, unknown> {
  const fullAddress = [profile.purokOrStreet, profile.barangayName, profile.municipalityName, profile.landmark].filter(Boolean).join(", ") || null;
  return {
    profile_id: profile.serviceAccountId ?? profile.id, account_number: profile.username, full_name: profile.name,
    contact_num: profile.phoneNumber, email: profile.email, avatar_url: profile.avatarUrl,
    purok_or_street: profile.purokOrStreet, barangay_psgc: profile.barangayPsgc, barangay: profile.barangayName,
    municipality_code: profile.municipalityCode, municipality: profile.municipalityName, landmark: profile.landmark,
    full_address: fullAddress, meter_serial_num: profile.meterSerialNumber, pole_number: profile.poleNumber,
    service_type: profile.customerClass, home_coordinates: profile.mapCoordinates, is_active: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

export async function fetchCurrentConsumerProfileView(scope?: ConsumerProfileScope): Promise<ConsumerProfileView | null> {
  return toConsumerProfileView(toProfileRow(await apiRequest<MobileProfileResponse>(profilePath(scope))));
}

function scopeBody(scope?: ConsumerProfileScope) {
  return scope ? { serviceAccountId: scope.serviceAccountId, accessRevision: scope.accessRevision } : {};
}

export async function updateCurrentConsumerProfile(field: "phone" | "email" | "address", value: string, scope?: ConsumerProfileScope): Promise<ConsumerProfileView> {
  const response = await apiRequest<{ updated: true; profile: MobileProfileResponse }>(profilePath(scope), {
    method: "PATCH", body: JSON.stringify({ field, value, ...scopeBody(scope) }),
  });
  return toConsumerProfileView(toProfileRow(response.profile));
}

export type StructuredProfileAddressInput = { municipalityCode: string; barangayPsgc: string; purokOrStreet: string; landmark: string; latitude: number; longitude: number };

export async function updateCurrentConsumerAddress(value: StructuredProfileAddressInput, scope?: ConsumerProfileScope): Promise<ConsumerProfileView> {
  const response = await apiRequest<{ updated: true; profile: MobileProfileResponse }>(profilePath(scope), {
    method: "PATCH", body: JSON.stringify({ field: "address", value, ...scopeBody(scope) }),
  });
  return toConsumerProfileView(toProfileRow(response.profile));
}

export type UploadProfileAvatarInput = { imageBytes: ArrayBuffer; contentType: string };

export async function uploadCurrentUserAvatar({ imageBytes, contentType }: UploadProfileAvatarInput, scope?: ConsumerProfileScope): Promise<string> {
  const query = scope ? `?${new URLSearchParams({ serviceAccountId: scope.serviceAccountId }).toString()}` : "";
  const { uploadUrl, key } = await apiRequest<{ uploadUrl: string; key: string }>(`/api/mobile/profile/avatar-upload${query}`, { method: "POST", body: JSON.stringify({ contentType, ...scopeBody(scope) }) });
  const uploadResponse = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": contentType }, body: imageBytes });
  if (!uploadResponse.ok) throw new Error(`Avatar upload failed with ${uploadResponse.status}`);
  const { avatarUrl } = await apiRequest<{ avatarUrl: string }>("/api/mobile/profile/avatar-complete", { method: "POST", body: JSON.stringify({ key, ...scopeBody(scope) }) });
  return avatarUrl;
}

export { ConsumerProfileView };
