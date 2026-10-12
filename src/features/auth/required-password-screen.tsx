import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/panelui/button";
import { Spinner } from "@/components/panelui/spinner";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { ProfileNotice, useProfileBackGuard } from "@/features/profile/profile-ui";
import { validatePasswordChange } from "@/features/profile/profile-state";
import { useAuthSession } from "@/hooks/use-auth-session";
import { changeConsumerPassword } from "@/services/auth";
import { signInIntent, passwordChangeConfirmed } from "./auth-state";
import { AuthPasswordField } from "./auth-password-field";

export default function RequiredPasswordScreen() {
  const { session } = useAuthSession();
  const [returnToEmail, setReturnToEmail] = useState(false);
  return <RequiredPasswordForm key={session?.user.id ?? "guest"}
    returnToEmail={returnToEmail} onReturnToEmail={() => setReturnToEmail(true)} />;
}
function RequiredPasswordForm({ returnToEmail, onReturnToEmail }: {
  returnToEmail: boolean; onReturnToEmail: () => void;
}) {
  const { session, isLoading, refreshSession, signOut } = useAuthSession();
  const params = useLocalSearchParams<{
    mode?: string | string[]; linking?: string | string[]; returnTo?: string | string[];
  }>();
  const intent = signInIntent(params), returnTo = intent.returnTo, router = useRouter();
  const [current, setCurrent] = useState(""), [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [updated, setUpdated] = useState(false), [confirmed, setConfirmed] = useState(false);
  const mounted = useRef(true), submitting = useRef(false), principal = useRef(session?.user.id);
  // Invalidate async results as soon as this render observes an account change.
  principal.current = session?.user.id;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useFocusEffect(useCallback(() => () => {
    setCurrent(""); setNext(""); setConfirmation("");
  }, []));
  const linking = !!session && intent.linking && session.user.sessionMode !== "identity";
  const complete = !!session && confirmed && passwordChangeConfirmed(session.user.id, session);
  const linkingReady = linking && !session?.user.mustChangePassword && !updated && !busy;
  const signInParams = {
    mode: returnToEmail ? "email" as const : intent.mode,
    context: "current", returnTo,
    ...(!returnToEmail && intent.linking ? { linking: "1" } : {}),
  };
  const allowLeave = useProfileBackGuard(busy || !!session?.user.mustChangePassword || linking,
    () => complete || linkingReady ? void continueToDestination() : void leave());
  async function leave(email = false) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError("");
    setCurrent(""); setNext(""); setConfirmation("");
    if (email) onReturnToEmail();
    try {
      await signOut();
      if (!mounted.current) return;
      allowLeave();
      router.replace({ pathname: "/sign-in", params: email
        ? { mode: "email", context: "current", returnTo } : signInParams });
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Could not sign out. Try again.");
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function continueToDestination() {
    if (busy || !session || !(complete || linkingReady)) return;
    if (linking) { void leave(true); return; }
    allowLeave();
    router.replace(returnTo);
  }
  async function save() {
    if (submitting.current || !session || confirmed || (!updated && !session.user.mustChangePassword)) return;
    const problem = updated ? null : validatePasswordChange(current, next, confirmation);
    if (problem) { setError(problem); return; }
    const userId = session.user.id, a = current, b = next;
    const isCurrent = () => mounted.current && principal.current === userId;
    submitting.current = true;
    setBusy(true); setError("");
    setCurrent(""); setNext(""); setConfirmation("");
    try {
      if (!updated) {
        await changeConsumerPassword(a, b);
        if (!isCurrent()) return;
        setUpdated(true);
      }
      const refreshed = await refreshSession({ forceNetwork: true });
      if (!isCurrent()) return;
      if (!passwordChangeConfirmed(userId, refreshed)) {
        setError("Your password was changed. Reconnect and confirm your session before continuing.");
        return;
      }
      setConfirmed(true);
    } catch (e) {
      if (isCurrent()) setError(e instanceof Error ? e.message : "Could not update your password. Re-enter the fields and try again.");
    } finally {
      submitting.current = false;
      if (isCurrent()) setBusy(false);
    }
  }
  if (isLoading) return <View className="flex-1 bg-background items-center justify-center"><Spinner label="Restoring session" /></View>;
  if (!session) return <Redirect href={{ pathname: "/sign-in", params: signInParams }} />;
  if (!session.user.mustChangePassword && !busy && !updated && !linking) return <Redirect href={returnTo} />;
  if (complete || linkingReady) return (
    <ReportPage title={complete ? "Password updated" : "Continue account linking"}
      onBack={continueToDestination} footer={<Button loading={busy} disabled={busy}
        onPress={continueToDestination} style={{ minHeight: 48 }} accessibilityLabel="Continue">
        <Text size="sm" weight="semibold" className="text-primary-foreground">Continue</Text>
      </Button>}>
      <Text accessibilityRole="header" style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 18, lineHeight: 26 }}>
        {complete ? "Your password is updated" : "Your account password is ready"}
      </Text>
      <View accessibilityLiveRegion="polite" className="gap-1 rounded-xl border border-border bg-card p-3">
        <Text size="sm" weight="semibold">{complete ? "Use your new password next time" : "Return to your email sign-in"}</Text>
        <Text size="sm">{complete ? "Your current account details and linked service accounts remain available."
          : "Sign in with your email to request linking this ALECO account."}</Text>
      </View>
      {linking ? <ProfileNotice title="Continue with your email"
        description="Continue signs out of this account. Sign in with your email, then submit the linking request using this account’s new password." /> : null}
      {error ? <ProfileNotice title="Could not continue" description={error} danger /> : null}
    </ReportPage>
  );
  return (
    <ReportPage title="Secure your account" onBack={() => void leave()} footer={<>
      <Button loading={busy} disabled={busy} onPress={() => void save()} style={{ minHeight: 48 }} accessibilityLabel={updated ? "Confirm session" : "Update password"}>
        <Text size="sm" weight="semibold" className="text-primary-foreground">{updated ? "Confirm session" : "Update password"}</Text>
      </Button>
      <Button variant="outline" disabled={busy} style={{ minHeight: 48 }}
        accessibilityLabel="Get help" onPress={() => router.push({ pathname: "/sign-in-help", params: {
          returnTo, ...(intent.linking ? { linking: "1" } : {}),
        } })}><Text size="sm" weight="semibold">Get help</Text></Button>
    </>}>
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <Text accessibilityRole="header" style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 22, lineHeight: 30 }}>Make this account yours.</Text>
          <Text muted size="sm">Replace your temporary password before continuing.</Text>
        </View>
        <Image source={require("../../../assets/auth-required-password.png")} contentFit="contain"
          style={{ width: 84, height: 84 }} accessibilityElementsHidden />
      </View>
      {updated ? <ProfileNotice title="Confirm your session" description="The password change was accepted. Reconnect to verify your session before continuing." /> : <>
        {/* The existing API verifies the temporary password before changing it. */}
        <AuthPasswordField label="Temporary password" value={current} onChangeText={setCurrent}
          placeholder="Enter temporary password" autoComplete="current-password" editable={!busy} />
        <AuthPasswordField label="New password" value={next} onChangeText={setNext}
          placeholder="Enter new password" autoComplete="new-password" maxLength={128}
          description="Use 8–128 characters." editable={!busy} />
        <AuthPasswordField label="Confirm password" value={confirmation} onChangeText={setConfirmation}
          placeholder="Re-enter new password" autoComplete="new-password" maxLength={128}
          editable={!busy} onSubmitEditing={() => void save()} />
        <View className="gap-1 rounded-xl border border-border bg-card p-4">
          <Text size="sm" weight="semibold">Keep your account secure</Text>
          <Text size="sm" muted>Choose a password that’s hard to guess.</Text>
        </View>
      </>}
      {error ? <ProfileNotice title={updated ? "Confirm your session" : "Check your password"} description={error} danger /> : null}
    </ReportPage>
  );
}
