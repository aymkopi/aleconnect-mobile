import { Redirect, useRouter } from "expo-router";
import { LucideEye, LucideEyeOff, LucideLock, LucideMail } from "lucide-react-native";
import { useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import {
  clearEmailSetupDismissal,
  dismissEmailSetup,
  setupConsumerIdentity,
} from "@/services/consumer-identity";

type Step = "details" | "review" | "complete";

export default function EmailSetupRoute() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading, refreshSession } = useAuthSession();
  const { accountContext, isLoading: isAccountLoading, refreshConsumerAccount } = useConsumerAccount();
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setupAttempt = useRef<{ email: string; idempotencyKey: string } | null>(null);

  if (isSessionLoading || isAccountLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!accountContext || accountContext.sessionMode === "identity") {
    return <Redirect href="/home" />;
  }

  const emailInvalid = showValidation && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordInvalid = showValidation && (password.length < 8 || password.length > 128);
  const mockVerificationAvailable = accountContext.capabilities.mockEmailVerification;

  const skip = async () => {
    await dismissEmailSetup(accountContext.defaultServiceAccountId);
    router.replace("/home");
  };

  const continueToReview = () => {
    setErrorMessage(null);
    setShowValidation(true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8 || password.length > 128) return;
    setStep("review");
  };

  const confirmSetup = async () => {
    if (!mockVerificationAvailable) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (setupAttempt.current?.email !== normalizedEmail) {
        setupAttempt.current = { email: normalizedEmail, idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `email_setup_${Date.now()}_${Math.random().toString(36).slice(2)}` };
      }
      await setupConsumerIdentity({ email, password, verification: "mock", idempotencyKey: setupAttempt.current.idempotencyKey });
      await refreshSession({ forceNetwork: true });
      await refreshConsumerAccount();
      await clearEmailSetupDismissal(accountContext.defaultServiceAccountId);
      setPassword("");
      setupAttempt.current = null;
      setStep("complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Email setup could not be completed.");
      setStep("review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: statusBarHeight + 40,
          paddingBottom: 28,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">Optional account setup</Text>
          <Heading className="text-[30px] font-black leading-9" size="2xl">Use email to sign in</Heading>
          <Text className="text-[15px] leading-5 text-muted">
            This email becomes your login and ALECO contact for linked accounts. It does not change your service-account details.
          </Text>
        </View>

        <View className="gap-4 rounded-xl border border-border bg-card p-5">
          {step === "details" ? (
            <>
              <FormControl isInvalid={emailInvalid} isRequired>
                <FormControlLabel><FormControlLabelText>Email address</FormControlLabelText></FormControlLabel>
                <Input className="h-12 rounded-xl">
                  <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideMail} /></InputSlot>
                  <InputField
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    textContentType="emailAddress"
                    value={email}
                  />
                </Input>
                {emailInvalid ? <FormControlError><FormControlErrorText>Enter a valid email address.</FormControlErrorText></FormControlError> : null}
              </FormControl>

              <FormControl isInvalid={passwordInvalid} isRequired>
                <FormControlLabel><FormControlLabelText>Unified password</FormControlLabelText></FormControlLabel>
                <Input className="h-12 rounded-xl">
                  <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideLock} /></InputSlot>
                  <InputField
                    accessibilityLabel="Unified password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect={false}
                    onChangeText={setPassword}
                    onSubmitEditing={continueToReview}
                    placeholder="8 to 128 characters"
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                    value={password}
                  />
                  <InputSlot accessibilityLabel={showPassword ? "Hide password" : "Show password"} accessibilityRole="button" className="h-10 w-10" onPress={() => setShowPassword((current) => !current)}>
                    <InputIcon as={showPassword ? LucideEyeOff : LucideEye} />
                  </InputSlot>
                </Input>
                {passwordInvalid ? <FormControlError><FormControlErrorText>Use 8 to 128 characters.</FormControlErrorText></FormControlError> : null}
              </FormControl>

              <Button className="h-12 rounded-xl" onPress={continueToReview} size="lg"><ButtonText>Review email setup</ButtonText></Button>
              <Button className="h-11 rounded-xl" onPress={() => void skip()} variant="outline"><ButtonText>Skip for now</ButtonText></Button>
            </>
          ) : null}

          {step === "review" ? (
            <>
              <Heading size="lg">Confirm email setup</Heading>
              <Text className="text-sm leading-5 text-muted">You will use {email.trim()} with this unified password when email sign-in is required. This temporary testing environment uses an explicit mock-verification confirmation; it does not send an email.</Text>
              {!mockVerificationAvailable ? (
                <Alert><AlertText>Mock verification is not available in this environment. Email setup cannot continue yet.</AlertText></Alert>
              ) : null}
              {errorMessage ? <Alert variant="destructive"><AlertText>{errorMessage}</AlertText></Alert> : null}
              <Button className="h-12 rounded-xl" isDisabled={!mockVerificationAvailable || isSubmitting} onPress={() => void confirmSetup()} size="lg">
                {isSubmitting ? <ButtonSpinner /> : null}<ButtonText>{isSubmitting ? "Setting up..." : "Confirm mock verification"}</ButtonText>
              </Button>
              <Button className="h-11 rounded-xl" isDisabled={isSubmitting} onPress={() => setStep("details")} variant="outline"><ButtonText>Back</ButtonText></Button>
              <Button className="h-11 rounded-xl" isDisabled={isSubmitting} onPress={() => void skip()} variant="ghost"><ButtonText>Skip for now</ButtonText></Button>
            </>
          ) : null}

          {step === "complete" ? (
            <>
              <Heading size="lg">Email setup complete</Heading>
              <Text className="text-sm leading-5 text-muted">Your previous account session was replaced. Continue with your new email sign-in identity.</Text>
              <Button className="h-12 rounded-xl" onPress={() => router.replace("/home")} size="lg"><ButtonText>Continue</ButtonText></Button>
            </>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
