import { apiRequest } from "@/services/api";

import {
  toConsumerProfileView,
  type ConsumerProfileView,
} from "@/models/consumer-profile-view";

type MobileProfileResponse = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  mapCoordinates: string | null;
  purokOrStreet: string | null;
  barangayName: string | null;
  municipalityName: string | null;
  customerClass: string | null;
  poleNumber: string | null;
  meterSerialNumber: string | null;
  mustChangePassword: boolean;
};

function toProfileRow(profile: MobileProfileResponse): Record<string, unknown> {
  const fullAddress =
    [profile.purokOrStreet, profile.barangayName, profile.municipalityName]
      .filter(Boolean)
      .join(", ") || null;

  return {
    profile_id: profile.id,
    account_number: profile.username,
    full_name: profile.name,
    contact_num: profile.phoneNumber,
    email: profile.email,
    avatar_url: profile.avatarUrl,
    purok_or_street: profile.purokOrStreet,
    barangay: profile.barangayName,
    municipality: profile.municipalityName,
    full_address: fullAddress,
    meter_serial_num: profile.meterSerialNumber,
    pole_number: profile.poleNumber,
    service_type: profile.customerClass,
    home_coordinates: profile.mapCoordinates,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function fetchCurrentConsumerProfileView(): Promise<ConsumerProfileView | null> {
  const profile = await apiRequest<MobileProfileResponse>(
    "/api/mobile/profile",
  );

  return toConsumerProfileView(toProfileRow(profile));
}

export async function updateCurrentConsumerProfile(
  field: "phone" | "email" | "address",
  value: string,
): Promise<void> {
  await apiRequest<{ updated: true }>("/api/mobile/profile", {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export type UploadProfileAvatarInput = {
  imageBytes: ArrayBuffer;
  contentType: string;
};

export async function uploadCurrentUserAvatar({
  imageBytes,
  contentType,
}: UploadProfileAvatarInput): Promise<string> {
  const { uploadUrl, key } = await apiRequest<{
    uploadUrl: string;
    key: string;
  }>("/api/mobile/profile/avatar-upload", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: imageBytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Avatar upload failed with ${uploadResponse.status}`);
  }

  const { avatarUrl } = await apiRequest<{ avatarUrl: string }>(
    "/api/mobile/profile/avatar-complete",
    {
      method: "POST",
      body: JSON.stringify({ key }),
    },
  );

  return avatarUrl;
}

export { ConsumerProfileView };
