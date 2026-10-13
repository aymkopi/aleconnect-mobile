export type SignInMode = "account" | "email";
export type SignInContext = "new" | "current" | "new-device" | "returning" | "session-ended";
type SearchValue = string | string[] | undefined;
type AuthSearchParams = {
  mode?: SearchValue; linked?: SearchValue; linking?: SearchValue;
  context?: SearchValue; returnTo?: SearchValue;
};
const returnRoutes = [
  "/home", "/reports", "/reports/new", "/reports/list", "/reports/queue",
  "/profile", "/profile/details", "/profile/change-password", "/notification-settings", "/profile/accounts", "/profile/link-account", "/profile/link-requests",
  "/notifications", "/advisories", "/hotlines", "/services",
  "/profile?appearance=1", "/services/request/lighting", "/services/request/disconnection",
] as const;
export type AuthReturnRoute = (typeof returnRoutes)[number];
type AuthSessionState = {
  user: { id: string; mustChangePassword?: boolean; sessionMode?: "legacy" | "identity" };
};

export function authReturnRoute(value: SearchValue): AuthReturnRoute {
  return typeof value === "string" && returnRoutes.includes(value as AuthReturnRoute)
    ? (value as AuthReturnRoute)
    : "/home";
}
export function signInIntent(params: AuthSearchParams) {
  const linking = params.linking === "1";
  return {
    mode: params.mode === "email" || params.linked === "1" ? "email" as const : "account" as const,
    linked: params.linked === "1",
    linking,
    context: ["current", "new-device", "returning", "session-ended"].includes(params.context as string)
      ? params.context as SignInContext : "new" as const,
    returnTo: authReturnRoute(params.returnTo ?? (linking ? "/profile/link-account" : undefined)),
  };
}
export function authResumeRoute(pathname: string, params: AuthSearchParams): AuthReturnRoute {
  return ["/sign-in", "/required-password", "/sign-in-help"].includes(pathname)
    ? signInIntent(params).returnTo : authReturnRoute(pathname);
}
export function signedInDestination(intent: ReturnType<typeof signInIntent>, session: AuthSessionState) {
  return session.user.mustChangePassword || (intent.linking && session.user.sessionMode !== "identity")
    ? { pathname: "/required-password" as const, params: {
        returnTo: "/home", ...(intent.linking ? { linking: "1" } : {}),
      } }
    : "/home";
}
export function signInCopy(mode: SignInMode, context: SignInContext) {
  if (context === "session-ended") return {
    title: "Sign in to continue",
    description: "Sign in with the same account to access reports already saved in this device’s queue. Unsaved changes may need to be entered again.",
  };
  if (mode === "email") return {
    title: "Sign in with email.",
    description: "Use the email linked to your ALECO account.",
  };
  switch (context) {
    case "current": return { title: "Continue to ALEConnect.", description: "Sign in to continue to your account and services." };
    case "new-device": return { title: "New device. Same account.", description: "Use your usual account number and password." };
    case "returning": return { title: "Good to see you again.", description: "Sign in to catch up on reports and advisories." };
    default: return { title: "Welcome to ALEConnect.", description: "Start with the account number on your ALECO bill." };
  }
}
export function validateSignIn(mode: SignInMode, identity: string, password: string) {
  if (!identity.trim()) return mode === "email" ? "Enter your email address." : "Enter your account number.";
  if (mode === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.trim()))
    return "Enter a valid email address.";
  if (!password) return "Enter your password.";
  return null;
}
export function passwordChangeConfirmed(userId: string, session: AuthSessionState | null) {
  return session?.user.id === userId && session.user.mustChangePassword === false;
}
