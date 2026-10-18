import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getAuthToken } from "@/services/api";
import { requestAccountVerification, type PasswordChangeStatus } from "@/services/auth";
import { ProfileField, ProfileHeading, ProfileNotice, useProfileTask, type ProfileIdentity } from "./profile-ui";

export type AccountVerificationProof = {
  flowId: string;
  authToken: string;
  isCurrent: () => boolean;
  isScopeCurrent: () => boolean;
  cancel: () => Promise<unknown>;
};

export function useAccountPasswordVerification(
  identity: ProfileIdentity,
  purpose: "account-link" | "account-unlink",
  enabled: boolean,
  onReset: () => void,
) {
  const current = useProfileTask(identity);
  const [proof, setProof] = useState<AccountVerificationProof | null>(null);
  const [password, setPassword] = useState(""), [busy, setBusy] = useState(!identity.fixture && enabled);
  const [error, setError] = useState(""), [cooldown, setCooldown] = useState(0), [expires, setExpires] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const token = useRef<string | null>(null), activeProof = useRef<AccountVerificationProof | null>(null);
  const generation = useRef(0), focused = useRef(false), sending = useRef(false);
  const apply = useCallback((result: PasswordChangeStatus) => {
    const localNow = Date.now(), serverNow = Date.parse(result.serverNow);
    const deadline = (value?: string | null) => value ? localNow + Math.max(0, Date.parse(value) - serverNow) : 0;
    setCooldown(deadline(result.cooldownUntil)); setExpires(deadline(result.verificationExpiresAt)); setNow(localNow);
  }, []);
  const reset = useCallback((message = "") => {
    const previous = activeProof.current;
    activeProof.current = null;
    setProof(null); setPassword(""); setExpires(0); setError(message); onReset();
    if (previous) void previous.cancel().catch(() => {});
  }, [onReset]);
  useFocusEffect(useCallback(() => {
    focused.current = true; generation.current++;
    let active = true;
    if (enabled && !identity.fixture) {
      setBusy(true);
      void getAuthToken().then(async value => {
        if (!active || !current() || !value) return;
        token.current = value;
        const status = await requestAccountVerification(purpose, { action: "status" }, value);
        if (active && current()) apply(status);
      }).catch(e => { if (active && current()) setError(e instanceof Error ? e.message : "Could not check account access."); })
        .finally(() => { if (active && current()) setBusy(false); });
    } else setBusy(false);
    return () => {
      active = false; focused.current = false; generation.current++; token.current = null;
      reset(); setCooldown(0);
    };
    // The gate is keyed by identity; refreshed context must not cancel a valid flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, identity.fixture, purpose, apply, reset]));
  useEffect(() => {
    if (!cooldown && !expires) return;
    const timer = setInterval(() => {
      const time = Date.now(); setNow(time);
      if (cooldown && time >= cooldown) setCooldown(0);
      if (expires && time >= expires) reset("Verification expired. Confirm your password again to continue. Your account details are kept.");
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown, expires, reset]);
  const remaining = Math.max(0, Math.ceil((cooldown - now) / 1000));
  async function verify() {
    if (!enabled || busy || sending.current || remaining || !password || !current()) return;
    const scope = generation.current;
    const active = () => current() && focused.current && generation.current === scope;
    sending.current = true; setBusy(true); setError("");
    const secret = password; setPassword("");
    try {
      const authToken = token.current ?? await getAuthToken();
      if (!identity.fixture && !authToken) throw new Error("Sign in again to continue.");
      if (!active()) return;
      token.current = authToken;
      const result = identity.fixture ? { state: "verified" as const, flowId: "fixture-" + purpose,
        serverNow: new Date().toISOString(), verificationExpiresAt: new Date(Date.now() + 300_000).toISOString() }
        : await requestAccountVerification(purpose, { action: "verify", currentPassword: secret }, authToken!);
      if (result.state !== "verified" || !result.flowId) throw new Error("Confirm your current password to continue.");
      const flowId = result.flowId;
      const cancel = () => identity.fixture ? Promise.resolve() : requestAccountVerification(purpose, { action: "cancel", flowId }, authToken!);
      if (!active()) { await cancel().catch(() => {}); return; }
      apply(result);
      const verified = { flowId, authToken: authToken ?? "fixture", cancel,
        isScopeCurrent: active,
        isCurrent: () => active() && activeProof.current?.flowId === flowId };
      activeProof.current = verified; setProof(verified);
    } catch (e) {
      if (active()) {
        setError(e instanceof Error ? e.message : "Could not verify your password. Try again.");
        if (token.current) try {
          const result = await requestAccountVerification(purpose, { action: "status" }, token.current);
          if (active()) apply(result);
        } catch {}
      }
    } finally { sending.current = false; if (active()) setBusy(false); }
  }
  return { proof, password, setPassword, busy, error, remaining, verify, reset };
}

export function AccountPasswordVerificationFields({ verification }: {
  verification: ReturnType<typeof useAccountPasswordVerification>;
}) {
  const { password, setPassword, busy, remaining, error } = verification;
  return <>
    <ProfileHeading title="Verify it’s you" description="Confirm your identity before changing linked accounts." />
    <ProfileField label="Current password" secret value={password} onChangeText={setPassword}
      autoComplete="current-password" maxLength={128} editable={!busy && !remaining}
      placeholder="Enter your password" description="Use your ALEConnect sign-in password, not the ALECO account password." />
    {remaining ? <ProfileNotice title={"Try again in " + Math.floor(remaining / 60) + ":" + String(remaining % 60).padStart(2, "0")}
      description="Too many incorrect attempts. Try again when the timer ends. You can still sign in." /> : null}
    {error ? <ProfileNotice title="Unable to verify" description={error} danger /> : null}
  </>;
}
