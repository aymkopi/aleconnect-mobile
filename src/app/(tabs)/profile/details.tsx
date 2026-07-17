import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";

import {
  Alert,
  AlertText,
} from "@/components/ui/alert";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetContent,
  BottomSheetPortal,
  type BottomSheetRef,
} from "@/components/ui/bottomsheet";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import {
  LucideBookUser,
  LucideGauge,
  LucideMail,
  LucideMapPin,
  LucidePencil,
  LucidePhone,
  LucideUserRound,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountDetailsBuilder } from "@/features/profile/components/AccountDetailsBuilder";
import {
  EditableField,
  ProfileDetailsSheetContent,
} from "@/features/profile/components/ProfileDetailsSheetContent";

import { uploadCurrentUserAvatar } from "@/services/profile";
import { useConsumerProfileContext } from "../../../context/consumer-profile-context";

type FeedbackMessage = {
  title: string;
  description: string;
  status: "danger" | "success" | "accent";
};

export default function ProfileDetailsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accentColor] = useAppColors(["accent"]);
  const scrollRef = useRef<ScrollView | null>(null);
  const editSheetRef = useRef<BottomSheetRef>(null);
  const bottomPadding = Math.max(insets.bottom, 16) + 24;
  const { session } = useAuthSession();
  const { profile, isLoading, error, reload, setAvatarUrl } =
    useConsumerProfileContext();
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localEmail, setLocalEmail] = useState<string | null>(null);
  const [localAddress, setLocalAddress] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(
    () => profile?.avatarUrl ?? null,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const resetEditSheet = useCallback(() => {
    setEditingField(null);
    setInputError(null);
    setInputValue("");
  }, []);

  const closeEditSheet = useCallback(() => {
    Keyboard.dismiss();
    editSheetRef.current?.close();
    resetEditSheet();
  }, [resetEditSheet]);

  useEffect(() => {
    setAvatarUri(profile?.avatarUrl ?? null);
  }, [profile?.avatarUrl]);

  const handleBackPress = useCallback(() => {
    if (editingField) {
      if (__DEV__) {
        console.log("[nav] profile details close sheet");
      }
      closeEditSheet();
      return;
    }

    if (__DEV__) {
      console.log("[nav] profile details back to parent");
    }
    router.replace("/profile");
  }, [closeEditSheet, editingField, router]);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBackPress();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [handleBackPress]),
  );

  const handleEditAvatarPress = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setFeedback({
        status: "danger",
        title: "Permission required",
        description: "Allow photo library access to update your profile picture.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      allowsMultipleSelection: false,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selectedPhoto = result.assets[0];
    setIsUploadingAvatar(true);

    try {
      const { compressAvatarToStrictLimit } =
        await import("@/utils/avatar-image-processing");
      const imageBytes = await compressAvatarToStrictLimit(selectedPhoto.uri);
      const nextAvatarUrl = await uploadCurrentUserAvatar({
        imageBytes,
        contentType: "image/webp",
      });

      setAvatarPhoto(selectedPhoto);
      setAvatarUri(nextAvatarUrl);
      await setAvatarUrl(nextAvatarUrl);
      void reload({ forceNetwork: true });
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Failed to upload profile image.";
      setFeedback({
        status: "danger",
        title: "Upload failed",
        description: message,
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const displayName = profile?.fullName ?? "Profile not linked";
  const displayPhone = localPhone ?? profile?.contactNum ?? "No phone on file";
  const displayEmail = localEmail ?? profile?.email ?? "No email on file";
  const displayAddress =
    localAddress ??
    profile?.fullAddress ??
    ([profile?.purokOrStreet, profile?.barangay, profile?.municipality]
      .filter(Boolean)
      .join(", ") ||
      "No address on file");
  const displayAccountNumber = profile?.accountNumber ?? "No account number";
  const displayMeterSerial =
    profile?.meterSerialNum ?? "No meter serial number";
  const displayServiceType = profile?.serviceType ?? "No service type";

  const openEditSheet = (field: EditableField) => {
    setEditingField(field);
    setInputError(null);
    setInputValue("");
    requestAnimationFrame(() => editSheetRef.current?.open());
  };

  const validateInput = (
    field: EditableField,
    value: string,
  ): string | null => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "Please enter a value.";
    }

    if (field === "phone") {
      const phoneDigits = trimmed.replace(/\D/g, "");
      const currentPhoneDigits = (profile?.contactNum ?? "").replace(/\D/g, "");

      if (phoneDigits.length !== 11) {
        return "Phone number must be exactly 11 digits.";
      }

      if (currentPhoneDigits && phoneDigits === currentPhoneDigits) {
        return "New phone number cannot be the same as your current number.";
      }

      return null;
    }

    if (field === "email") {
      const currentEmail = (profile?.email ?? "").trim().toLowerCase();
      const normalizedEmail = trimmed.toLowerCase();

      if (trimmed.length > 50) {
        return "Email must be at most 50 characters.";
      }

      if (!trimmed.includes("@")) {
        return "Email must include '@'.";
      }

      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(trimmed)) {
        return "Please enter a valid email address.";
      }

      if (currentEmail && normalizedEmail === currentEmail) {
        return "New email cannot be the same as your current email.";
      }

      return null;
    }

    return "Address updates will be available soon.";
  };

  const handleSaveUpdate = async () => {
    if (!editingField) {
      return;
    }

    const validationError = validateInput(editingField, inputValue);
    if (validationError) {
      setInputError(validationError);
      return;
    }

    setIsUpdating(true);
    setInputError(null);

    try {
      if (editingField === "phone") {
        setLocalPhone(inputValue.trim().replace(/\D/g, ""));
      }

      if (editingField === "email") {
        setLocalEmail(inputValue.trim());
      }

      if (editingField === "address") {
        setLocalAddress(inputValue.trim());
      }

      closeEditSheet();
    } finally {
      setIsUpdating(false);
    }
  };

  const sheetIcon =
    editingField === "phone"
      ? LucidePhone
      : editingField === "email"
        ? LucideMail
        : LucideMapPin;

  const sheetTitle =
    editingField === "phone"
      ? "Update Phone Number"
      : editingField === "email"
        ? "Update Email"
        : "Update Address";

  const sheetDescription =
    editingField === "phone"
      ? "Enter your new phone number to update your account."
      : editingField === "email"
        ? "Enter your new email address to update your account."
        : "Address update form preview.";

  const SheetIcon = sheetIcon;

  if (!session) {
    return (
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 20,
          paddingBottom: bottomPadding,
        }}
      >
        <View className="gap-3 rounded-lg border border-border bg-card p-6">
          <Heading size="lg">
            Sign in required
          </Heading>
          <Text className="text-sm text-muted-foreground">
            Account details are only available for signed-in users.
          </Text>
          <Button
            onPress={() => {
              router.push("/sign-in");
            }}
          >
            <ButtonText>Sign in</ButtonText>
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          gap: 6,
          paddingBottom: bottomPadding,
        }}
      >
        {/* Identity card mirrors the profile parent: compact, scannable, first-screen useful. */}
        <View className="rounded-lg border border-border bg-card p-5">
          <View className="flex-row items-center gap-4">
            <View style={{ position: "relative" }}>
              <Avatar
                accessibilityLabel="Profile picture"
                className="h-[84px] w-[84px] border-2"
                style={{ borderColor: accentColor }}
              >
                {avatarUri ? <AvatarImage source={{ uri: avatarUri }} /> : null}
                {!avatarUri ? (
                  <AvatarFallbackText className="text-lg font-bold text-muted-foreground">
                      {displayName
                        ?.split(/\s+/)
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"}
                  </AvatarFallbackText>
                ) : null}
              </Avatar>
              <Pressable
                onPress={handleEditAvatarPress}
                disabled={isUploadingAvatar}
                accessibilityRole="button"
                accessibilityLabel="Edit profile picture"
                style={{
                  position: "absolute",
                  right: -3,
                  bottom: -3,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="bg-accent border-2 border-background"
              >
                <LucidePencil size={16} color="white" />
              </Pressable>
            </View>
            <View className="flex-1 gap-1">
              <Heading numberOfLines={2} size="md">
                {isLoading ? "Loading profile..." : displayName}
              </Heading>
              <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                {displayAccountNumber}
              </Text>
              {avatarPhoto ? (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  Selected photo: {avatarPhoto.fileName ?? "avatar.jpg"}
                </Text>
              ) : null}
              {isUploadingAvatar ? (
                <Text className="text-xs text-muted-foreground">
                  Uploading avatar...
                </Text>
              ) : null}
              {error ? (
                <Text className="text-sm text-destructive">
                  {error.message}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {feedback ? (
          <Alert
            className="mt-2"
            variant={feedback.status === "danger" ? "destructive" : "default"}
          >
            <View className="flex-1 gap-1">
              <AlertText className="font-bold">{feedback.title}</AlertText>
              <AlertText>{feedback.description}</AlertText>
            </View>
          </Alert>
        ) : null}

      <ListSection title="Personal details">
        <AccountDetailsBuilder
          icon={LucideUserRound}
          description="Name"
          title={displayName}
        />
        <AccountDetailsBuilder
          icon={LucidePhone}
          description="Phone"
          title={displayPhone}
          button={{
            variant: "secondary",
            name: "Update",
            onPress: () => {
              openEditSheet("phone");
            },
          }}
        />
        <AccountDetailsBuilder
          icon={LucideMail}
          description="Email"
          title={displayEmail}
          button={{
            variant: "secondary",
            name: "Update",
            onPress: () => {
              openEditSheet("email");
            },
          }}
        />
        <AccountDetailsBuilder
          icon={LucideMapPin}
          description="Address"
          title={displayAddress}
          button={{
            variant: "secondary",
            name: "Update",
            onPress: () => {
              openEditSheet("address");
            },
          }}
          showDivider={false}
        />
      </ListSection>

      <ListSection title="Service account">
        <AccountDetailsBuilder
          icon={LucideBookUser}
          description="Account Number"
          title={displayAccountNumber}
        />
        <AccountDetailsBuilder
          icon={LucideGauge}
          description="Meter S/N"
          title={displayMeterSerial}
        />
        <AccountDetailsBuilder
          icon={LucideGauge}
          description="Service Type"
          title={displayServiceType}
          showDivider={false}
        />
      </ListSection>

      </ScrollView>

      <BottomSheet ref={editSheetRef} onClose={resetEditSheet}>
        <BottomSheetPortal
          backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
          enableDynamicSizing
          maxDynamicContentSize={440}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
        >
          <BottomSheetContent>
            <ProfileDetailsSheetContent
              editingField={editingField}
              sheetTitle={sheetTitle}
              sheetDescription={sheetDescription}
              SheetIcon={SheetIcon}
              inputValue={inputValue}
              inputError={inputError}
              currentPhone={profile?.contactNum ?? "No phone on file"}
              currentEmail={profile?.email ?? "No email on file"}
              isUpdating={isUpdating}
              onChangeInput={(nextValue) => {
                setInputError(null);
                setInputValue(nextValue);
              }}
              onCancel={closeEditSheet}
              onSave={() => {
                void handleSaveUpdate();
              }}
            />
          </BottomSheetContent>
        </BottomSheetPortal>
      </BottomSheet>
    </View>
  );
}
