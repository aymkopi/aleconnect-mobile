import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import * as ImagePicker from "expo-image-picker";
import {
  Avatar,
  Button,
  ListGroup,
  Separator,
  Surface,
  useThemeColor,
} from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import {
  LucideBookUser,
  LucideGauge,
  LucideMail,
  LucideMapPin,
  LucidePencil,
  LucidePhone,
  LucideUserRound,
} from "lucide-react-native";
import { useState, type ComponentProps } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useConsumerProfileContext } from "../../../context/consumer-profile-context";

type AccountDetailsBuilderProps = {
  icon: LucideIcon;
  description: string;
  title: string;
  button?: {
    variant: ComponentProps<typeof Button>["variant"];
    size: ComponentProps<typeof Button>["size"];
    name: string;
    onPress: () => void;
  } | null;
};

export function AccountDetailsBuilder({
  icon: Icon,
  description,
  title,
  button = null,
}: AccountDetailsBuilderProps) {
  const [accentIconColor] = useThemeColor(["accent"]);
  return (
    <ListGroup.Item>
      <ListGroup.ItemPrefix>
        <Icon size={20} color={accentIconColor} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemDescription className="tracking-wide text-xs uppercase">
          {description}
        </ListGroup.ItemDescription>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      {button ? (
        <ListGroup.ItemSuffix>
          <Button
            feedbackVariant="scale-highlight"
            variant={button.variant}
            size={button.size}
            onPress={button.onPress}
          >
            <Button.Label>{button.name}</Button.Label>
          </Button>
        </ListGroup.ItemSuffix>
      ) : null}
    </ListGroup.Item>
  );
}

export default function ProfileDetailsRoute() {
  const insets = useSafeAreaInsets();
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const { profile, isLoading, error } = useConsumerProfileContext();
  const [avatarPhoto, setAvatarPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const handleEditAvatarPress = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
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
    setAvatarPhoto(selectedPhoto);
    setAvatarUri(selectedPhoto.uri);
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

  return (
    <ScrollView
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
            }}
          >
            {avatarUri ? <Avatar.Image source={{ uri: avatarUri }} /> : null}
          </Avatar>
          <Pressable
            onPress={handleEditAvatarPress}
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
        <Text className="text-lg font-bold text-foreground mt-4">
          {isLoading ? "Loading profile..." : displayName}
        </Text>
        {avatarPhoto ? (
          <Text className="text-xs text-muted mt-2" numberOfLines={1}>
            Selected photo: {avatarPhoto.fileName ?? "avatar.jpg"}
          </Text>
        ) : null}
        {error ? (
          <Text className="text-sm text-danger mt-2">{error.message}</Text>
        ) : null}
      </Surface>

      <Text className="text-sm mt-3 text-muted">User Details</Text>
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
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideMail}
          description="Email"
          title={displayEmail}
          button={{
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideMapPin}
          description="Address"
          title={displayAddress}
          button={{
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
      </ListGroup>
      <Text className="text-sm mt-3 text-muted">Account Details</Text>

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
    </ScrollView>
  );
}
