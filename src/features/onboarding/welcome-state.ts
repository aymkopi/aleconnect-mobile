export const welcomeSeenKey = "aleconnect_welcome_seen_v1";

export const welcomeSlides = [
  {
    title: "Stay informed.\nPlan your day.",
    description: "See scheduled outages and service updates from ALECO in one place.",
  },
  {
    title: "Report an issue.\nFollow its progress.",
    description: "Add photos, pin the location and follow updates until your report is resolved.",
  },
  {
    title: "Help is always\nwithin reach.",
    description: "Explore public updates and hotlines as a guest. Sign in to report issues and manage your accounts.",
  },
] as const;

export function welcomeEntryRoute({ isLoading, hasSession, hasSeenWelcome }: {
  isLoading: boolean;
  hasSession: boolean;
  hasSeenWelcome: boolean | null;
}): "/home" | "/welcome" | null {
  if (isLoading) return null;
  if (hasSession) return "/home";
  if (hasSeenWelcome === null) return null;
  return hasSeenWelcome ? "/home" : "/welcome";
}
