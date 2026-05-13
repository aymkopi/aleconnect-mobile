import Constants from "expo-constants";

export const expoPushProjectId =
  Constants.expoConfig?.extra?.eas?.projectId ??
  Constants.easConfig?.projectId ??
  null;
