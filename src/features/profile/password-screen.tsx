import { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { ReportPage } from "@/features/reports/components/report-page";
import { changeConsumerPassword } from "@/services/auth";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  ProfileGate,
  ProfileHeading,
  ProfileNotice,
  ProfileField,
  useProfileTask,
  useProfileBackGuard,
  type ProfileIdentity,
} from "./profile-ui";
import { validatePasswordChange } from "./profile-state";
export default function PasswordScreen() {
  return <ProfileGate>{(identity) => <Password identity={identity} />}</ProfileGate>;
}
function Password({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(),
    currentTask = useProfileTask(identity),
    { refreshSession } = useAuthSession();
  const [old, setOld] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [discard, setDiscard] = useState(false);
  useFocusEffect(
    useCallback(
      () => () => {
        setOld("");
        setNext("");
        setConfirm("");
      },
      [],
    ),
  );
  const back = () => {
    if (busy) return;
    if (old || next || confirm) {
      setDiscard(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  };
  const allowLeave = useProfileBackGuard(busy || !!(old || next || confirm), back);
  async function save() {
    if (busy) return;
    const problem = validatePasswordChange(old, next, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    const a = old,
      b = next;
    setOld("");
    setNext("");
    setConfirm("");
    try {
      if (!identity.fixture) {
        await changeConsumerPassword(a, b);
        if (!currentTask()) return;
        await refreshSession({ forceNetwork: true });
      }
      if (currentTask()) setSaved(true);
    } catch (e) {
      if (currentTask())
        setError(
          e instanceof Error
            ? e.message
            : "Password could not be changed. Re-enter the fields and retry.",
        );
    } finally {
      if (currentTask()) setBusy(false);
    }
  }
  return (
    <>
      <ReportPage
        title={saved ? "Password updated" : "Change password"}
        onBack={back}
        footer={
          <Button loading={busy} onPress={() => (saved ? router.replace("/profile") : void save())}>
            {saved ? "Back to Account" : "Update password"}
          </Button>
        }
      >
        {saved ? (
          <ProfileNotice
            title="Your password is updated"
            description={
              identity.fixture
                ? "Visual fixture only. No live password changed."
                : "Use your new password next time you sign in. Other sessions have been signed out."
            }
          />
        ) : (
          <>
            <ProfileHeading title="Keep your account secure" />
            <ProfileField
              label="Current password"
              secret
              editable={!busy}
              value={old}
              onChangeText={setOld}
              autoComplete="current-password"
              maxLength={128}
              description={
                identity.account.sessionMode === "identity"
                  ? "Enter your email sign-in password."
                  : "Enter the password you use for this ALECO account."
              }
            />
            <ProfileField
              label="New password"
              secret
              editable={!busy}
              value={next}
              onChangeText={setNext}
              autoComplete="new-password"
              maxLength={128}
              description="Use 8–128 characters and a different password."
            />
            <ProfileField
              label="Confirm new password"
              secret
              editable={!busy}
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              maxLength={128}
              description="Re-enter your new password."
            />
          </>
        )}
        {error ? <ProfileNotice title="Check your password" description={error} danger /> : null}
      </ReportPage>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Discard password changes?</Dialog.Title>
          <Dialog.Description>Your password has not been changed.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                allowLeave();
                setOld("");
                setNext("");
                setConfirm("");
                setDiscard(false);
                router.replace("/profile");
              }}
            >
              Discard
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
