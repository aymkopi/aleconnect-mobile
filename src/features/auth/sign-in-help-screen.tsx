import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useProfileBackGuard } from "@/features/profile/profile-ui";
import { signInIntent } from "./auth-state";

export default function SignInHelpScreen() {
  const params = useLocalSearchParams<{
    mode?: string | string[]; context?: string | string[]; returnTo?: string | string[]; linking?: string | string[];
  }>();
  const intent = signInIntent(params), router = useRouter();
  const linkingParams = intent.linking ? { linking: "1" } : {};
  const { session, signOut } = useAuthSession();
  const [primary] = useAppColors(["primary"]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const mounted = useRef(true), leaving = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  async function go(destination: "contact" | "method" | "guest") {
    if (leaving.current) return;
    leaving.current = true;
    setBusy(true); setError("");
    try {
      // Public help must not carry a session that still requires a password change.
      if (session && (destination !== "contact" || session.user.mustChangePassword)) await signOut();
      if (!mounted.current) return;
      allowLeave();
      if (destination === "method") router.replace({
        pathname: "/sign-in",
        params: { mode: intent.mode === "account" ? "email" : "account", context: intent.context, returnTo: intent.returnTo, ...linkingParams },
      });
      else router.replace(destination === "contact" ? "/hotlines" : "/home");
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Could not continue. Try again.");
    } finally {
      leaving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function back() {
    if (busy) return;
    if (router.canGoBack()) router.back();
    else if (session?.user.mustChangePassword) router.replace({ pathname: "/required-password", params: { returnTo: intent.returnTo, ...linkingParams } });
    else router.replace({ pathname: "/sign-in", params: { mode: intent.mode, context: intent.context, returnTo: intent.returnTo, ...linkingParams } });
  }
  const allowLeave = useProfileBackGuard(busy, back);
  const actions = [
    { key: "contact", title: "Contact ALECO", description: "Choose an official contact" },
    { key: "method", title: "Use another sign-in method", description: "Account number or email" },
    { key: "guest", title: "Explore as a guest", description: "Public updates and hotlines" },
  ] as const;
  return <ReportPage title="Sign-in help" onBack={back}
    footer={<Button loading={busy} disabled={busy} onPress={() => void go("contact")} style={{ minHeight: 48 }} accessibilityLabel="Contact ALECO"><Text size="sm" weight="semibold" className="text-primary-foreground">Contact ALECO</Text></Button>}>
    <Text accessibilityRole="header" style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 18, lineHeight: 26 }}>Let’s get you back in</Text>
    <Text muted size="sm" style={{ lineHeight: 23 }}>For password recovery or an unverified sign-in email, contact ALECO. Have your account number ready.</Text>
    {session?.user.mustChangePassword ? <Text size="sm" muted>Choosing a help option signs you out. Your account still requires a password change when you return.</Text> : null}
    {actions.map((action) => <Pressable key={action.key} accessibilityRole="button"
      accessibilityLabel={action.title} accessibilityState={{ disabled: busy }} disabled={busy}
      onPress={() => void go(action.key)}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
      style={{ minHeight: 64 }}>
      <View className="items-center justify-center rounded-xl bg-primary/5" style={{ width: 32, height: 32 }}><FileText size={20} color={primary} /></View>
      <View className="flex-1 gap-0.5"><Text size="sm" weight="semibold">{action.title}</Text><Text size="xs" muted>{action.description}</Text></View>
      <ChevronRight size={16} color={primary} />
    </Pressable>)}
    {error ? <Text accessibilityRole="alert" className="text-destructive" size="sm">{error}</Text> : null}
  </ReportPage>;
}
