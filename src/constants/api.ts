import Constants from "expo-constants";

function getExpoHostBaseUrl(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(":")[0];
  return host ? `http://${host}:5173` : null;
}

export const aleconnectApiBaseUrl = (
  process.env.EXPO_PUBLIC_ALECONNECT_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  getExpoHostBaseUrl() ??
  "http://localhost:5173"
).replace(/\/$/, "");

export const aleconnectAssetBaseUrl = aleconnectApiBaseUrl.replace(
  "://api.aleconnect.app",
  "://aleconnect.app",
);
