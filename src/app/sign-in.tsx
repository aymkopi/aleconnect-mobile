import { Redirect, useRouter } from "expo-router";
import {
    Button,
    InputGroup,
    Label,
    Surface,
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

import { useAuthSession } from "@/hooks/use-auth-session";
import { signInWithAccountNumber } from "@/services/auth";

export default function SignInRoute() {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);

  const handleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signInWithAccountNumber({ accountNumber, password });
      router.replace("/(tabs)/home");
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
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Surface className="p-6 rounded-3xl" style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-2xl font-semibold text-foreground">
            Welcome back
          </Text>
          <Text className="text-muted text-sm">
            Sign in with your account number and password.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Label className="text-foreground">Account number</Label>
          <InputGroup>
            <InputGroup.Prefix isDecorative>
              <LucideUserRound size={18} color={mutedColor} />
            </InputGroup.Prefix>
            <InputGroup.Input
              value={accountNumber}
              onChangeText={setAccountNumber}
              autoCapitalize="none"
              maxLength={15}
              textContentType="username"
              autoCorrect={false}
              keyboardType="number-pad"
              placeholder="Enter account number"
            />
          </InputGroup>
        </View>

        <View style={{ gap: 8 }}>
          <Label className="text-foreground">Password</Label>
          <InputGroup>
            <InputGroup.Prefix isDecorative>
              <LucideLock size={18} color={mutedColor} />
            </InputGroup.Prefix>
            <InputGroup.Input
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              textContentType="password"
              autoCorrect={false}
              secureTextEntry={!isPasswordVisible}
              placeholder="Enter password"
            />
            <InputGroup.Suffix>
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
            </InputGroup.Suffix>
          </InputGroup>
        </View>

        {errorMessage ? (
          <Text className="text-danger text-sm" selectable>
            {errorMessage}
          </Text>
        ) : null}

        <Button
          variant="primary"
          size="md"
          onPress={handleSignIn}
          isDisabled={isSubmitting}
        >
          <Button.Label>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button.Label>
        </Button>

        <Button
          variant="ghost"
          size="md"
          onPress={() => router.push("/(tabs)/home")}
        >
          <Button.Label>Continue without account</Button.Label>
        </Button>

        <Text className="text-xs text-muted" selectable>
          Need help? Contact support to verify your account credentials.
        </Text>
      </Surface>

      <View
        style={{
          alignItems: "center",
          marginTop: 16,
          opacity: 0.8,
        }}
      >
        <Text style={{ color: accentColor }} className="text-xs">
          ALEConnect
        </Text>
      </View>
    </ScrollView>
  );
}
