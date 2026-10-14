import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAuthSession } from "@/hooks/use-auth-session";
import { setupConsumerIdentity, clearEmailSetupDismissal } from "@/services/consumer-identity";
import { createApiRequestId } from "@/services/api";
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
export default function EmailSetupScreen() {
  return <ProfileGate>{(identity) => <EmailSetup identity={identity} />}</ProfileGate>;
}
function EmailSetup({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(),
    current = useProfileTask(identity),
    { refreshSession } = useAuthSession();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [review, setReview] = useState(false),
    [complete, setComplete] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false);
  const attempt = useRef(createApiRequestId());
  useEffect(() => {
    attempt.current = createApiRequestId();
  }, [email]);
  useFocusEffect(
    useCallback(
      () => () => {
        setPassword("");
        setReview(false);
      },
      [],
    ),
  );
  const done = complete || (!identity.fixture && identity.account.sessionMode === "identity");
  const supported =
    identity.fixture ||
    (identity.account.capabilities.emailSetup &&
      identity.account.capabilities.mockEmailVerification);
  function back() {
    if (busy) return;
    if (review) {
      setReview(false);
      setPassword("");
      return;
    }
    if (!done && (email || password)) {
      setDiscard(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile/accounts");
  }
  const allowLeave = useProfileBackGuard(busy || (!done && !!(review || email || password)), back);
  function next() {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.length > 255 ||
      password.length < 8 ||
      password.length > 128
    ) {
      setError("Enter a valid email and an 8–128 character password.");
      return;
    }
    setError("");
    setReview(true);
  }
  async function save() {
    if (busy || !supported || !password) return;
    setBusy(true);
    setError("");
    const secret = password;
    setPassword("");
    try {
      if (!identity.fixture) {
        await setupConsumerIdentity(
          {
            email,
            password: secret,
            verification: "mock",
            idempotencyKey: attempt.current,
          },
          current,
        );
        if (!current()) return;
        await clearEmailSetupDismissal(identity.account.defaultServiceAccountId);
        await refreshSession({ forceNetwork: true });
      }
      if (current()) setComplete(true);
    } catch (e) {
      if (current()) {
        setError(
          e instanceof Error
            ? e.message
            : "Email setup could not complete. Re-enter the password and retry.",
        );
        setReview(false);
      }
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <>
      <ReportPage
        title={done ? "Email sign-in ready" : "Set up email sign-in"}
        onBack={back}
        footer={
          <Button
            disabled={!done && (!supported || !password)}
            loading={busy}
            onPress={() =>
              done ? router.replace("/profile/accounts") : review ? void save() : next()
            }
          >
            {done ? "Back to accounts" : review ? "Confirm email setup" : "Review email setup"}
          </Button>
        }
      >
        {done ? (
          <ProfileNotice
            title="Use your email to sign in"
            description={
              identity.fixture
                ? "Visual fixture only. No email or account was changed."
                : "Email sign-in is enabled. Your ALECO service-account details and reports stay connected."
            }
          />
        ) : (
          <>
            <ProfileHeading
              title={review ? "Review email setup" : "One email, your linked accounts"}
              description="Your email becomes your login and contact email. Service-account details stay separate."
            />
            {!supported ? (
              <ProfileNotice
                title="Email verification unavailable"
                description="Verified email setup is not enabled by this server. Keep using account-number sign-in or contact ALECO for help."
              />
            ) : !identity.fixture ? (
              <ProfileNotice
                title="Test verification environment"
                description="This server permits test email verification. A real verified-email service is required before public release."
              />
            ) : null}
            {review ? (
              <View className="gap-3 rounded-xl bg-card p-4">
                <DetailRow label="Email sign-in" value={email.trim().toLowerCase()} />
                <DetailRow label="New password" value="Entered securely" />
                <DetailRow
                  label="ALECO account"
                  value={
                    "••" +
                    identity.account.accounts
                      .find((a) => a.id === identity.account.defaultServiceAccountId)
                      ?.accountNumber?.slice(-4)
                  }
                />
              </View>
            ) : (
              <>
                <ProfileField
                  label="Email address"
                  Icon={Mail}
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                  maxLength={255}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="name@example.com"
                />
                <ProfileField
                  label="New email sign-in password"
                  secret
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                  maxLength={128}
                  autoComplete="new-password"
                  description="Use 8–128 characters. Your service-account password is kept separate."
                />
              </>
            )}
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() => router.push("/profile/help" as Href)}
            >
              Contact ALECO
            </Button>
          </>
        )}
        {error ? <ProfileNotice title="Email setup incomplete" description={error} danger /> : null}
      </ReportPage>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Discard email setup?</Dialog.Title>
          <Dialog.Description>Your sign-in details have not changed.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                allowLeave();
                setPassword("");
                router.replace("/profile/accounts");
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
