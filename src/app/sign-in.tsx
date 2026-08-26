import { Redirect, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { LucideEye, LucideEyeOff, LucideLock, LucideMail, LucideUserRound } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { FormControl, FormControlError, FormControlErrorText, FormControlLabel, FormControlLabelText } from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import { ApiRequestError } from "@/services/api";
import { signInWithAccountNumber, signInWithEmail } from "@/services/auth";
import { fetchConsumerAccountContext, hasDismissedEmailSetup } from "@/services/consumer-identity";

type SignInMode = "account" | "email";

export default function SignInRoute() {
  const router = useRouter();
  const { mode, linked } = useLocalSearchParams<{ mode?: string | string[]; linked?: string }>();
  const requestedMode = Array.isArray(mode) ? mode[0] : mode;
  const { session, isLoading, refreshSession } = useAuthSession();
  const [signInMode, setSignInMode] = useState<SignInMode>(requestedMode === "email" ? "email" : "account");
  const [accountNumber, setAccountNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const identifier = signInMode === "account" ? accountNumber : email;
  const identifierInvalid = showValidation && !identifier.trim();
  const passwordInvalid = showValidation && !password;

  const handleSignIn = async () => {
    setErrorMessage(null);
    setShowValidation(true);
    if (!identifier.trim() || !password) return;

    setIsSubmitting(true);
    try {
      const login = signInMode === "account"
        ? await signInWithAccountNumber({ accountNumber: accountNumber.trim(), password })
        : await signInWithEmail({ email: email.trim(), password });
      await refreshSession({ forceNetwork: true });
      const access = await fetchConsumerAccountContext(login.user);
      const shouldOfferSetup = access.sessionMode === "legacy"
        && access.capabilities.emailSetup
        && !(await hasDismissedEmailSetup(access.defaultServiceAccountId));
      const destination = (login.user.mustChangePassword
        ? "/profile/change-password"
        : shouldOfferSetup
          ? "/email-setup"
          : "/home") as Href;
      router.replace(destination);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "EMAIL_SIGN_IN_REQUIRED") {
        setSignInMode("email");
        setErrorMessage("This account now requires email sign-in. Enter the email used for account linking.");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;
  if (session) {
    return <Redirect href={session.user.mustChangePassword ? "/profile/change-password" : "/home"} />;
  }

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-start", paddingHorizontal: 20, paddingTop: statusBarHeight + 44, paddingBottom: 28, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Heading className="text-[34px] font-black leading-10" size="3xl">Sign in</Heading>
          <Text className="text-[15px] leading-5 text-muted">Use your ALECO account number, or the email set up for your linked accounts.</Text>
          {linked === "1" ? <Text className="text-sm font-semibold text-accent">Account linked—continue with email.</Text> : null}
        </View>

        <View className="gap-4 rounded-xl border border-border bg-card p-5">
          <View accessibilityRole="tablist" className="flex-row rounded-xl bg-secondary p-1">
            <Button accessibilityRole="tab" accessibilityState={{ selected: signInMode === "account" }} className="h-10 flex-1 rounded-lg" onPress={() => { setSignInMode("account"); setErrorMessage(null); }} variant={signInMode === "account" ? "default" : "ghost"}><ButtonText>Account number</ButtonText></Button>
            <Button accessibilityRole="tab" accessibilityState={{ selected: signInMode === "email" }} className="h-10 flex-1 rounded-lg" onPress={() => { setSignInMode("email"); setErrorMessage(null); }} variant={signInMode === "email" ? "default" : "ghost"}><ButtonText>Email</ButtonText></Button>
          </View>

          <FormControl isInvalid={identifierInvalid} isRequired>
            <FormControlLabel><FormControlLabelText>{signInMode === "account" ? "Account number" : "Email address"}</FormControlLabelText></FormControlLabel>
            <Input className="h-12 rounded-xl">
              <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={signInMode === "account" ? LucideUserRound : LucideMail} /></InputSlot>
              <InputField accessibilityLabel={signInMode === "account" ? "Account number" : "Email address"} autoCapitalize="none" autoComplete={signInMode === "account" ? "username" : "email"} autoCorrect={false} keyboardType={signInMode === "account" ? "number-pad" : "email-address"} maxLength={signInMode === "account" ? 15 : undefined} onChangeText={signInMode === "account" ? setAccountNumber : setEmail} placeholder={signInMode === "account" ? "Enter account number" : "name@example.com"} textContentType={signInMode === "account" ? "username" : "emailAddress"} value={identifier} />
            </Input>
            {identifierInvalid ? <FormControlError><FormControlErrorText>{signInMode === "account" ? "Account number is required." : "Email is required."}</FormControlErrorText></FormControlError> : null}
          </FormControl>

          <FormControl isInvalid={passwordInvalid} isRequired>
            <FormControlLabel><FormControlLabelText>Password</FormControlLabelText></FormControlLabel>
            <Input className="h-12 rounded-xl">
              <InputSlot style={{ pointerEvents: "none" }}><InputIcon as={LucideLock} /></InputSlot>
              <InputField accessibilityLabel="Password" autoCapitalize="none" autoComplete="current-password" autoCorrect={false} onChangeText={setPassword} onSubmitEditing={() => void handleSignIn()} placeholder="Enter password" secureTextEntry={!isPasswordVisible} textContentType="password" value={password} />
              <InputSlot accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"} accessibilityRole="button" className="h-10 w-10" onPress={() => setIsPasswordVisible((current) => !current)}><InputIcon as={isPasswordVisible ? LucideEyeOff : LucideEye} /></InputSlot>
            </Input>
            {passwordInvalid ? <FormControlError><FormControlErrorText>Password is required.</FormControlErrorText></FormControlError> : null}
          </FormControl>

          {errorMessage ? <Alert variant="destructive"><AlertText>{errorMessage}</AlertText></Alert> : null}
          <Button className="h-12 rounded-xl" isDisabled={isSubmitting} onPress={() => void handleSignIn()} size="lg">{isSubmitting ? <ButtonSpinner /> : null}<ButtonText>{isSubmitting ? "Signing in..." : "Sign in"}</ButtonText></Button>
          <Button className="h-11 rounded-xl" onPress={() => router.push("/home")} variant="outline"><ButtonText>Continue without account</ButtonText></Button>
          <Text className="text-xs text-muted">No sign-ups here. Your account must already exist in ALECO records.</Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
