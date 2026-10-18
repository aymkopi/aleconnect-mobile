import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import {
  type Href,
  useLocalSearchParams,
  useRouter,
  useFocusEffect,
  useNavigation,
} from "expo-router";
import { Camera, Mail, MapPin, Phone, X } from "lucide-react-native";
import { Avatar } from "@/components/panelui/avatar";
import { FileUpload, type FileUploadFile } from "@/components/panelui/file-upload";
import { Button } from "@/components/panelui/button";
import { Dialog } from "@/components/panelui/dialog";
import { Field } from "@/components/panelui/field";
import { Select } from "@/components/panelui/select";
import { Text } from "@/components/panelui/text";
import { DataState, DataNotice } from "@/components/data-state";
import { ReportPage } from "@/features/reports/components/report-page";
import { ReportLocationPicker } from "@/features/maps/report-location-picker";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import { setDefaultLinkedAccount } from "@/services/linked-accounts";
import { getAuthToken } from "@/services/api";
import { clearConsumerProfileCaches } from "@/hooks/use-consumer-profile";
import {
  fetchCurrentConsumerProfileView,
  updateVerifiedConsumerDetails,
  uploadCurrentUserAvatar,
  type ConsumerProfileScope,
  type StructuredProfileAddressInput,
} from "@/services/profile";
import { fetchComplaintMeta } from "@/services/reports";
import { creationFixtureMeta } from "@/features/reports/creation-fixtures";
import { emptyComplaintMeta } from "@/features/reports/data";
import { readReportCoordinates } from "@/features/reports/address";
import { isWithinAlbay } from "@/features/reports/contract";
import { compressAvatarToStrictLimit } from "@/utils/avatar-image-processing";
import { formatAccountClass } from "@/lib/account-class";
import {
  ProfileGate,
  ProfileHeading,
  ProfileNotice,
  ProfileField,
  DetailRow,
  useProfileTask,
  type ProfileIdentity,
} from "./profile-ui";
import { fixtureProfile } from "./profile-fixtures";
import { accountProfileIdentifier, profileEditAllowed, validateProfileDraft } from "./profile-state";
export default function ProfileDetailsScreen() {
  const params = useLocalSearchParams<{ serviceAccountId?: string; state?: string; edit?: string }>();
  return (
    <ProfileGate>
      {(identity) => (
        <Details
          key={identity.key + ":" + (params.serviceAccountId ?? identity.account.defaultServiceAccountId)}
          identity={identity}
          initialEdit={params.edit === "1"}
          requested={
            typeof params.serviceAccountId === "string" ? params.serviceAccountId : undefined
          }
          locked={identity.fixture && params.state === "locked"}
        />
      )}
    </ProfileGate>
  );
}
function Details({
  identity,
  requested,
  locked,
  initialEdit = false,
}: {
  identity: ProfileIdentity;
  requested?: string;
  locked: boolean;
  initialEdit?: boolean;
}) {
  const { refreshConsumerAccount } = useConsumerAccount();
  const [primary, cameraForeground, foreground] = useAppColors(["primary", "primary-foreground", "foreground"]);
  const { session } = useAuthSession();
  const [defaultDialog, setDefaultDialog] = useState(false), [defaultSaved, setDefaultSaved] = useState(false);
  const router = useRouter(),
    navigation = useNavigation(),
    current = useProfileTask(identity);
  const id = requested ?? identity.account.defaultServiceAccountId,
    available = identity.account.authorizedServiceAccountIds.includes(id);
  const scope: ConsumerProfileScope = {
    serviceAccountId: id,
    accessRevision: identity.account.accessRevision,
  };
  const read = useScopedRead(available ? identity.key + ":" + id : null, () =>
    identity.fixture
      ? Promise.resolve(fixtureProfile(id, locked))
      : fetchCurrentConsumerProfileView(scope),
  );
  const { reload: refreshDetails } = read;
  const [view, setView] = useState<"info" | "edit" | "location" | "review" | "saved">("info"),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [files, setFiles] = useState<FileUploadFile[]>([]),
    [photoBlocked, setPhotoBlocked] = useState(false),
    [savedAvatar, setSavedAvatar] = useState<string | null>(null),
    [baseline, setBaseline] = useState({ phone: "", email: "", fullAddress: "" });
  const saving = useRef(false), editRequested = useRef(initialEdit), photoGeneration = useRef(0);
  const [pickerGeneration, setPickerGeneration] = useState(0);
  const uri = files[0]?.uri ?? "";
  const [address, setAddress] = useState<StructuredProfileAddressInput | null>(null),
    [meta, setMeta] = useState(emptyComplaintMeta),
    [map, setMap] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false),
    [help, setHelp] = useState(false);
  const profile = read.data;
  const identifier = accountProfileIdentifier(identity.account.accounts.length,
    identity.fixture ? "justine@example.com" : session?.user.email, profile?.accountNumber) ?? "Account details unavailable";
  const serviceEmail = profile?.serviceAccountEmail ??
    (identity.account.sessionMode !== "identity" ? profile?.email : "") ?? "";
  const emailEditable = profile?.serviceAccountEmailEditable === true ||
    (profile?.emailEditable === true && identity.account.sessionMode !== "identity");
  const detailsChanged = Boolean(
    profile &&
    (phone.replace(/\D/g, "") !== baseline.phone ||
      (emailEditable && email.trim().toLowerCase() !== baseline.email.toLowerCase()) ||
      address),
  );
  const changes = detailsChanged || Boolean(uri);
  const exit = useCallback(() => {
    if (busy) return;
    setPassword("");
    if (view === "location") {
      setView("edit");
      return;
    }
    if (view === "review") {
      setView("edit");
      return;
    }
    if (view === "edit" && changes) {
      setDiscard(true);
      return;
    }
    if (view === "saved") {
      setView("info");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  }, [busy, changes, router, view]);
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (busy || view === "location" || view === "review" || (view === "edit" && changes)) {
        event.preventDefault();
        if (!busy) exit();
      }
    });
    return unsubscribe;
  }, [navigation, busy, view, changes, exit]);
  useFocusEffect(
    useCallback(() => {
      void refreshDetails(true);
      return () => { photoGeneration.current++; setPassword(""); };
    }, [refreshDetails]),
  );
  const startEdit = () => {
    if (!profileEditAllowed(profile?.profileEditing)) return;
    photoGeneration.current++;
    setPickerGeneration(photoGeneration.current);
    setPhone(profile?.contactNum ?? "");
    setEmail(serviceEmail);
    setBaseline({ phone: profile?.contactNum ?? "", email: serviceEmail, fullAddress: profile?.fullAddress ?? "" });
    setFiles([]);
    setPhotoBlocked(false);
    setAddress(null);
    setError("");
    setView("edit");
  };
  useEffect(() => {
    if (!editRequested.current || !profile || read.busy || read.error) return;
    editRequested.current = false;
    startEdit();
    // This is a one-shot compatibility entry; refreshed data must not reset drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, read.busy, read.error]);
  const photoCurrent = () => !saving.current && current() && view === "edit" &&
    pickerGeneration === photoGeneration.current;
  const changeFiles = (next: FileUploadFile[]) => {
    if (!photoCurrent()) return;
    setFiles(next); setPhotoBlocked(false); setError("");
  };
  const openLocation = async () => {
    setError("");
    setView("location");
    try {
      const m = identity.fixture ? creationFixtureMeta : await fetchComplaintMeta();
      if (current()) setMeta(m);
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : "Address choices could not load.");
    }
  };
  const [locationDraft, setLocationDraft] = useState({
    municipalityCode: "",
    barangayPsgc: "",
    purokOrStreet: "",
    landmark: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const location = () => {
    const point = readReportCoordinates(profile?.homeCoordinates);
    setLocationDraft(
      address ?? {
        municipalityCode: profile?.municipalityCode ?? "",
        barangayPsgc: profile?.barangayPsgc ?? "",
        purokOrStreet: profile?.purokOrStreet ?? "",
        landmark: profile?.landmark ?? "",
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
      },
    );
    void openLocation();
  };
  const addressText = (a: typeof locationDraft) =>
    [
      a.purokOrStreet,
      meta.barangays.find((b) => b.code === a.barangayPsgc)?.name,
      meta.municipalities.find((m) => m.code === a.municipalityCode)?.name,
      a.landmark,
    ]
      .filter(Boolean)
      .join(", ");
  async function save() {
    if (saving.current || !profile || !changes || !current() || (detailsChanged && !password)) return;
    saving.current = true;
    setBusy(true);
    setError("");
    const secret = password;
    const reviewed = {
      ...(phone.replace(/\D/g, "") !== baseline.phone
        ? { phone: phone.replace(/\D/g, "") }
        : {}),
      ...(emailEditable && email.trim().toLowerCase() !== baseline.email.toLowerCase()
        ? profile.serviceAccountEmailEditable
          ? { serviceAccountEmail: email.trim().toLowerCase() }
          : { email: email.trim().toLowerCase() }
        : {}),
      ...(address ? { address } : {}),
    };
    let detailsSaved = false, committed = false;
    setPassword("");
    try {
      const authToken = identity.fixture ? null : await getAuthToken();
      if (!current()) return;
      if (!identity.fixture && !authToken) throw new Error("Sign in again to save your changes.");
      const bytes = uri && !identity.fixture ? await compressAvatarToStrictLimit(uri) : null;
      if (!current()) return;
      if (!identity.fixture) {
        const fresh = await fetchCurrentConsumerProfileView(scope, authToken);
        if (!current()) return;
        if (!profileEditAllowed(fresh?.profileEditing)) {
          await read.reload(true);
          setView("info");
          throw new Error(
            "Secure editing is unavailable. Refresh account access before saving.",
          );
        }
        if (detailsChanged) {
          await updateVerifiedConsumerDetails(reviewed, secret, scope, authToken);
          committed = true;
        }
      }
      if (!current()) return;
      if (detailsChanged) {
        detailsSaved = true;
        setBaseline({ phone: phone.replace(/\D/g, ""), email: email.trim().toLowerCase(),
          fullAddress: address ? addressText(address) : baseline.fullAddress });
        setAddress(null);
      }
      if (uri) {
        const avatarUrl = identity.fixture ? uri : await uploadCurrentUserAvatar(
          { imageBytes: bytes!, contentType: "image/webp" }, scope, authToken,
        );
        committed = true;
        if (!current()) return;
        setSavedAvatar(avatarUrl);
        setFiles([]);
      }
      if (current()) {
        setView("saved");
      }
    } catch (e) {
      if (current()) {
        const message = e instanceof Error ? e.message : "Could not save. Please try again.";
        setError(detailsSaved ? "Details saved. Your photo was not updated. " + message : message);
        if (detailsSaved) setView("edit");
      }
    } finally {
      if (committed && current()) {
        await clearConsumerProfileCaches().catch(() => {});
        if (current()) await read.reload(true);
      }
      saving.current = false;
      if (current()) setBusy(false);
    }
  }
  async function makeDefault() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (!identity.fixture) {
        await setDefaultLinkedAccount(id, identity.account.accessRevision);
        if (!current()) return;
        await clearConsumerProfileCaches();
        await refreshConsumerAccount();
      }
      if (current()) { setDefaultSaved(true); setDefaultDialog(false); }
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : "Could not change the default account."); }
    finally { if (current()) setBusy(false); }
  }
  const title = {
    info: "Account information",
    edit: "Edit profile",
    location: "Update location",
    review: "Review & verify",
    saved: "Details updated",
  }[view];
  const footer = !available ? null : view === "info" ? (
    <Button
      disabled={
        !profile || read.busy || !!read.error || !profileEditAllowed(profile.profileEditing)
      }
      onPress={startEdit}
    >
      Edit profile
    </Button>
  ) : view === "edit" ? (
    <Button
      disabled={!changes}
      onPress={() => {
        const problem = detailsChanged ? validateProfileDraft({ phone, email }, emailEditable) : null;
        if (problem) setError(problem);
        else {
          setError("");
          setView("review");
        }
      }}
    >
      Review changes
    </Button>
  ) : view === "location" ? (
    <Button
      onPress={() => {
        const d = locationDraft;
        if (
          !d.municipalityCode ||
          !d.barangayPsgc ||
          !d.purokOrStreet.trim() ||
          d.latitude === null ||
          d.longitude === null ||
          !isWithinAlbay(d.latitude, d.longitude)
        ) {
          setError("Choose a complete address and confirm its pin within Albay.");
          return;
        }
        setAddress({
          ...d,
          purokOrStreet: d.purokOrStreet.trim(),
          landmark: d.landmark.trim(),
          latitude: d.latitude,
          longitude: d.longitude,
        });
        setView("edit");
        setError("");
      }}
    >
      Use this address
    </Button>
  ) : view === "review" ? (
    <Button loading={busy} disabled={detailsChanged && !password} onPress={() => void save()}>
      {detailsChanged ? "Verify & save" : "Save photo"}
    </Button>
  ) : (
    <Button
      onPress={() => {
        setView("info");
        void read.reload(true);
      }}
    >
      Back to account information
    </Button>
  );
  return (
    <FileUpload key={pickerGeneration} value={files} onValueChange={changeFiles} sources={["camera", "library"]}
      accept={["image/*"]} image={{ quality: 1, crop: { aspect: [1, 1] } }} disabled={busy || view !== "edit"}
      onError={(e) => { if (photoCurrent()) { setError(e.message); setPhotoBlocked(/permission/i.test(e.message)); } }}
      onReject={(rejections) => { if (photoCurrent()) setError(rejections.map((item) => item.message).join(" ")); }}>
      <Dialog open={defaultDialog} onOpenChange={setDefaultDialog}>
        <Dialog.Content><View className="gap-2"><Dialog.Title>Set as default account?</Dialog.Title>
          <Dialog.Description>Use this account for new activity. Existing reports keep their original account.</Dialog.Description></View>
          <Dialog.Footer><Button variant="outline" disabled={busy} onPress={() => setDefaultDialog(false)}>Cancel</Button>
            <Button loading={busy} onPress={() => void makeDefault()}>Set default</Button></Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      <ReportPage title={title} onBack={exit} footer={profile ? footer : undefined}>
        {!available ? (
          <ProfileNotice
            title="Account unavailable"
            description="This service account is no longer linked to your profile."
            danger
          />
        ) : read.busy && !profile ? (
          <DataState loading loadingLayout="profile" title="Loading your account information" />
        ) : !profile ? (
          <DataState title="Your details couldn’t load" description="Reconnect and retry. Editing stays unavailable until your details and account access can be checked." actionLabel="Try again" onAction={() => void read.reload(true)} />
        ) : (
          <>
            {error ? <ProfileNotice title="Check your details" description={error} danger /> : null}
            {photoBlocked ? <Button variant="outline" onPress={() => void Linking.openSettings().catch(() => setError("Allow photo access in device settings."))}>Open device settings</Button> : null}
            {view === "info" ? (
              <>
                <View className="flex-row items-center gap-3">
                  <Button size="icon" variant="secondary" style={{ width: 48, height: 48, borderRadius: 24 }}
                    disabled={busy} accessibilityLabel="Change profile photo"
                    onPress={startEdit}>
                    {savedAvatar || profile.avatarUrl ? <Avatar size="sm" source={{ uri: savedAvatar ?? profile.avatarUrl! }} accessibilityLabel="Profile photo" /> : <Camera size={20} color={primary} />}
                  </Button>
                  <View className="flex-1 gap-1">
                    <Text weight="semibold" style={{ fontSize: 22, lineHeight: 28 }}>{profile.fullName}</Text>
                    <Text size="sm" muted>{identifier}</Text>
                  </View>
                </View>
                {!defaultSaved && identity.account.defaultServiceAccountId !== id ? <Button variant="outline"
                  disabled={busy || identity.account.sessionMode !== "identity"} onPress={() => setDefaultDialog(true)}>Set as default</Button> : null}
                <View className="gap-5 rounded-xl bg-card p-4">
                  <DetailRow label="Contact number" value={profile.contactNum ?? "No contact number"} />
                  <DetailRow
                    label="Service account email"
                    value={serviceEmail || "No email on file"}
                  />
                  <DetailRow
                    label="Home location"
                    value={profile.fullAddress ?? "No location on file"}
                  />
                </View>
                <View className="gap-2 rounded-xl bg-card p-4">
                  <Text size="sm" weight="semibold">
                    Service details
                  </Text>
                  <DetailRow label="Service class" value={formatAccountClass(profile.serviceType) ?? "Unavailable"} />
                  <DetailRow label="Meter" value={"••" + (profile.meterSerialNum?.slice(-4) ?? "—")} />
                  <Text size="xs" muted>
                    Your name and service details are managed by ALECO.
                  </Text>
                </View>
              </>
            ) : view === "edit" ? (
              <>
                <ProfileHeading
                  title={profile.fullName}
                  description={identifier}
                />
                <Field className="gap-1">
                  <Field.Label>Profile photo</Field.Label>
                  <View className="flex-row items-center gap-3 rounded-xl bg-card p-3">
                    <Avatar size="xl" source={uri || savedAvatar || profile.avatarUrl ? { uri: uri || savedAvatar || profile.avatarUrl! } : undefined}
                      fallback={profile.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("")}
                      accessibilityLabel={uri ? "Selected profile photo" : "Profile photo"}>
                      <Avatar.Badge style={{ top: "auto", bottom: -4 }}>
                        <FileUpload.Trigger><Button size="icon" className="h-9 w-9 rounded-full" hitSlop={6} disabled={busy} accessibilityLabel="Change profile photo">
                          <Camera size={18} color={cameraForeground} />
                        </Button></FileUpload.Trigger>
                      </Avatar.Badge>
                    </Avatar>
                    <View className="flex-1">
                      <FileUpload.Trigger><Button variant="outline" disabled={busy}>Change photo</Button></FileUpload.Trigger>
                    </View>
                    {uri ? <Button size="icon" variant="ghost" style={{ width: 36, height: 36 }} hitSlop={6}
                      accessibilityLabel="Clear selected photo" disabled={busy} onPress={() => changeFiles([])}>
                      <X size={18} color={foreground} />
                    </Button> : null}
                  </View>
                </Field>
                <ProfileField
                  label="Contact number"
                  Icon={Phone}
                  keyboardType="phone-pad"
                  maxLength={20}
                  value={phone}
                  onChangeText={setPhone}
                  description="11-digit mobile number."
                />
                <ProfileField
                  label="Service account email"
                  Icon={Mail}
                  editable={emailEditable}
                  value={email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={setEmail}
                  maxLength={255}
                  description={
                    emailEditable
                      ? "For this service account. Your sign-in email stays unchanged."
                      : "Service email editing is unavailable. Refresh your account to check access."
                  }
                />
                <Field className="gap-1">
                  <Field.Label>Home location</Field.Label>
                  <View className="gap-2 rounded-xl bg-card p-3">
                    <Text size="sm">
                      {address
                        ? addressText(address)
                        : (baseline.fullAddress || "No location on file")}
                    </Text>
                    <Button variant="outline" onPress={location}>
                      Change location
                    </Button>
                  </View>
                </Field>
              </>
            ) : view === "location" ? (
              <>
                <ProfileHeading
                  title="Update home location"
                  description="Choose your address and confirm its pin within Albay."
                />
                <Field className="gap-1">
                  <Field.Label>Municipality</Field.Label>
                  <Select
                    value={locationDraft.municipalityCode}
                    searchable
                    title="Municipality"
                    triggerClassName="min-h-12 rounded-xl bg-card"
                    onValueChange={(code) =>
                      setLocationDraft((d) => ({
                        ...d,
                        municipalityCode: code,
                        barangayPsgc: "",
                        latitude: null,
                        longitude: null,
                      }))
                    }
                  >
                    {meta.municipalities.map((m) => (
                      <Select.Item key={m.code} value={m.code} label={m.name} />
                    ))}
                  </Select>
                </Field>
                <Field className="gap-1">
                  <Field.Label>Barangay</Field.Label>
                  <Select
                    value={locationDraft.barangayPsgc}
                    searchable
                    title="Barangay"
                    disabled={!locationDraft.municipalityCode}
                    triggerClassName="min-h-12 rounded-xl bg-card"
                    onValueChange={(code) =>
                      setLocationDraft((d) => ({
                        ...d,
                        barangayPsgc: code,
                        latitude: null,
                        longitude: null,
                      }))
                    }
                  >
                    {meta.barangays
                      .filter((b) => b.municipalityCode === locationDraft.municipalityCode)
                      .map((b) => (
                        <Select.Item key={b.code} value={b.code} label={b.name} />
                      ))}
                  </Select>
                </Field>
                <ProfileField
                  label="Purok or street"
                  Icon={MapPin}
                  maxLength={100}
                  value={locationDraft.purokOrStreet}
                  onChangeText={(v) => setLocationDraft((d) => ({ ...d, purokOrStreet: v }))}
                />
                <ProfileField
                  label="Landmark (optional)"
                  Icon={MapPin}
                  maxLength={255}
                  value={locationDraft.landmark}
                  onChangeText={(v) => setLocationDraft((d) => ({ ...d, landmark: v }))}
                />
                <View className="gap-2 rounded-xl bg-card p-4">
                  <Text size="sm" weight="semibold">
                    Home location pin
                  </Text>
                  <Text size="sm" muted>
                    {locationDraft.latitude === null
                      ? "Confirm the address pin on the map."
                      :  "Pin selected: " + addressText(locationDraft)}
                  </Text>
                  <Button
                    variant="outline"
                    disabled={!meta.municipalities.length}
                    onPress={() => setMap(true)}
                  >
                    Adjust pin on map
                  </Button>
                </View>
              </>
            ) : view === "review" ? (
              <>
                <ProfileHeading title={profile.fullName} description={identifier} />
                {uri ? <Field className="gap-1">
                  <Field.Label>Profile photo</Field.Label>
                  <View className="flex-row items-center gap-3 rounded-xl bg-card p-3">
                    <Avatar size="xl" source={{ uri }} accessibilityLabel="New profile photo" />
                    <Text size="sm">New profile photo</Text>
                  </View>
                </Field> : null}
                <View className="gap-4 rounded-xl bg-card p-4">
                  {phone.replace(/\D/g, "") !== baseline.phone ? (
                    <>
                      <DetailRow label="Previous contact" value={baseline.phone || "Not set"} />
                      <DetailRow label="New contact number" value={phone} />
                    </>
                  ) : null}
                  {emailEditable && email.trim().toLowerCase() !== baseline.email.toLowerCase() ? (
                    <>
                      <DetailRow label="Previous service email" value={baseline.email || "Not set"} />
                      <DetailRow label="New service email" value={email} />
                    </>
                  ) : null}
                  {address ? (
                    <>
                      <DetailRow
                        label="Previous location"
                        value={baseline.fullAddress || "Not set"}
                      />
                      <DetailRow label="New home location" value={addressText(address)} />
                    </>
                  ) : null}
                  <Button variant="outline" disabled={busy} onPress={() => setView("edit")}>
                    Edit changes
                  </Button>
                </View>
                {detailsChanged ? <ProfileField
                  label="Current ALECO account password"
                  secret
                  editable={!busy}
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="current-password"
                  maxLength={128}
                  description="Use this service account’s password, not your ALEConnect sign-in password."
                /> : null}
                {detailsChanged ? <Button variant="ghost" disabled={busy} onPress={() => setHelp(true)}>
                  Account password help
                </Button> : null}
              </>
            ) : (
              <ProfileNotice
                title="Profile updated"
                description={
                  identity.fixture
                    ? "Visual fixture saved locally. No live account was changed."
                    : "Your changes are saved to this service account."
                }
              />
            )}
            {read.error ? <DataNotice title="Could not refresh your details" description="Your last loaded details are shown. Refresh to check current account access." actionLabel="Refresh details" busy={read.busy} onAction={() => void read.reload(true)} /> : null}
          </>
        )}
      </ReportPage>
      <ReportLocationPicker
        open={map}
        meta={meta}
        fixture={identity.fixture}
        initialCoordinates={
          locationDraft.latitude !== null && locationDraft.longitude !== null
            ? { latitude: locationDraft.latitude, longitude: locationDraft.longitude }
            : null
        }
        onClose={() => setMap(false)}
        onConfirm={(p) => {
          setLocationDraft((d) => ({ ...d, ...p, purokOrStreet: p.purok || d.purokOrStreet }));
          setMap(false);
          setError("");
        }}
      />
      <Dialog open={discard} onOpenChange={setDiscard}>
        <Dialog.Content>
          <Dialog.Title>Discard your changes?</Dialog.Title>
          <Dialog.Description>Unsaved changes will be discarded.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                photoGeneration.current++;
                setDiscard(false);
                setPassword("");
                setFiles([]);
                setAddress(null);
                setView("info");
              }}
            >
              Discard changes
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <Dialog.Content>
          <Dialog.Title>Account password help</Dialog.Title>
          <Dialog.Description>
            ALECO can help reset the service account password. If you were given a temporary
            password, sign in with that account and complete its required password change.
          </Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setHelp(false)}>
              Close
            </Button>
            <Button
              onPress={() => {
                setHelp(false);
                router.push("/profile/help" as Href);
              }}
            >
              Contact ALECO
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </FileUpload>
  );
}
