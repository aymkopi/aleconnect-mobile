import { useRef, useState } from "react";
import { Linking, View } from "react-native";
import { Camera } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { Avatar } from "@/components/panelui/avatar";
import { FileUpload, type FileUploadFile } from "@/components/panelui/file-upload";
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
          <Photo key={identity.key + ":" + id} identity={identity} serviceAccountId={id} />
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
  const router = useRouter(), current = useProfileTask(identity);
  const [cameraForeground] = useAppColors(["primary-foreground"]);
  const [files, setFiles] = useState<FileUploadFile[]>([]),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [blocked, setBlocked] = useState(false),
    [discard, setDiscard] = useState(false);
  const saving = useRef(false);
  const uri = files[0]?.uri ?? "";
  const accountName = identity.account.accounts.find((account) => account.id === serviceAccountId)?.registeredName ?? "ALECO account";
  const initials = accountName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("");
  function back() {
    if (saving.current) return;
    if (uri && !saved) { setDiscard(true); return; }
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  }
  const allowLeave = useProfileBackGuard(busy || (!!uri && !saved), back);
  async function save() {
    if (saving.current || !uri || !current()) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      if (!identity.fixture) {
        const bytes = await compressAvatarToStrictLimit(uri);
        if (!current()) return;
        await uploadCurrentUserAvatar(
          { imageBytes: bytes, contentType: "image/webp" },
          { serviceAccountId, accessRevision: identity.account.accessRevision },
        );
        if (!current()) return;
        await clearConsumerProfileCaches();
      }
      if (current()) setSaved(true);
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : "Your current photo is unchanged. Retry the upload.");
    } finally {
      saving.current = false;
      if (current()) setBusy(false);
    }
  }
  const changeFiles = (next: FileUploadFile[]) => {
    if (saving.current || !current()) return;
    setFiles(next);
    setSaved(false);
    setError("");
    setBlocked(false);
  };
  return (
    <FileUpload
      value={files}
      onValueChange={changeFiles}
      sources={["camera", "library"]}
      accept={["image/*"]}
      image={{ quality: 1, crop: { aspect: [1, 1] } }}
      disabled={busy}
      onError={(e) => { if (current()) { setError(e.message); setBlocked(/permission/i.test(e.message)); } }}
      onReject={(rejections) => { if (current()) setError(rejections.map((entry) => entry.message).join(" ")); }}
    >
      <ReportPage title="Profile photo" onBack={back} footer={
        uri ? <Button loading={busy} onPress={() => saved ? router.dismissTo("/profile") : void save()}>{saved ? "Back to Account" : "Save photo"}</Button> : undefined
      }>
        <ProfileHeading title={saved ? "Profile photo updated" : uri ? "Preview your photo" : "Choose a profile photo"} />
        <View className="gap-4 items-center rounded-xl bg-card p-4">
          <Avatar size="xl" className="self-center" source={uri ? { uri } : undefined} fallback={initials} accessibilityLabel={uri ? "Selected profile photo" : accountName}>
            <Avatar.Badge style={{ top: "auto", bottom: -4 }}>
              <FileUpload.Trigger>
                <Button size="icon" className="h-9 w-9 rounded-full" hitSlop={6} disabled={busy} accessibilityLabel="Change profile photo">
                  <Camera size={18} color={cameraForeground} />
                </Button>
              </FileUpload.Trigger>
            </Avatar.Badge>
          </Avatar>
          {uri && !saved ? <Button variant="ghost" disabled={busy} onPress={() => changeFiles([])}>Remove selected photo</Button> : null}
          <Text muted size="sm">{saved ? "Your new photo was saved." : "Choose a photo and crop it square before saving."}</Text>
        </View>
        <Text size="sm" muted>Your current photo stays until the upload succeeds. This photo does not change ALECO account ownership.</Text>
        {error ? <ProfileNotice title="Photo could not be updated" description={error} danger /> : null}
        {blocked ? <Button variant="outline" onPress={() => void Linking.openSettings().catch(() => setError("Open your device settings to allow photo access."))}>Open device settings</Button> : null}
      </ReportPage>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Discard selected photo?</Dialog.Title>
          <Dialog.Description>Your current profile photo has not changed.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>Keep photo</Button>
            <Button variant="destructive" onPress={() => { allowLeave(); setFiles([]); router.dismissTo("/profile"); }}>Discard</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </FileUpload>
  );
}
