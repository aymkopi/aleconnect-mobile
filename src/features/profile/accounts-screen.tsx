import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { Link as LinkIcon } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { Select } from "@/components/panelui/select";
import { Field } from "@/components/panelui/field";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useAuthSession } from "@/hooks/use-auth-session";
import { clearConsumerProfileCaches } from "@/hooks/use-consumer-profile";
import { setDefaultLinkedAccount, unlinkLinkedAccount } from "@/services/linked-accounts";
import { presentAccountUnlinkError, type LinkedAccount } from "@/features/accounts/contract";
import { useAppColors } from "@/hooks/use-app-colors";
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
import { ServiceAccountCard } from "./service-account-card";
import { AccountPasswordVerificationFields, useAccountPasswordVerification } from "./account-password-verification";
import { ApiRequestError, getAuthToken, getAuthTokenRevision } from "@/services/api";
export default function AccountsScreen() {
  return <ProfileGate>{(identity) => <Accounts identity={identity} />}</ProfileGate>;
}
function Accounts({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter(),
    current = useProfileTask(identity),
    { refreshConsumerAccount, clearConsumerAccount } = useConsumerAccount(),
    { signOut } = useAuthSession(),
    [primaryForeground] = useAppColors(["primary-foreground"]);
  const [accounts, setAccounts] = useState(identity.account.accounts),
    [unlink, setUnlink] = useState<LinkedAccount | null>(null),
    [defaultId, setDefaultId] = useState(""),
    [password, setPassword] = useState(""),
    [replacement, setReplacement] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  const emailReady = identity.account.sessionMode === "identity";
  const sending = useRef(false);
  const resetDraft = useCallback(() => { setPassword(""); setError(""); }, []);
  const verification = useAccountPasswordVerification(identity, "account-unlink", !!unlink && emailReady, resetDraft);
  const verifying = !!unlink && !verification.proof;
  function back() {
    if (busy) return;
    if (unlink) {
      verification.reset();
      setUnlink(null);
      setPassword("");
      setError("");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  }
  const allowLeave = useProfileBackGuard(busy || !!unlink, back);
  async function changeDefault() {
    if (busy || !defaultId) return;
    setBusy(true);
    setError("");
    try {
      if (identity.fixture)
        setAccounts((a) => a.map((v) => ({ ...v, isDefault: v.id === defaultId })));
      else {
        await setDefaultLinkedAccount(defaultId, identity.account.accessRevision);
        if (!current()) return;
        await Promise.all([clearConsumerProfileCaches(), refreshConsumerAccount({ invalidate: true })]);
      }
      if (current()) {
        setDefaultId("");
        setDone("Default account updated. Existing reports keep their original account.");
      }
    } catch (e) {
      if (current())
        setError(e instanceof Error ? e.message : "Could not change the default account.");
    } finally {
      if (current()) setBusy(false);
    }
  }
  async function confirmUnlink() {
    const proof = verification.proof;
    if (sending.current || busy || !unlink || !password || !proof?.isCurrent()) return;
    const active = () => current() && proof.isCurrent();
    if (unlink.isDefault && !replacement) {
      setError("Choose a new default account first.");
      return;
    }
    const secret = password;
    sending.current = true;
    setPassword("");
    setBusy(true);
    setError("");
    try {
      if (identity.fixture) {
        setAccounts((a) =>
          a
            .filter((v) => v.id !== unlink.id)
            .map((v) => ({
              ...v,
              isDefault: unlink.isDefault ? v.id === replacement : v.isDefault,
            })),
        );
        setUnlink(null);
        verification.reset();
        setDone("Visual fixture: account unlinked. No live access changed.");
      } else {
        const result = await unlinkLinkedAccount({
          serviceAccountId: unlink.id,
          currentAccountPassword: secret,
          accessRevision: identity.account.accessRevision,
          replacementDefaultServiceAccountId: unlink.isDefault ? replacement : undefined,
          verificationFlowId: proof.flowId,
        }, proof.authToken);
        if (!current()) return;
        if (result.reauthenticationRequired) {
          const revision = getAuthTokenRevision(), authToken = await getAuthToken();
          if (!current() || getAuthTokenRevision() !== revision || authToken !== proof.authToken) return;
          allowLeave();
          clearConsumerAccount();
          await clearConsumerProfileCaches();
          await signOut();
          const signedOutRevision = getAuthTokenRevision(), remainingToken = await getAuthToken();
          if (!remainingToken && getAuthTokenRevision() === signedOutRevision) router.replace("/sign-in");
          return;
        }
        setUnlink(null);
        verification.reset();
        await Promise.all([clearConsumerProfileCaches(), refreshConsumerAccount({ invalidate: true })]);

      }
    } catch (e) {
      if (active()) {
        allowLeave(false);
        const message = presentAccountUnlinkError(e).message;
        if (e instanceof ApiRequestError && e.code === "CURRENT_PASSWORD_VERIFICATION_REQUIRED") verification.reset(message);
        else setError(message);
      }
    } finally {
      sending.current = false;
      if (current()) setBusy(false);
    }
  }
  const footer = unlink ? verifying ? (
    <Button loading={verification.busy || busy} disabled={busy || verification.busy || !verification.password || !!verification.remaining} onPress={() => void verification.verify()}>
      Verify and continue
    </Button>
  ) : (
    <View className="flex-row gap-2">
      <Button className="flex-1" variant="outline" disabled={busy} onPress={back}>
        Keep linked
      </Button>
      <Button
        className="flex-1"
        variant="destructive"
        loading={busy}
        disabled={busy || !password || (unlink.isDefault && !replacement)}
        onPress={() => void confirmUnlink()}
      >
        Unlink account
      </Button>
    </View>
  ) : undefined;
  return (
    <>
      <ReportPage
        title={
          unlink
            ? unlink.isDefault
              ? "Unlink default account"
              : "Unlink account"
            : "ALECO accounts"
        }
        onBack={back}
        footer={footer}
      >
        {unlink && verifying ? (
          <AccountPasswordVerificationFields verification={verification} />
        ) : unlink ? (
          <>
            <ProfileHeading
              title={unlink.isDefault ? "Choose a new default first" : "Unlink this account?"}
              description="Remove this service account from your ALEConnect profile."
            />
            <DetailRow
              label="Account to unlink"
              value={unlink.registeredName}
            />
            <DetailRow label="ALECO account number" value={"••" + (unlink.accountNumber?.slice(-4) || "—")} />
            {unlink.isDefault ? (
              <Field className="gap-1">
                <Field.Label>New default account</Field.Label>
                <Select
                  value={replacement}
                  title="New default account"
                  triggerClassName="bg-card min-h-12"
                  onValueChange={setReplacement}
                >
                  {accounts
                    .filter((a) => a.id !== unlink.id)
                    .map((a) => (
                      <Select.Item
                        key={a.id}
                        value={a.id}
                        label={a.registeredName}
                        description={"ALECO ••" + (a.accountNumber?.slice(-4) || "—")}
                      />
                    ))}
                </Select>
              </Field>
            ) : null}
            <ProfileField
              label="ALECO account password"
              secret
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              maxLength={128}
              description="Confirm with the password for the account being removed."
            />
            <ProfileNotice
              title="Before you continue"
              description="Your reports stay on record. You may need to sign in again after unlinking."
            />
          </>
        ) : (
          <>
            <ProfileHeading
              title="Your service accounts"
              description="Keep each ALECO account connected to one profile."
            />
            {accounts.map((a) => (
              <View key={a.id} className="gap-3">
                <ServiceAccountCard account={a} />
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onPress={() =>
                      router.push({
                        pathname: "/profile/details",
                        params: { serviceAccountId: a.id },
                      })
                    }
                  >
                    Edit details
                  </Button>
                  {!a.isDefault ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !emailReady}
                      onPress={() => {
                        setDefaultId(a.id);
                        setError("");
                      }}
                    >
                      Set default
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!emailReady || accounts.length < 2 || busy}
                    onPress={() => {
                      verification.reset();
                      setUnlink(a);
                      setPassword("");
                      setReplacement("");
                      setError("");
                    }}
                  >
                    Unlink
                  </Button>
                </View>
                {accounts.length < 2 ? (
                  <Text size="xs" muted>
                    At least one ALECO account must stay linked.
                  </Text>
                ) : null}
              </View>
            ))}
            <Button
              startContent={<LinkIcon size={18} color={primaryForeground} />}
              onPress={() => router.push("/profile/link-account")}
            >
              Link another account
            </Button>
            <Button variant="outline" onPress={() => router.push("/profile/link-requests" as Href)}>
              Link requests
            </Button>
            <Text size="xs" muted>
              Your default account is used for new reports. Existing reports keep their original
              account.
            </Text>
            {!emailReady ? (
              <ProfileNotice
                title="Use email sign-in to manage links"
                description="Set up your email identity before linking, unlinking or changing the default account."
              />
            ) : null}
          </>
        )}
        {done ? <ProfileNotice title="Account updated" description={done} /> : null}
        {error ? <ProfileNotice title="Account action failed" description={error} danger /> : null}
      </ReportPage>
      <Dialog
        open={!!defaultId}
        onOpenChange={(v) => {
          if (!busy && !v) setDefaultId("");
        }}
      >
        <Dialog.Content dismissible={!busy}>
          <Dialog.Title>Change your default account?</Dialog.Title>
          <Dialog.Description>
            New reports will start with this account. Existing reports stay with their original
            service account.
          </Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" disabled={busy} onPress={() => setDefaultId("")}>
              Keep current
            </Button>
            <Button loading={busy} onPress={() => void changeDefault()}>
              Set default
            </Button>
          </Dialog.Footer>
          {error ? (
            <Text size="sm" className="text-destructive">
              {error}
            </Text>
          ) : null}
        </Dialog.Content>
      </Dialog>
    </>
  );
}
