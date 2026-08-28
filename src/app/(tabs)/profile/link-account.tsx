import { Redirect, type Href, useRouter } from "expo-router";
import {
  LucideCheckCircle2,
  LucideLock,
  LucideMail,
  LucideUserRound,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { presentAccountLinkError } from "@/features/accounts/contract";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { submitAccountLinkRequest } from "@/services/account-link-requests";

export default function LinkAccountRoute() {
  const router = useRouter();
  const { session, signOut } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const [accountNumber, setAccountNumber] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [password, setPassword] = useState("");
  const [review, setReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [passwordResetRequired, setPasswordResetRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => () => setPassword(""), []);

  if (!session) return <Redirect href="/sign-in" />;
  if (!accountContext) return null;

  const emailReady = accountContext.sessionMode === "identity"
    && accountContext.capabilities.accountLinking;

  const continueToReview = () => {
    setError(null);
    if (!accountNumber.trim() || !registeredName.trim() || !password) {
      setError("Complete the account number, registered name, and current password.");
      return;
    }
    setReview(true);
  };

  const submit = async () => {
    const submittedPassword = password;
    setPassword("");
    setIsSubmitting(true);
    setError(null);
    try {
      await submitAccountLinkRequest({
        accountNumber,
        registeredName,
        password: submittedPassword,
      });
      setSubmitted(true);
    } catch (nextError) {
      const presentation = presentAccountLinkError(nextError);
      if (presentation.kind === "password-reset-required") {
        setReview(false);
        setPasswordResetRequired(true);
      } else {
        setError(presentation.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const continuePasswordReset = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signOut();
      router.replace({
        pathname: "/sign-in",
        params: { mode: "account", linking: "1" },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not sign out.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ChildAppBar
        title="Link account"
        description="Add another ALECO service account"
        onBack={() => router.back()}
        backAccessibilityLabel="Back to accounts"
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {!emailReady ? (
          <View className="gap-3 rounded-xl border border-border bg-card p-5">
            <LucideMail size={24} />
            <Heading size="lg">Complete email setup first</Heading>
            <Text className="text-sm text-muted">
              Linking accounts uses your email sign-in identity. It does not send an email from this screen.
            </Text>
            <Button onPress={() => router.push("/email-setup" as Href)}>
              <ButtonText>Set up email sign-in</ButtonText>
            </Button>
          </View>
        ) : passwordResetRequired ? (
          <View className="gap-4 rounded-xl border border-accent/30 bg-card p-5">
            <LucideLock size={26} />
            <View className="gap-1">
              <Heading size="lg">Finish this account&apos;s password reset</Heading>
              <Text className="text-sm text-muted">
                The account details were verified, but ALECO requires its temporary password to be replaced before the account can be linked.
              </Text>
            </View>
            <View className="gap-2 rounded-lg bg-muted/10 p-3">
              <Text className="text-sm">1. Have the temporary password provided by staff ready.</Text>
              <Text className="text-sm">2. Sign in with this ALECO account number and temporary password.</Text>
              <Text className="text-sm">3. Set a new password on the Secure your account screen.</Text>
              <Text className="text-sm">4. Sign out, return to email sign-in, then submit this link request again.</Text>
            </View>
            {error ? <Alert variant="destructive"><AlertText>{error}</AlertText></Alert> : null}
            <Button isDisabled={isSubmitting} onPress={() => void continuePasswordReset()}>
              {isSubmitting ? <ButtonSpinner /> : null}
              <ButtonText>Continue to account sign-in</ButtonText>
            </Button>
            <Button onPress={() => setPasswordResetRequired(false)} variant="outline">
              <ButtonText>Review entered details</ButtonText>
            </Button>
          </View>
        ) : submitted ? (
          <View className="gap-3 rounded-xl border border-border bg-card p-5">
            <LucideCheckCircle2 size={28} />
            <Heading size="lg">Request sent to staff</Heading>
            <Text className="text-sm text-muted">
              Your request is pending review. Your current ALECO account remains available while staff decides.
            </Text>
            <Button onPress={() => router.replace("/profile/accounts" as Href)}>
              <ButtonText>Back to accounts</ButtonText>
            </Button>
          </View>
        ) : (
          <View className="gap-4 rounded-xl border border-border bg-card p-5">
            {review ? (
              <>
                <Heading size="lg">Review request</Heading>
                <Text className="text-sm text-muted">
                  Account: {accountNumber.trim()}{"\n"}
                  Registered name: {registeredName.trim()}
                </Text>
                <Text className="text-xs text-muted">
                  Your current ALECO account password is used only to verify this request. It is not your email sign-in password and is not saved on this device.
                </Text>
                {error ? <Alert variant="destructive"><AlertText>{error}</AlertText></Alert> : null}
                <View className="flex-row gap-2">
                  <Button className="flex-1" onPress={() => setReview(false)} variant="outline">
                    <ButtonText>Back</ButtonText>
                  </Button>
                  <Button className="flex-1" isDisabled={isSubmitting} onPress={() => void submit()}>
                    {isSubmitting ? <ButtonSpinner /> : null}
                    <ButtonText>Send to staff</ButtonText>
                  </Button>
                </View>
              </>
            ) : (
              <>
                <Heading size="lg">Link another ALECO account</Heading>
                <Text className="text-sm text-muted">
                  Use the exact registered name and this ALECO account&apos;s current password. If staff reset it, finish account-number sign-in with the temporary password first.
                </Text>
                <Input className="h-12 rounded-xl">
                  <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideUserRound} /></InputSlot>
                  <InputField accessibilityLabel="ALECO account number" keyboardType="number-pad" onChangeText={setAccountNumber} placeholder="ALECO account number" value={accountNumber} />
                </Input>
                <Input className="h-12 rounded-xl">
                  <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideUserRound} /></InputSlot>
                  <InputField accessibilityLabel="Exact registered name" onChangeText={setRegisteredName} placeholder="Exact registered name" value={registeredName} />
                </Input>
                <Input className="h-12 rounded-xl">
                  <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideLock} /></InputSlot>
                  <InputField accessibilityLabel="ALECO account password" autoCapitalize="none" autoComplete="current-password" onChangeText={setPassword} placeholder="ALECO account password" secureTextEntry value={password} />
                </Input>
                {error ? <Alert variant="destructive"><AlertText>{error}</AlertText></Alert> : null}
                <Button onPress={continueToReview}><ButtonText>Review request</ButtonText></Button>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
