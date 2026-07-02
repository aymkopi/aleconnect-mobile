import { Redirect, useRouter } from "expo-router";
import {
  Button,
  Input,
  Label,
  Surface,
  TextField,
  useThemeColor,
} from "heroui-native";
import {
  LucideEye,
  LucideEyeOff,
  LucideLock,
  LucideUserRound,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

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
  const [mutedColor] = useThemeColor(["muted"]);

  const handleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signInWithAccountNumber({ accountNumber, password });
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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "flex-start",
        paddingHorizontal: 20,
        paddingTop: statusBarHeight + 44,
        paddingBottom: 28,
        gap: 24,
      }}
    >
      <View className="gap-2">
        <Text className="text-foreground text-[34px] font-black leading-10">
          Sign in
        </Text>
        <Text className="text-muted text-[15px] leading-5">
          Use your ALECO account number to view service details and file
          reports.
        </Text>
      </View>

      <Surface className="rounded-[24px] p-5" style={{ gap: 14 }}>
        <TextField>
          <Label className="text-foreground">Account number</Label>
          <View className="w-full flex-row items-center">
            <Input
              className="w-full px-10"
              value={accountNumber}
              onChangeText={setAccountNumber}
              autoCapitalize="none"
              maxLength={15}
              textContentType="username"
              autoCorrect={false}
              keyboardType="number-pad"
              placeholder="Enter account number"
            />
            <View className="absolute left-3.5" pointerEvents="none">
              <LucideUserRound size={18} color={mutedColor} />
            </View>
          </View>
        </TextField>

        <TextField>
          <Label className="text-foreground">Password</Label>
          <View className="w-full flex-row items-center">
            <Input
              className="w-full px-10 pr-12"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              textContentType="password"
              autoCorrect={false}
              secureTextEntry={!isPasswordVisible}
              placeholder="Enter password"
            />
            <View className="absolute left-3.5" pointerEvents="none">
              <LucideLock size={18} color={mutedColor} />
            </View>
            <View className="absolute right-1.5">
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onPress={() => {
                  setIsPasswordVisible((current) => !current);
                }}
                accessibilityLabel={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
              >
                {isPasswordVisible ? (
                  <LucideEyeOff size={18} color={mutedColor} />
                ) : (
                  <LucideEye size={18} color={mutedColor} />
                )}
              </Button>
            </View>
          </View>
        </TextField>

        {errorMessage ? (
          <Text className="text-danger text-sm">{errorMessage}</Text>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          onPress={handleSignIn}
          isDisabled={isSubmitting}
        >
          <Button.Label>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button.Label>
        </Button>

        <Button
          variant="tertiary"
          size="md"
          onPress={() => router.push("/home")}
        >
          <Button.Label>Continue without account</Button.Label>
        </Button>

        <Text className="text-xs text-muted">
          No sign-ups here. Your account must already exist in ALECO records.
        </Text>
      </Surface>
    </ScrollView>
  );
}
