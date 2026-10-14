import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Check, Circle, ShieldCheck } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Dialog } from "@/components/panelui/dialog";
import { toast } from "@/components/panelui/toast";
import { ReportPage } from "@/features/reports/components/report-page";
import { requestPasswordChange, type PasswordChangeStatus } from "@/services/auth";
import { ApiRequestError, getAuthToken } from "@/services/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  ProfileGate, ProfileHeading, ProfileNotice, ProfileField, useProfileTask,
  useProfileBackGuard, type ProfileIdentity,
} from "./profile-ui";

export default function PasswordScreen() {
  return <ProfileGate>{identity => <Password identity={identity} />}</ProfileGate>;
}
function Password({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(), currentTask = useProfileTask(identity);
  const { refreshSession } = useAuthSession();
  const [primary, muted] = useAppColors(["primary", "muted-foreground"]);
  const [verifiedStep, setStep] = useState<"verify" | "verified" | "complete">("verify");
  const [old, setOld] = useState(""), [next, setNext] = useState(""), [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(!identity.fixture), [error, setError] = useState("");
  const [discard, setDiscard] = useState(false), [cooldown, setCooldown] = useState(0);
  const [expires, setExpires] = useState(0), [now, setNow] = useState(Date.now());
  const submitting = useRef(false), token = useRef<string | null>(null);
  const flowId = useRef<string | null>(null);
  const clear = () => { setOld(""); setNext(""); setConfirm(""); };
  const applyStatus = useCallback((status: PasswordChangeStatus) => {
    const localNow = Date.now(), serverNow = Date.parse(status.serverNow);
    const deadline = (value?: string | null) => value ? localNow + Math.max(0, Date.parse(value) - serverNow) : 0;
    setStep(status.state); setCooldown(deadline(status.cooldownUntil));
    flowId.current = status.flowId ?? null;
    setExpires(deadline(status.verificationExpiresAt)); setNow(localNow);
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!identity.fixture) {
      setBusy(true);
      void getAuthToken().then(async value => {
        if (!active || !value) return;
        token.current = value;
        const status = await requestPasswordChange({ action: "status" }, value);
        if (active) applyStatus(status);
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not verify account access."); })
        .finally(() => { if (active) setBusy(false); });
    }
    return () => {
      active = false;
      setOld(""); setNext(""); setConfirm("");
      const value = token.current;
      token.current = null;
      const canceledFlow = flowId.current;
      flowId.current = null;
      if (value && canceledFlow && !submitting.current) void requestPasswordChange({ action: "cancel", flowId: canceledFlow }, value).catch(() => {});
    };
  }, [identity.fixture, applyStatus]));
  useEffect(() => {
    if (!cooldown && !expires) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldown, expires]);
  const expired = verifiedStep === "verified" && expires > 0 && now >= expires;
  const step = expired ? "verify" : verifiedStep;
  const remaining = Math.max(0, Math.ceil((cooldown - now) / 1000));
  const cooldownLabel = Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0");
  const lengthValid = next.length >= 8 && next.length <= 128;
  const matches = !!next && next === confirm;
  function back() {
    if (submitting.current || busy) return;
    if (step !== "complete" && (old || next || confirm || step === "verified")) { setDiscard(true); return; }
    void leave();
  }
  const allowLeave = useProfileBackGuard(busy || step === "verified" || !!(old || next || confirm), back);
  async function leave() {
    if (submitting.current) return;
    clear(); submitting.current = true; setBusy(true);
    try {
      if (token.current && flowId.current) await requestPasswordChange({ action: "cancel", flowId: flowId.current }, token.current);
      if (!currentTask()) return;
      flowId.current = null; allowLeave(); router.replace("/profile/security");
    } catch {
      if (currentTask()) setError("Could not confirm cancellation. Reconnect and retry. Your password has not changed.");
    } finally {
      submitting.current = false;
      if (currentTask()) setBusy(false);
    }
  }
  async function save() {
    if (submitting.current || busy || (step === "verify" && remaining) || (!identity.fixture && !token.current)) return;
    if (step === "verify" && !old) { setError("Enter your current password."); return; }
    if (step === "verified" && (!lengthValid || !matches)) { setError("Use 8–128 characters and match both new-password fields."); return; }
    submitting.current = true; setBusy(true); setError("");
    try {
      const result = identity.fixture ? {
        state: step === "verify" ? "verified" as const : "complete" as const,
        serverNow: new Date().toISOString(), verificationExpiresAt: new Date(Date.now() + 300_000).toISOString(),
      } : await requestPasswordChange(step === "verify"
        ? { action: "verify", currentPassword: old }
        : { action: "change", flowId: flowId.current, newPassword: next, confirmPassword: confirm }, token.current!);
      if (!currentTask()) return;
      setOld(""); applyStatus(result);
      if (result.state === "complete") {
        clear();
        toast.show({ variant: "success", label: "Password updated", description: identity.fixture
          ? "Visual fixture only. No password or session was changed."
          : "Your other sessions have been signed out.", placement: "top" });
        if (!identity.fixture) await refreshSession({ forceNetwork: true }).catch(() => {});
      }
    } catch (e) {
      if (!currentTask()) return;
      if (e instanceof ApiRequestError && e.code === "PASSWORD_VERIFICATION_EXPIRED") {
        setStep("verify"); setExpires(0); setOld("");
      }
      setError(e instanceof Error ? e.message : "Could not update your password. Reconnect and try again.");
      // A lost completion response or cooldown can be recovered without resubmitting a password.
      if (token.current) {
        try {
          const status = await requestPasswordChange({ action: "status" }, token.current);
          if (currentTask()) {
            applyStatus(status);
            if (status.state === "complete") { clear(); setError(""); }
          }
        } catch {}
      }
    } finally {
      submitting.current = false;
      if (currentTask()) setBusy(false);
    }
  }
  return <>
    <ReportPage title={step === "complete" ? "Password updated" : "Change password"} onBack={back}
      footer={<Button loading={busy}
        disabled={busy || (step === "verify" && !!remaining) || (step === "verify" ? !old : step === "verified" ? !lengthValid || !matches : false)}
        onPress={() => step === "complete" ? void leave() : void save()}>
        {step === "complete" ? "Back to Security settings" : step === "verify" ? "Verify current password" : "Update password"}
      </Button>}>
      {step === "complete" ? <View className="gap-3">
        <ShieldCheck size={32} color={primary} />
        <ProfileHeading title="Your password is updated" description={identity.fixture
          ? "Visual fixture only. No live password changed."
          : "Use your new password next time you sign in. Your other sessions have been signed out."} />
      </View> : <>
        <Text size="xs" muted>{step === "verify" ? "Step 1 of 2" : "Step 2 of 2"}</Text>
        <ProfileHeading title={step === "verify" ? "Verify it’s you" : "Set a new password"} description={step === "verify"
          ? "Verify your current sign-in password before choosing a new one."
          : "Verification lasts 5 minutes and applies only to this session."} />
        {step === "verify" ? <ProfileField label="Current password" secret editable={!busy && !remaining}
          value={old} onChangeText={setOld} autoComplete="current-password" maxLength={128}
          description={identity.account.sessionMode === "identity" ? "Enter your email sign-in password." : "Enter the password for this ALECO account."} />
        : <>
          <ProfileField label="New password" secret editable={!busy} value={next} onChangeText={setNext}
            autoComplete="new-password" maxLength={128} placeholder="Enter a new password" />
          <ProfileField label="Confirm new password" secret editable={!busy} value={confirm} onChangeText={setConfirm}
            autoComplete="new-password" maxLength={128} placeholder="Re-enter your new password" />
          <View className="gap-2" accessibilityLiveRegion="polite">
            {[{ valid: lengthValid, label: "8–128 characters" }, { valid: matches, label: "Both passwords match" }].map(rule => {
              const Icon = rule.valid ? Check : Circle;
              return <View key={rule.label} className="flex-row items-center gap-2"><Icon size={14} color={rule.valid ? primary : muted} />
                <Text size="xs" muted={!rule.valid}>{rule.label}</Text></View>;
            })}
            <Text size="xs" muted>A different password is checked securely when you save.</Text>
          </View>
        </>}
        {remaining && step === "verify" ? <ProfileNotice title={"Try again in " + cooldownLabel}
          description="Verification pauses for 10 minutes after five incorrect attempts. Ordinary sign-in remains available." /> : null}
      </>}
      {error || expired ? <ProfileNotice title="Password change needs attention" description={error || "Verification expired. Verify again to continue with your new-password draft."} danger /> : null}
    </ReportPage>
    <Dialog open={discard} onOpenChange={setDiscard}><Dialog.Content>
      <Dialog.Title>Discard password changes?</Dialog.Title>
      <Dialog.Description>Your password has not been changed. Verification will be canceled.</Dialog.Description>
      <Dialog.Footer>
        <Button variant="outline" onPress={() => setDiscard(false)}>Keep editing</Button>
        <Button variant="destructive" loading={busy} disabled={busy} onPress={() => { setDiscard(false); void leave(); }}>Discard</Button>
      </Dialog.Footer>
    </Dialog.Content></Dialog>
  </>;
}
