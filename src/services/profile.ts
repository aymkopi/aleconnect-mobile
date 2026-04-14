import { supabase } from "@/services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  toConsumerProfileView,
  type ConsumerProfileView,
} from "@/models/consumer-profile-view";

const avatarBucket = "profile_images";
const avatarSignedUrlTtlSeconds = 60 * 60 * 24 * 30;
const avatarSignedUrlCachePrefix = "avatar_signed_url_v1";
const avatarSignedUrlRefreshBufferMs = 5 * 60 * 1000;

type AvatarSignedUrlCachePayload = {
  url: string;
  expiresAt: number;
};

function buildAvatarSignedUrlCacheKey(path: string): string {
  return `${avatarSignedUrlCachePrefix}:${encodeURIComponent(path)}`;
}

async function getCachedAvatarSignedUrl(path: string): Promise<string | null> {
  const cacheKey = buildAvatarSignedUrlCacheKey(path);
  const raw = await AsyncStorage.getItem(cacheKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AvatarSignedUrlCachePayload;
    if (!parsed?.url || typeof parsed.expiresAt !== "number") {
      return null;
    }

    if (Date.now() >= parsed.expiresAt - avatarSignedUrlRefreshBufferMs) {
      return null;
    }

    return parsed.url;
  } catch {
    return null;
  }
}

async function cacheAvatarSignedUrl(path: string, url: string): Promise<void> {
  const cacheKey = buildAvatarSignedUrlCacheKey(path);
  const payload: AvatarSignedUrlCachePayload = {
    url,
    expiresAt: Date.now() + avatarSignedUrlTtlSeconds * 1000,
  };

  await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
}

function extractAvatarPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const match = trimmed.match(/\/profile_images\/([^?]+)/i);
    if (!match || !match[1]) {
      return null;
    }

    return decodeURIComponent(match[1]);
  }

  return trimmed;
}

function appendVersion(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

async function createAvatarSignedUrl(path: string): Promise<string> {
  const cachedUrl = await getCachedAvatarSignedUrl(path);
  if (cachedUrl) {
    return cachedUrl;
  }

  const { data, error } = await supabase.storage
    .from(avatarBucket)
    .createSignedUrl(path, avatarSignedUrlTtlSeconds);

  if (error) {
    throw error;
  }

  await cacheAvatarSignedUrl(path, data.signedUrl);
  return data.signedUrl;
}

export async function fetchCurrentConsumerProfileView(): Promise<ConsumerProfileView | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("v_consumer_details")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const view = toConsumerProfileView(data as Record<string, unknown>);
  if (!view.avatarUrl) {
    return view;
  }

  const avatarPath = extractAvatarPath(view.avatarUrl);
  if (!avatarPath) {
    return { ...view, avatarUrl: null };
  }

  try {
    const signedUrl = await createAvatarSignedUrl(avatarPath);
    return { ...view, avatarUrl: signedUrl };
  } catch {
    return { ...view, avatarUrl: null };
  }
}

export type UploadProfileAvatarInput = {
  imageBytes: ArrayBuffer;
  contentType: string;
};

export async function uploadCurrentUserAvatar({
  imageBytes,
  contentType,
}: UploadProfileAvatarInput): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error("Sign in required to upload avatar.");
  }

  const avatarPath = `${user.id}/avatar.webp`;
  const { error: uploadError } = await supabase.storage
    .from(avatarBucket)
    .upload(avatarPath, imageBytes, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarPath, updated_at: new Date().toISOString() })
    .eq("profile_id", user.id);

  if (updateError) {
    throw updateError;
  }

  const signedUrl = await createAvatarSignedUrl(avatarPath);
  return appendVersion(signedUrl);
}

export { ConsumerProfileView };

