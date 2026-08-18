import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetPortal,
  BottomSheetScrollView,
  type BottomSheetRef,
} from "@/components/ui/bottomsheet";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection } from "@/components/ui/list-section";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { AlbayLocationPickerSheet } from "@/features/maps/albay-location-picker-sheet";
import { AccountDetailsBuilder } from "@/features/profile/components/AccountDetailsBuilder";
import {
  ProfileAddressSheetContent,
  type ProfileAddressDraft,
} from "@/features/profile/components/ProfileAddressSheetContent";
import { ProfileAvatar } from "@/features/profile/components/ProfileAvatar";
import {
  EditableField,
  ProfileDetailsSheetContent,
} from "@/features/profile/components/ProfileDetailsSheetContent";
import {
  LucideBookUser,
  LucideGauge,
  LucideMail,
  LucideMapPin,
  LucidePencil,
  LucidePhone,
  LucideSheet,
  LucideUserRound,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  emptyComplaintMeta,
  type ComplaintMeta,
} from "@/features/reports/data";
import {
  updateCurrentConsumerAddress,
  updateCurrentConsumerProfile,
  uploadCurrentUserAvatar,
} from "@/services/profile";
import { fetchComplaintMeta } from "@/services/reports";
import { useConsumerProfileContext } from "../../../context/consumer-profile-context";

type FeedbackMessage = {
  title: string;
  description: string;
  status: "danger" | "success" | "accent";
};

const emptyAddressDraft: ProfileAddressDraft = {
  municipalityCode: "",
  barangayPsgc: "",
  purokOrStreet: "",
  landmark: "",
  latitude: null,
  longitude: null,
};

function readProfileCoordinates(
  value: Record<string, unknown> | null | undefined,
) {
  const latitude = Number(value?.lat ?? value?.latitude);
  const longitude = Number(value?.lng ?? value?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

export default function ProfileDetailsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accentColor, accentForegroundColor] = useAppColors([
    "accent",
    "accent-foreground",
  ]);
  const scrollRef = useRef<ScrollView | null>(null);
  const editSheetRef = useRef<BottomSheetRef>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const bottomPadding = Math.max(insets.bottom, 16) + 24;
  const { session } = useAuthSession();
  const { profile, isLoading, error, reload, setAvatarUrl, setProfileView } =
    useConsumerProfileContext();
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarPhoto, setAvatarPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(
    () => profile?.avatarUrl ?? null,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [complaintMeta, setComplaintMeta] =
    useState<ComplaintMeta>(emptyComplaintMeta);
  const [addressDraft, setAddressDraft] =
    useState<ProfileAddressDraft>(emptyAddressDraft);
  const [isAddressMapOpen, setIsAddressMapOpen] = useState(false);

  const resetEditSheet = useCallback(() => {
    setEditingField(null);
    setInputError(null);
    setInputValue("");
  }, []);

  const handleEditSheetClosed = useCallback(() => {
    setIsEditSheetOpen(false);
    resetEditSheet();
  }, [resetEditSheet]);

  const closeEditSheet = useCallback(() => {
    Keyboard.dismiss();
    handleEditSheetClosed();
  }, [handleEditSheetClosed]);

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
        description:
          "Allow photo library access to update your profile picture.",
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
  const displayPhone = profile?.contactNum ?? "No phone on file";
  const displayEmail = profile?.email ?? "No email on file";
  const displayAddress =
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
    if (field === "address") {
      const coordinates = readProfileCoordinates(profile?.homeCoordinates);
      setAddressDraft({
        municipalityCode: profile?.municipalityCode ?? "",
        barangayPsgc: profile?.barangayPsgc ?? "",
        purokOrStreet: profile?.purokOrStreet ?? "",
        landmark: profile?.landmark ?? "",
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      });
      void fetchComplaintMeta()
        .then((meta) => {
          setComplaintMeta(meta);
          setAddressDraft((current) => {
            if (current.municipalityCode && current.barangayPsgc)
              return current;
            const municipality = meta.municipalities.find(
              (item) =>
                item.name.trim().toLowerCase() ===
                profile?.municipality?.trim().toLowerCase(),
            );
            const barangay = meta.barangays.find(
              (item) =>
                item.municipalityCode === municipality?.code &&
                item.name.trim().toLowerCase() ===
                  profile?.barangay?.trim().toLowerCase(),
            );
            return {
              ...current,
              municipalityCode:
                current.municipalityCode || municipality?.code || "",
              barangayPsgc: current.barangayPsgc || barangay?.code || "",
            };
          });
        })
        .catch((nextError) => {
          setInputError(
            nextError instanceof Error
              ? nextError.message
              : "Location choices could not be loaded.",
          );
        });
    }
    setIsEditSheetOpen(true);
  };
  useEffect(() => {
    if (!isEditSheetOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      editSheetRef.current?.open();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isEditSheetOpen]);

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

    if (trimmed.length > 100) {
      return "Purok or street must be at most 100 characters.";
    }

    if (
      profile?.purokOrStreet?.trim().toLowerCase() === trimmed.toLowerCase()
    ) {
      return "New purok or street cannot be the same as your current address.";
    }

    return null;
  };

  const handleSaveUpdate = async () => {
    if (!editingField) {
      return;
    }

    if (editingField === "address") {
      if (!addressDraft.municipalityCode) {
        setInputError("Select a municipality.");
        return;
      }
      if (!addressDraft.barangayPsgc) {
        setInputError("Select a barangay.");
        return;
      }
      if (!addressDraft.purokOrStreet.trim()) {
        setInputError("Enter a purok or street.");
        return;
      }
      if (addressDraft.latitude == null || addressDraft.longitude == null) {
        setInputError("Choose the service location on the map.");
        return;
      }

      setIsUpdating(true);
      setInputError(null);
      try {
        const updatedProfile = await updateCurrentConsumerAddress({
          ...addressDraft,
          purokOrStreet: addressDraft.purokOrStreet.trim(),
          landmark: addressDraft.landmark.trim(),
          latitude: addressDraft.latitude,
          longitude: addressDraft.longitude,
        });
        await setProfileView(updatedProfile);
        closeEditSheet();
        setFeedback({
          status: "success",
          title: "Profile updated",
          description: "Address was saved.",
        });
      } catch (nextError) {
        setInputError(
          nextError instanceof Error
            ? nextError.message
            : "Address update failed.",
        );
      } finally {
        setIsUpdating(false);
      }
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
      const value =
        editingField === "phone"
          ? inputValue.trim().replace(/\D/g, "")
          : inputValue.trim();
      const updatedProfile = await updateCurrentConsumerProfile(
        editingField,
        value,
      );
      await setProfileView(updatedProfile);
      closeEditSheet();
      setFeedback({
        status: "success",
        title: "Profile updated",
        description: `${sheetTitle.replace("Update ", "")} was saved.`,
      });
    } catch (nextError) {
      setInputError(
        nextError instanceof Error
          ? nextError.message
          : "Profile update failed.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

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
        : "Update the purok or street saved to your account.";

  if (!session) {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: false }} />
        <ChildAppBar
          title="Account"
          description="Personal and service details"
          onBack={handleBackPress}
          backAccessibilityLabel="Back to profile"
        />
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1 bg-background"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 20,
            paddingTop: 8,
            paddingBottom: bottomPadding,
          }}
        >
          <View className="gap-3 rounded-lg border border-border bg-card p-6">
            <Heading size="lg">Sign in required</Heading>
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
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ChildAppBar
        title="Account"
        description="Personal and service details"
        onBack={handleBackPress}
        backAccessibilityLabel="Back to profile"
      />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          gap: 6,
          paddingBottom: bottomPadding,
        }}
      >
        {/* Identity card mirrors the profile parent: compact, scannable, first-screen useful. */}
        <View className="rounded-lg border border-border bg-card p-5">
          <View className="flex-row items-center gap-4">
            <View style={{ position: "relative" }}>
              <ProfileAvatar
                accessibilityLabel="Profile picture"
                className="h-[84px] w-[84px] border-2"
                fallback={
                  displayName
                    ?.split(/\s+/)
                    .filter(Boolean)
                    .map((name) => name[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"
                }
                fallbackClassName="text-lg font-bold text-muted-foreground"
                style={{ borderColor: accentColor }}
                uri={avatarUri}
              />
              <Pressable
                onPress={handleEditAvatarPress}
                disabled={isUploadingAvatar}
                accessibilityRole="button"
                accessibilityLabel="Edit profile picture"
                style={{
                  position: "absolute",
                  right: -3,
                  bottom: -3,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="bg-accent border-2 border-background"
              >
                <LucidePencil size={17} color={accentForegroundColor} />
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
                <Text
                  className="text-xs text-muted-foreground"
                  numberOfLines={1}
                >
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
            icon={LucideSheet}
            description="Service Type"
            title={displayServiceType}
            showDivider={false}
          />
        </ListSection>
      </ScrollView>

      {isEditSheetOpen ? (
        <BottomSheet ref={editSheetRef} onClose={handleEditSheetClosed}>
          <BottomSheetPortal
            backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
            enableDynamicSizing
            keyboardBehavior="interactive"
            enablePanDownToClose={false}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              {editingField === "address" ? (
                <ProfileAddressSheetContent
                  value={addressDraft}
                  meta={complaintMeta}
                  error={inputError}
                  currentAddress={displayAddress}
                  isUpdating={isUpdating}
                  onChange={(value) => {
                    setInputError(null);
                    setAddressDraft(value);
                  }}
                  onOpenMap={() => setIsAddressMapOpen(true)}
                  onCancel={closeEditSheet}
                  onSave={() => void handleSaveUpdate()}
                />
              ) : (
                <ProfileDetailsSheetContent
                  editingField={editingField}
                  sheetTitle={sheetTitle}
                  sheetDescription={sheetDescription}
                  inputValue={inputValue}
                  inputError={inputError}
                  currentPhone={profile?.contactNum ?? "No phone on file"}
                  currentEmail={profile?.email ?? "No email on file"}
                  currentAddress={displayAddress}
                  isUpdating={isUpdating}
                  onChangeInput={(nextValue) => {
                    setInputError(null);
                    setInputValue(nextValue);
                  }}
                  onCancel={closeEditSheet}
                  onSave={() => void handleSaveUpdate()}
                />
              )}
            </BottomSheetScrollView>
          </BottomSheetPortal>
        </BottomSheet>
      ) : null}

      <AlbayLocationPickerSheet
        open={isAddressMapOpen}
        initialCoordinates={
          addressDraft.latitude != null && addressDraft.longitude != null
            ? {
                latitude: addressDraft.latitude,
                longitude: addressDraft.longitude,
              }
            : null
        }
        meta={complaintMeta}
        onClose={() => setIsAddressMapOpen(false)}
        onConfirm={({ coordinates, address }) => {
          setAddressDraft((current) => ({
            ...current,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            municipalityCode: address.municipalityCode,
            barangayPsgc: address.barangayPsgc,
            purokOrStreet: address.purok || current.purokOrStreet,
          }));
          setInputError(null);
          setIsAddressMapOpen(false);
        }}
      />
    </View>
  );
}
