import { Redirect, useRouter } from "expo-router";
import {
  LucideEye,
  LucideEyeOff,
  LucideLock,
  LucideUserRound,
} from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Alert, AlertText } from "@/components/ui/alert";
import {
  Button,
  ButtonSpinner,
  ButtonText,
} from "@/components/ui/button";
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
import { signInWithAccountNumber } from "@/services/auth";

export default function SignInRoute() {
  const router = useRouter();
  const { session, isLoading, refreshSession } = useAuthSession();
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const isAccountNumberInvalid = showValidation && !accountNumber.trim();
  const isPasswordInvalid = showValidation && !password;

  const handleSignIn = async () => {
    setErrorMessage(null);
    setShowValidation(true);

    if (!accountNumber.trim() || !password) {
      return;
    }

    setIsSubmitting(true);

    try {
      await signInWithAccountNumber({
        accountNumber: accountNumber.trim(),
        password,
      });
      await refreshSession();
      router.replace("/home");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingHorizontal: 20,
          paddingTop: statusBarHeight + 44,
          paddingBottom: 28,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Heading className="text-[34px] font-black leading-10" size="3xl">
            Sign in
          </Heading>
          <Text className="text-[15px] leading-5 text-muted">
            Use your ALECO account number to view service details and file
            reports.
          </Text>
        </View>

        <View className="gap-4 rounded-2xl border border-border bg-card p-5">
          <FormControl isInvalid={isAccountNumberInvalid} isRequired>
            <FormControlLabel>
              <FormControlLabelText>Account number</FormControlLabelText>
            </FormControlLabel>
            <Input className="h-12 rounded-xl">
              <InputSlot style={{ pointerEvents: "none" }}>
                <InputIcon as={LucideUserRound} />
              </InputSlot>
              <InputField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={15}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                textContentType="username"
                value={accountNumber}
              />
            </Input>
            {isAccountNumberInvalid ? (
              <FormControlError>
                <FormControlErrorText>
                  Account number is required.
                </FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          <FormControl isInvalid={isPasswordInvalid} isRequired>
            <FormControlLabel>
              <FormControlLabelText>Password</FormControlLabelText>
            </FormControlLabel>
            <Input className="h-12 rounded-xl">
              <InputSlot style={{ pointerEvents: "none" }}>
                <InputIcon as={LucideLock} />
              </InputSlot>
              <InputField
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                onSubmitEditing={() => void handleSignIn()}
                placeholder="Enter password"
                secureTextEntry={!isPasswordVisible}
                textContentType="password"
                value={password}
              />
              <InputSlot
                accessibilityLabel={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                accessibilityRole="button"
                className="h-10 w-10"
                onPress={() => setIsPasswordVisible((current) => !current)}
              >
                <InputIcon as={isPasswordVisible ? LucideEyeOff : LucideEye} />
              </InputSlot>
            </Input>
            {isPasswordInvalid ? (
              <FormControlError>
                <FormControlErrorText>Password is required.</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertText>{errorMessage}</AlertText>
            </Alert>
          ) : null}

          <Button
            className="h-12 rounded-xl"
            isDisabled={isSubmitting}
            onPress={() => void handleSignIn()}
            size="lg"
          >
            {isSubmitting ? <ButtonSpinner /> : null}
            <ButtonText>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </ButtonText>
          </Button>

          <Button
            className="h-11 rounded-xl"
            onPress={() => router.push("/home")}
            variant="outline"
          >
            <ButtonText>Continue without account</ButtonText>
          </Button>

          <Text className="text-xs text-muted">
            No sign-ups here. Your account must already exist in ALECO records.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
