import Constants from "expo-constants";

function getExpoHostBaseUrl(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(":")[0];
  return host ? `http://${host}:5173` : null;
}

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_ALECONNECT_API_URL ??
  process.env.EXPO_PUBLIC_API_URL;
const resolvedApiBaseUrl =
  configuredApiBaseUrl ??
  (__DEV__ ? getExpoHostBaseUrl() ?? "http://localhost:5173" : null);

if (!resolvedApiBaseUrl) {
  throw new Error(
    "EXPO_PUBLIC_ALECONNECT_API_URL is required for production builds.",
  );
}

if (!__DEV__ && new URL(resolvedApiBaseUrl).protocol !== "https:") {
  throw new Error("Aleconnect production API must use HTTPS.");
}

export const aleconnectApiBaseUrl = resolvedApiBaseUrl.replace(/\/$/, "");

export const aleconnectAssetBaseUrl = aleconnectApiBaseUrl.replace(
  "://api.aleconnect.app",
  "://aleconnect.app",
);
