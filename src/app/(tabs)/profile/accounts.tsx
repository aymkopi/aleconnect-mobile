import { Redirect, type Href, useFocusEffect, useRouter } from "expo-router";
import { LucideChevronRight, LucideLink, LucideShieldAlert, LucideStar, LucideTrash2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useConsumerProfileContext } from "@/context/consumer-profile-context";
import { clearConsumerProfileCaches } from "@/hooks/use-consumer-profile";
import { fetchAccountLinkRequests, type AccountLinkRequest } from "@/services/account-link-requests";
import { setDefaultLinkedAccount, unlinkLinkedAccount } from "@/services/linked-accounts";

export default function LinkedAccountsRoute() {
  const router = useRouter();
  const { session, signOut } = useAuthSession();
  const { accountContext, isLoading, refreshConsumerAccount, clearConsumerAccount } = useConsumerAccount();
  const { reload, setServiceAccountId } = useConsumerProfileContext();
  const [requests, setRequests] = useState<AccountLinkRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [replacementDefaultServiceAccountId, setReplacementDefaultServiceAccountId] = useState("");

  const loadRequests = useCallback(async () => {
    if (!accountContext || accountContext.sessionMode !== "identity") { setRequests([]); return; }
    try { setRequests((await fetchAccountLinkRequests()).requests); } catch { setRequests([]); }
  }, [accountContext]);

  useFocusEffect(useCallback(() => { void loadRequests(); }, [loadRequests]));
  useEffect(() => () => setPassword(""), []);
  if (!session) return <Redirect href="/sign-in" />;
  if (isLoading || !accountContext) return null;

  const setDefault = async (serviceAccountId: string) => {
    if (serviceAccountId === accountContext.defaultServiceAccountId) return;
    setWorkingId(serviceAccountId); setError(null);
    try {
      await setDefaultLinkedAccount(serviceAccountId, accountContext.accessRevision);
      setServiceAccountId(null);
      await refreshConsumerAccount();
      await reload({ forceNetwork: true });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Default account could not be changed."); }
    finally { setWorkingId(null); }
  };

  const confirmUnlink = async () => {
    if (!unlinkId || !password) { setError("Enter the current password for this account."); return; }
    const isDefault = unlinkId === accountContext.defaultServiceAccountId;
    if (isDefault && !replacementDefaultServiceAccountId) { setError("Choose a replacement default account first."); return; }
    setWorkingId(unlinkId); setError(null);
    try {
      const result = await unlinkLinkedAccount({ serviceAccountId: unlinkId, currentAccountPassword: password, accessRevision: accountContext.accessRevision, replacementDefaultServiceAccountId });
      setPassword(""); setUnlinkId(null);
      await clearConsumerProfileCaches();
      if (result.reauthenticationRequired) { clearConsumerAccount(); await signOut(); router.replace("/sign-in"); return; }
      await refreshConsumerAccount();
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Account could not be unlinked."); }
    finally { setWorkingId(null); }
  };

  const unlinkAccount = accountContext.accounts.find((account) => account.id === unlinkId) ?? null;
  const canUnlink = accountContext.accounts.length > 1;
  return (
    <View className="flex-1 bg-background">
      <ChildAppBar title="ALECO accounts" description="Linked service accounts" onBack={() => router.back()} backAccessibilityLabel="Back to profile" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View className="gap-1"><Heading size="xl">ALECO accounts</Heading><Text className="text-sm text-muted">Your service details stay separate for each ALECO account.</Text></View>
        {error ? <Alert variant="destructive"><AlertText>{error}</AlertText></Alert> : null}
        {accountContext.accounts.map((account) => (
          <View key={account.id} className="gap-3 rounded-xl border border-border bg-card p-4">
            <View className="flex-row items-start justify-between gap-3"><View className="flex-1 gap-1"><Heading size="md">{account.registeredName}</Heading><Text className="text-sm text-muted">{account.accountNumber ?? "ALECO account"}</Text>{account.address ? <Text className="text-xs text-muted">{account.address}</Text> : null}</View>{account.isDefault ? <View className="flex-row items-center gap-1 rounded-full bg-accent-soft px-2 py-1"><LucideStar size={14} /><Text className="text-xs font-bold">Default</Text></View> : null}</View>
            <View className="flex-row flex-wrap gap-2">
              {!account.isDefault ? <Button className="min-h-11" isDisabled={workingId !== null} onPress={() => void setDefault(account.id)} size="sm" variant="secondary"><ButtonText>{workingId === account.id ? "Saving..." : "Set default"}</ButtonText></Button> : null}
              <Button className="min-h-11" onPress={() => router.push({ pathname: "/profile/details", params: { serviceAccountId: account.id } } as Href)} size="sm" variant="outline"><ButtonText>Edit details</ButtonText><LucideChevronRight size={16} /></Button>
              <Button className="min-h-11" isDisabled={!canUnlink || workingId !== null} onPress={() => { setUnlinkId(account.id); setReplacementDefaultServiceAccountId(""); setPassword(""); }} size="sm" variant="destructive"><LucideTrash2 size={16} /><ButtonText>Unlink account</ButtonText></Button>
            </View>
            {!canUnlink ? <Text className="text-xs text-muted">At least one ALECO account must remain linked.</Text> : null}
          </View>
        ))}
        <Button className="min-h-12" onPress={() => router.push("/profile/link-account" as Href)}><LucideLink size={18} /><ButtonText>Link another account</ButtonText></Button>
        {requests.length ? <View className="gap-3 pt-2"><Heading size="md">Link requests</Heading>{requests.map((request) => <View key={request.requestId} className="gap-1 rounded-lg border border-border bg-card p-3"><Text className="font-bold">{request.accountNumber} · {request.registeredName}</Text><Text className="text-sm capitalize text-muted">{request.status}</Text>{request.status === "denied" && request.consumerReason ? <Text className="text-sm text-destructive">{request.consumerReason}</Text> : null}{request.status === "approved" ? <><Text className="text-sm text-muted">Approved. Sign out and continue with email to refresh account access.</Text><Button onPress={() => void signOut().then(() => router.replace({ pathname: "/sign-in", params: { mode: "email", linked: "1" } }))} size="sm"><ButtonText>Continue with email</ButtonText></Button></> : null}{request.status === "conflict" ? <Text className="text-sm text-muted">This request needs additional staff review.</Text> : null}</View>)}</View> : null}
        {unlinkAccount ? <View className="gap-3 rounded-xl border border-destructive bg-card p-4"><View className="flex-row gap-2"><LucideShieldAlert size={20} /><View className="flex-1"><Heading size="md">Unlink account</Heading><Text className="text-sm text-muted">Confirm with this account’s current password. You will need to sign in again.</Text></View></View><Input className="h-12 rounded-xl"><InputField accessibilityLabel="Current account password" autoCapitalize="none" autoComplete="current-password" onChangeText={setPassword} placeholder="Current account password" secureTextEntry value={password} /></Input>{unlinkAccount.isDefault ? <View className="gap-2"><Text className="text-sm font-medium">Replacement default account</Text>{accountContext.accounts.filter((account) => account.id !== unlinkAccount.id).map((account) => <Button key={account.id} onPress={() => setReplacementDefaultServiceAccountId(account.id)} variant={replacementDefaultServiceAccountId === account.id ? "default" : "outline"}><ButtonText>{account.accountNumber ?? account.registeredName}</ButtonText></Button>)}</View> : null}<View className="flex-row gap-2"><Button className="flex-1" onPress={() => { setUnlinkId(null); setPassword(""); }} variant="outline"><ButtonText>Cancel</ButtonText></Button><Button className="flex-1" isDisabled={workingId !== null} onPress={() => void confirmUnlink()} variant="destructive">{workingId ? <ButtonSpinner /> : null}<ButtonText>Confirm unlink</ButtonText></Button></View></View> : null}
      </ScrollView>
    </View>
  );
}
