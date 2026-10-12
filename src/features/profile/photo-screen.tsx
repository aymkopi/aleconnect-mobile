import { useState } from "react";
import { Image, Linking, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Images } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { compressAvatarToStrictLimit } from "@/utils/avatar-image-processing";
import { uploadCurrentUserAvatar } from "@/services/profile";
import { clearConsumerProfileCaches } from "@/hooks/use-consumer-profile";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  ProfileGate,
  ProfileHeading,
  ProfileNotice,
  useProfileTask,
  useProfileBackGuard,
  type ProfileIdentity,
} from "./profile-ui";
export default function PhotoScreen() {
  const { serviceAccountId } = useLocalSearchParams<{ serviceAccountId?: string }>();
  return (
    <ProfileGate>
      {(identity) => {
        const id =
          typeof serviceAccountId === "string"
            ? serviceAccountId
            : identity.account.defaultServiceAccountId;
        return identity.account.authorizedServiceAccountIds.includes(id) ? (
          <Photo key={id} identity={identity} serviceAccountId={id} />
        ) : (
          <ReportPage title="Profile photo">
            <ProfileNotice
              title="Account unavailable"
              description="This account is not linked to your current profile."
              danger
            />
          </ReportPage>
        );
      }}
    </ProfileGate>
  );
}
function Photo({
  identity,
  serviceAccountId,
}: {
  identity: ProfileIdentity;
  serviceAccountId: string;
}) {
  const router = useRouter(),
    current = useProfileTask(identity),
    [primary] = useAppColors(["primary"]);
  const [uri, setUri] = useState(""),
    [sheet, setSheet] = useState(true),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [blocked, setBlocked] = useState(false),
    [discard, setDiscard] = useState(false);
  function back() {
    if (busy) return;
    if (uri && !saved) {
      setDiscard(true);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  }
  const allowLeave = useProfileBackGuard(busy || (!!uri && !saved), back);
  async function pick(camera: boolean) {
    if (busy) return;
    setError("");
    if (identity.fixture) {
      setSheet(false);
      setUri("fixture-photo");
      return;
    }
    setBusy(true);
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!current()) return;
      if (!permission.granted) {
        setBlocked(!permission.canAskAgain);
        setError(
          "Allow " + (camera ? "camera" : "photo library") + " access to choose a profile photo.",
        );
        return;
      }
      const result = await (
        camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync
      )({
        mediaTypes: ["images"],
        allowsEditing: true,
        allowsMultipleSelection: false,
        aspect: [1, 1],
        quality: 1,
      });
      if (current() && !result.canceled && result.assets?.[0]) {
        setUri(result.assets[0].uri);
        setSheet(false);
      }
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : "The photo picker could not open.");
    } finally {
      if (current()) setBusy(false);
    }
  }
  async function save() {
    if (busy || !uri) return;
    setBusy(true);
    setError("");
    try {
      if (!identity.fixture) {
        const bytes = await compressAvatarToStrictLimit(uri);
        if (!current()) return;
        await uploadCurrentUserAvatar(
          { imageBytes: bytes, contentType: "image/webp" },
          {
            serviceAccountId,
            accessRevision: identity.account.accessRevision,
          },
        );
        if (!current()) return;
        await clearConsumerProfileCaches();
      }
      if (current()) setSaved(true);
    } catch (e) {
      if (current())
        setError(
          e instanceof Error ? e.message : "Your current photo is unchanged. Retry the upload.",
        );
    } finally {
      if (current()) setBusy(false);
    }
  }
  return (
    <>
      <ReportPage
        title="Profile photo"
        onBack={back}
        footer={
          uri ? (
            <>
              <Button
                loading={busy}
                onPress={() => (saved ? router.replace("/profile") : void save())}
              >
                {saved ? "Back to Account" : "Save photo"}
              </Button>
              {!saved ? (
                <Button variant="outline" disabled={busy} onPress={() => setSheet(true)}>
                  Choose another photo
                </Button>
              ) : null}
            </>
          ) : (
            <Button onPress={() => setSheet(true)}>Choose a photo</Button>
          )
        }
      >
        <ProfileHeading
          title={
            saved ? "Profile photo updated" : uri ? "Preview your photo" : "Choose a profile photo"
          }
        />
        {uri ? (
          <View className="gap-3 rounded-xl border border-border bg-card p-4">
            <Image
              accessibilityLabel="Selected profile photo"
              source={identity.fixture ? require("@/assets/aleconnect/mayon.jpeg") : { uri }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
            <Text size="sm" weight="semibold">
              Selected photo
            </Text>
            <Text size="sm" muted>
              {saved
                ? "Your new photo was saved."
                : "Review the crop from your device picker before uploading."}
            </Text>
          </View>
        ) : null}
        <Text size="sm" muted>
          Your current photo stays until the upload succeeds. This photo does not change ALECO
          account ownership.
        </Text>
        {error ? (
          <ProfileNotice title="Photo could not be updated" description={error} danger />
        ) : null}
        {blocked ? (
          <Button
            variant="outline"
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setError("Open your device settings to allow photo access."),
              )
            }
          >
            Open device settings
          </Button>
        ) : null}
      </ReportPage>
      <BottomSheet open={sheet} onOpenChange={(v) => !busy && setSheet(v)}>
        <BottomSheet.Content>
          <BottomSheet.Header>
            <Text size="lg" weight="semibold">
              Choose a profile photo
            </Text>
          </BottomSheet.Header>
          <BottomSheet.Body className="gap-3">
            <Button
              variant="outline"
              startContent={<Camera size={18} color={primary} />}
              disabled={busy}
              onPress={() => void pick(true)}
            >
              Take a photo
            </Button>
            <Button
              variant="outline"
              startContent={<Images size={18} color={primary} />}
              onPress={() => void pick(false)}
            >
              Choose from library
            </Button>
            <Text size="sm" muted>
              Move and crop your photo in the device picker before saving.
            </Text>
            {error ? (
              <Text size="sm" className="text-destructive">
                {error}
              </Text>
            ) : null}
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button variant="outline" disabled={busy} onPress={() => setSheet(false)}>
              Cancel
            </Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Discard selected photo?</Dialog.Title>
          <Dialog.Description>Your current profile photo has not changed.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Keep photo
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                allowLeave();
                setUri("");
                router.replace("/profile");
              }}
            >
              Discard
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
