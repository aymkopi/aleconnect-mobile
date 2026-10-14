import { useCallback, useRef, useState, useEffect } from "react";
import { View } from "react-native";
import { type Href, useRouter, useFocusEffect } from "expo-router";
import { IdCard, UserRound } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { ReportPage } from "@/features/reports/components/report-page";
import { submitAccountLinkRequest } from "@/services/account-link-requests";
import { createApiRequestId } from "@/services/api";
import { presentAccountLinkError } from "@/features/accounts/contract";
import { consumerAccountLinkRequestStatusLabel } from "@/features/accounts/status";
import { useAuthSession } from "@/hooks/use-auth-session";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import {
  ProfileGate,
  ProfileHeading,
  ProfileNotice,
  ProfileField,
  DetailRow,
  useProfileTask,
  useProfileBackGuard,
  type ProfileIdentity,
} from "./profile-ui";
export default function LinkAccountScreen() {
  return <ProfileGate>{(identity) => <LinkAccount identity={identity} />}</ProfileGate>;
}
function LinkAccount({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(),
    current = useProfileTask(identity),
    { signOut } = useAuthSession();
  const [number, setNumber] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [view, setView] = useState<"form" | "review" | "sent" | "reset">("form"),
    [status, setStatus] = useState("Under review"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false),
    [help, setHelp] = useState(false);
  const key = useRef(createApiRequestId()),
    sending = useRef(false);
  useEffect(() => {
    key.current = createApiRequestId();
  }, [number, name]);
  const ready =
    identity.account.sessionMode === "identity" && identity.account.capabilities.accountLinking;
  function back() {
    if (busy) return;
    setPassword("");
    if (view === "review") {
      setView("form");
      return;
    }
    if (view === "form" && (number || name || password)) {
      setDiscard(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile/accounts");
  }
  const allowLeave = useProfileBackGuard(
    busy || view === "review" || (view === "form" && !!(number || name || password)),
    back,
  );
  useFocusEffect(
    useCallback(
      () => () => {
        setPassword("");
        setView((v) => (v === "review" ? "form" : v));
      },
      [],
    ),
  );
  function review() {
    setError("");
    if (!number.trim() || !name.trim() || password.length < 8 || password.length > 128) {
      setError(
        "Enter the account number, exact registered name and an 8–128 character account password.",
      );
      return;
    }
    if (identity.account.accounts.some((a) => a.accountNumber === number.trim())) {
      setError("This ALECO account is already linked to your profile.");
      return;
    }
    setView("review");
  }
  async function submit() {
    if (sending.current || !password) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const secret = password;
    setPassword("");
    try {
      const result = identity.fixture
        ? { status: "pending" }
        : await submitAccountLinkRequest({
            accountNumber: number,
            registeredName: name,
            password: secret,
            idempotencyKey: key.current,
          });
      if (current()) {
        setStatus(consumerAccountLinkRequestStatusLabel(result.status));
        setView("sent");
      }
    } catch (e) {
      if (current()) {
        const p = presentAccountLinkError(e);
        setError(p.message);
        setView(p.kind === "password-reset-required" ? "reset" : "form");
      }
    } finally {
      sending.current = false;
      if (current()) setBusy(false);
    }
  }
  async function resetSignIn() {
    if (PANELUI_PREVIEW) {
      setError(
        "Live sign-in is disabled in this preview. Contact ALECO for account password help.",
      );
      return;
    }
    setBusy(true);
    try {
      allowLeave();
      await signOut();
      router.replace({ pathname: "/sign-in", params: { mode: "account", linking: "1" } });
    } catch (e) {
      allowLeave(false);
      if (current()) setError(e instanceof Error ? e.message : "Could not sign out.");
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <>
      <ReportPage
        title="Link an account"
        onBack={back}
        footer={
          !ready ? (
            <Button onPress={() => router.push("/email-setup")}>Get help with email setup</Button>
          ) : view === "sent" ? (
            <Button onPress={() => router.replace("/profile/link-requests" as Href)}>
              View link requests
            </Button>
          ) : view === "reset" ? (
            <Button loading={busy} onPress={() => void resetSignIn()}>
              Continue with account sign-in
            </Button>
          ) : (
            <Button
              loading={busy}
              disabled={!number.trim() || !name.trim() || !password}
              onPress={() => (view === "review" ? void submit() : review())}
            >
              {view === "review" ? "Send request" : "Review request"}
            </Button>
          )
        }
      >
        {!ready ? (
          <>
            <ProfileHeading
              title="Complete email setup first"
              description="Linking multiple ALECO accounts requires email sign-in."
            />
            <ProfileNotice
              title="One email, your linked accounts"
              description="Your email becomes your login and contact email. Service-account details stay separate."
            />
          </>
        ) : view === "sent" ? (
          <>
            <ProfileHeading
              title="Request received"
              description="Keep using your current account while ALECO reviews your request."
            />
            <View className="gap-3 rounded-xl bg-card p-4">
              <DetailRow label="Requested account" value={"ALECO ••" + number.slice(-4)} />
              <DetailRow label="Registered name" value={name} />
              <DetailRow label="Status" value={status} />
            </View>
            <ProfileNotice
              title="Reviewed by ALECO"
              description={
                identity.fixture
                  ? "Visual fixture only. No request was sent."
                  : "Approval is required before this account is added to your profile."
              }
            />
          </>
        ) : view === "reset" ? (
          <>
            <ProfileHeading title="Secure this service account first" />
            <ProfileNotice
              title="Password change required"
              description="Sign out, use the temporary password with account-number sign-in and set a new password. Then return to email sign-in and submit the linking request."
            />
          </>
        ) : view === "review" ? (
          <>
            <ProfileHeading
              title="Review your request"
              description="Make sure these match the details on your ALECO bill."
            />
            <View className="gap-4 rounded-xl bg-card p-4">
              <DetailRow label="ALECO account number" value={number} />
              <DetailRow label="Registered name" value={name} />
              <DetailRow label="Account password" value="Entered securely" />
              <Button variant="outline" disabled={busy} onPress={() => setView("form")}>
                Edit details
              </Button>
            </View>
            <ProfileNotice
              title="Reviewed by ALECO"
              description="Your password is used only to verify this service account. It is cleared after the attempt and is never saved on this device."
            />
          </>
        ) : (
          <>
            <ProfileHeading
              title="Add another ALECO account"
              description="Use the details on your bill and the current password for that service account."
            />
            <ProfileField
              label="Account number"
              Icon={IdCard}
              keyboardType="number-pad"
              value={number}
              maxLength={64}
              onChangeText={setNumber}
              placeholder="Enter account number"
            />
            <ProfileField
              label="Registered name"
              Icon={UserRound}
              value={name}
              maxLength={255}
              onChangeText={setName}
              placeholder="Enter registered name"
            />
            <ProfileField
              label="ALECO account password"
              secret
              value={password}
              maxLength={128}
              onChangeText={setPassword}
              placeholder="Enter account password"
              description="Use the service account password, not your email sign-in password."
            />
            <ProfileNotice
              title="Reviewed by ALECO"
              description="Staff checks the request before the account is added."
            />
            <Button variant="ghost" onPress={() => setHelp(true)}>
              Account password help
            </Button>
          </>
        )}
        {error ? (
          <ProfileNotice title="Check the account details" description={error} danger />
        ) : null}
      </ReportPage>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Discard account details?</Dialog.Title>
          <Dialog.Description>No account-link request has been sent.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                allowLeave();
                setNumber("");
                setName("");
                setPassword("");
                setDiscard(false);
                router.replace("/profile/accounts");
              }}
            >
              Discard
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <Dialog.Content>
          <Dialog.Title>Account password help</Dialog.Title>
          <Dialog.Description>
            Use the password for the service account you want to link. If staff supplied a temporary
            password, sign in with that account and complete the required password change first.
          </Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setHelp(false)}>
              Close
            </Button>
            <Button
              onPress={() => {
                setHelp(false);
                router.push("/profile/help" as Href);
              }}
            >
              Contact ALECO
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
