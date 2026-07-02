import { useAuthSession } from "@/hooks/use-auth-session";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";

import {
  Avatar,
  BottomSheet,
  Button,
  Label,
  ListGroup,
  Separator,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
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
  Alert as NativeAlert,
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

export default function ProfileDetailsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accentColor] = useThemeColor(["accent"]);
  const scrollRef = useRef<ScrollView | null>(null);
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

  const closeEditSheet = useCallback(() => {
    Keyboard.dismiss();
    setEditingField(null);
    setInputError(null);
    setInputValue("");
  }, []);

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
      NativeAlert.alert(
        "Permission required",
        "Allow photo library access to update your profile picture.",
      );
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
      NativeAlert.alert("Upload failed", message);
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
        <Surface className="rounded-3xl p-6" style={{ gap: 12 }}>
          <Typography.Heading type="h3" weight="bold">
            Sign in required
          </Typography.Heading>
          <Typography.Paragraph type="body-sm" color="muted">
            Account details are only available for signed-in users.
          </Typography.Paragraph>
          <Button
            variant="primary"
            size="md"
            onPress={() => {
              router.push("/sign-in");
            }}
          >
            <Button.Label>Sign in</Button.Label>
          </Button>
        </Surface>
      </ScrollView>
    );
  }

  return (
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
      <Surface className="items-center justify-center py-10">
        <View style={{ position: "relative" }}>
          <Avatar
            size="lg"
            alt="Profile picture"
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              borderColor: accentColor,
              borderWidth: 3,
            }}
          >
            {avatarUri ? <Avatar.Image source={{ uri: avatarUri }} /> : null}
            {!avatarUri ? (
              <Avatar.Fallback
                style={{ width: 100, height: 100, borderRadius: 50 }}
              >
                <Typography
                  type="h1"
                  weight="bold"
                  style={{ fontSize: 45, fontWeight: "700", color: "#888" }}
                >
                  {displayName
                    ?.split(/\s+/)
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </Typography>
              </Avatar.Fallback>
            ) : null}
          </Avatar>
          <Pressable
            onPress={handleEditAvatarPress}
            disabled={isUploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Edit profile picture"
            style={{
              position: "absolute",
              right: -4,
              bottom: -4,
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
        <Typography.Heading type="h5" weight="bold" className="mt-4">
          {isLoading ? "Loading profile..." : displayName}
        </Typography.Heading>
        {avatarPhoto ? (
          <Typography
            type="body-xs"
            color="muted"
            className="mt-2"
            numberOfLines={1}
          >
            Selected photo: {avatarPhoto.fileName ?? "avatar.jpg"}
          </Typography>
        ) : null}
        {isUploadingAvatar ? (
          <Typography type="body-xs" color="muted" className="mt-2">
            Uploading avatar...
          </Typography>
        ) : null}
        {error ? (
          <Typography.Paragraph type="body-sm" className="mt-2 text-danger">
            {error.message}
          </Typography.Paragraph>
        ) : null}
      </Surface>

      <Label className="mt-3 text-sm text-muted">User Profile</Label>
      <ListGroup>
        <AccountDetailsBuilder
          icon={LucideUserRound}
          description="Name"
          title={displayName}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucidePhone}
          description="Phone"
          title={displayPhone}
          button={{
            variant: "primary",
            name: "Update",
            onPress: () => {
              openEditSheet("phone");
            },
          }}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideMail}
          description="Email"
          title={displayEmail}
          button={{
            variant: "primary",
            name: "Update",
            onPress: () => {
              openEditSheet("email");
            },
          }}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideMapPin}
          description="Address"
          title={displayAddress}
          button={{
            variant: "primary",
            name: "Update",
            onPress: () => {
              openEditSheet("address");
            },
          }}
        />
      </ListGroup>
      <Label className="mt-3 text-sm text-muted">Account Details</Label>

      <ListGroup>
        <AccountDetailsBuilder
          icon={LucideBookUser}
          description="Account Number"
          title={displayAccountNumber}
        ></AccountDetailsBuilder>
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideGauge}
          description="Meter S/N"
          title={displayMeterSerial}
        ></AccountDetailsBuilder>
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideGauge}
          description="Service Type"
          title={displayServiceType}
        ></AccountDetailsBuilder>
      </ListGroup>

      {editingField !== null ? (
        <BottomSheet
          isOpen={editingField !== null}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closeEditSheet();
            }
          }}
        >
          <BottomSheet.Portal>
            <BottomSheet.Overlay />
            <BottomSheet.Content
              keyboardBehavior="interactive"
              keyboardBlurBehavior="restore"
              android_keyboardInputMode="adjustResize"
            >
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
            </BottomSheet.Content>
          </BottomSheet.Portal>
        </BottomSheet>
      ) : null}
    </ScrollView>
  );
}
