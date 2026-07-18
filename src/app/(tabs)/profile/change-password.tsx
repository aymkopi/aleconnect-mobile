import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { Eye, EyeOff, LockKeyhole } from "lucide-react-native";
import { useCallback, useState } from "react";
import { BackHandler, View } from "react-native";
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
import { useAuthSession } from "@/hooks/use-auth-session";
import { changeConsumerPassword } from "@/services/auth";

type PasswordFieldName = "current" | "next" | "confirm";
type FieldErrors = Partial<Record<PasswordFieldName, string>>;

function PasswordField({
  error,
  label,
  onChangeText,
  onSubmitEditing,
  onToggleVisibility,
  value,
  visible,
}: {
  error?: string;
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  onToggleVisibility: () => void;
  value: string;
  visible: boolean;
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isRequired>
      <FormControlLabel>
        <FormControlLabelText>{label}</FormControlLabelText>
      </FormControlLabel>
      <Input className="h-12 rounded-lg" isInvalid={Boolean(error)}>
        <InputSlot style={{ pointerEvents: "none" }}>
          <InputIcon as={LockKeyhole} />
        </InputSlot>
        <InputField
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={!visible}
          value={value}
        />
        <InputSlot
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
          accessibilityRole="button"
          className="h-10 w-10"
          onPress={onToggleVisibility}
        >
          <InputIcon as={visible ? EyeOff : Eye} />
        </InputSlot>
      </Input>
      {error ? (
        <FormControlError>
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      ) : null}
    </FormControl>
  );
}

export default function ChangePasswordRoute() {
  const router = useRouter();
  const { session, isLoading, refreshSession } = useAuthSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleField, setVisibleField] = useState<PasswordFieldName | null>(
    null,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRequired = Boolean(session?.user.mustChangePassword);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (isRequired) return true;
          router.replace("/profile");
          return true;
        },
      );
      return () => subscription.remove();
    }, [isRequired, router]),
  );

  const submit = async () => {
    const nextErrors: FieldErrors = {};
    if (!currentPassword) nextErrors.current = "Current password is required.";
    if (!newPassword) nextErrors.next = "New password is required.";
    else if (newPassword.length < 8 || newPassword.length > 128) {
      nextErrors.next = "Use 8 to 128 characters.";
    } else if (newPassword === currentPassword) {
      nextErrors.next = "Use a password different from your current one.";
    }
    if (!confirmPassword) nextErrors.confirm = "Confirm your new password.";
    else if (confirmPassword !== newPassword) {
      nextErrors.confirm = "Passwords do not match.";
    }

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await changeConsumerPassword(currentPassword, newPassword);
      await refreshSession({ forceNetwork: true });
      router.replace(isRequired ? "/home" : "/profile");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Password update failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        bottomOffset={32}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          gap: 20,
          padding: 20,
          paddingBottom: 40,
        }}
      >
        <View className="gap-2">
          <Heading size="xl">
            {isRequired ? "Secure your account" : "Change password"}
          </Heading>
          <Text className="text-sm leading-5 text-muted-foreground">
            Use a unique password with at least 8 characters.
          </Text>
        </View>

        {isRequired ? (
          <Alert className="border-accent/20 bg-accent/10 px-3 py-3">
            <AlertText>
              You need to replace the temporary password before continuing.
            </AlertText>
          </Alert>
        ) : null}

        <View className="gap-4 rounded-lg border border-border bg-card p-4">
          <PasswordField
            error={errors.current}
            label="Current password"
            onChangeText={(value) => {
              setCurrentPassword(value);
              setErrors((current) => ({ ...current, current: undefined }));
            }}
            onToggleVisibility={() =>
              setVisibleField((current) =>
                current === "current" ? null : "current",
              )
            }
            value={currentPassword}
            visible={visibleField === "current"}
          />
          <PasswordField
            error={errors.next}
            label="New password"
            onChangeText={(value) => {
              setNewPassword(value);
              setErrors((current) => ({ ...current, next: undefined }));
            }}
            onToggleVisibility={() =>
              setVisibleField((current) =>
                current === "next" ? null : "next",
              )
            }
            value={newPassword}
            visible={visibleField === "next"}
          />
          <PasswordField
            error={errors.confirm}
            label="Confirm new password"
            onChangeText={(value) => {
              setConfirmPassword(value);
              setErrors((current) => ({ ...current, confirm: undefined }));
            }}
            onSubmitEditing={() => void submit()}
            onToggleVisibility={() =>
              setVisibleField((current) =>
                current === "confirm" ? null : "confirm",
              )
            }
            value={confirmPassword}
            visible={visibleField === "confirm"}
          />

          {formError ? (
            <Alert variant="destructive">
              <AlertText>{formError}</AlertText>
            </Alert>
          ) : null}

          <Button
            className="mt-1 h-12 rounded-lg"
            isDisabled={isSubmitting}
            onPress={() => void submit()}
            size="lg"
          >
            {isSubmitting ? <ButtonSpinner /> : null}
            <ButtonText>
              {isSubmitting ? "Updating..." : "Update password"}
            </ButtonText>
          </Button>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
