import { Redirect, type Href, useRouter } from "expo-router";
import { LucideCheckCircle2, LucideLock, LucideMail, LucideUserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { submitAccountLinkRequest } from "@/services/account-link-requests";

export default function LinkAccountRoute() {
  const router = useRouter();
  const { session } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const [accountNumber, setAccountNumber] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [password, setPassword] = useState("");
  const [review, setReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => () => setPassword(""), []);
  if (!session) return <Redirect href="/sign-in" />;
  if (!accountContext) return null;
  const emailReady = accountContext.sessionMode === "identity" && accountContext.capabilities.accountLinking;
  const continueToReview = () => {
    setError(null);
    if (!accountNumber.trim() || !registeredName.trim() || !password) { setError("Complete the account number, registered name, and current password."); return; }
    setReview(true);
  };
  const submit = async () => {
    const submittedPassword = password;
    setPassword(""); setIsSubmitting(true); setError(null);
    try {
      await submitAccountLinkRequest({ accountNumber, registeredName, password: submittedPassword });
      setSubmitted(true);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Your link request could not be sent."); }
    finally { setIsSubmitting(false); }
  };
  return <View className="flex-1 bg-background"><ChildAppBar title="Link account" description="Add another ALECO service account" onBack={() => router.back()} backAccessibilityLabel="Back to accounts" /><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
    {!emailReady ? <View className="gap-3 rounded-xl border border-border bg-card p-5"><LucideMail size={24} /><Heading size="lg">Complete email setup first</Heading><Text className="text-sm text-muted">Linking accounts uses your email sign-in identity. It does not send an email from this screen.</Text><Button onPress={() => router.push("/email-setup" as Href)}><ButtonText>Set up email sign-in</ButtonText></Button></View> : submitted ? <View className="gap-3 rounded-xl border border-border bg-card p-5"><LucideCheckCircle2 size={28} /><Heading size="lg">Request sent to staff</Heading><Text className="text-sm text-muted">Your request is pending review. Your current ALECO account remains available while staff decides.</Text><Button onPress={() => router.replace("/profile/accounts" as Href)}><ButtonText>Back to accounts</ButtonText></Button></View> : <View className="gap-4 rounded-xl border border-border bg-card p-5">{review ? <><Heading size="lg">Review request</Heading><Text className="text-sm text-muted">Account: {accountNumber.trim()}{"\n"}Registered name: {registeredName.trim()}</Text><Text className="text-xs text-muted">Your current account password is used only to verify this request. It is not saved on this device.</Text>{error ? <Alert variant="destructive"><AlertText>{error}</AlertText></Alert> : null}<View className="flex-row gap-2"><Button className="flex-1" onPress={() => setReview(false)} variant="outline"><ButtonText>Back</ButtonText></Button><Button className="flex-1" isDisabled={isSubmitting} onPress={() => void submit()}>{isSubmitting ? <ButtonSpinner /> : null}<ButtonText>Send to staff</ButtonText></Button></View></> : <><Heading size="lg">Link another ALECO account</Heading><Text className="text-sm text-muted">Use the exact registered name and current password for the account you want to link.</Text><Input className="h-12 rounded-xl"><InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideUserRound} /></InputSlot><InputField accessibilityLabel="ALECO account number" keyboardType="number-pad" onChangeText={setAccountNumber} placeholder="ALECO account number" value={accountNumber} /></Input><Input className="h-12 rounded-xl"><InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideUserRound} /></InputSlot><InputField accessibilityLabel="Exact registered name" onChangeText={setRegisteredName} placeholder="Exact registered name" value={registeredName} /></Input><Input className="h-12 rounded-xl"><InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideLock} /></InputSlot><InputField accessibilityLabel="Current account password" autoCapitalize="none" autoComplete="current-password" onChangeText={setPassword} placeholder="Current account password" secureTextEntry value={password} /></Input>{error ? <Alert variant="destructive"><AlertText>{error}</AlertText></Alert> : null}<Button onPress={continueToReview}><ButtonText>Review request</ButtonText></Button></>}</View>}
  </ScrollView></View>;
}
