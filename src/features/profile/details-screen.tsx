import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
  type Href,
  useLocalSearchParams,
  useRouter,
  useFocusEffect,
  useNavigation,
} from "expo-router";
import { Camera, Mail, MapPin, Phone } from "lucide-react-native";
import { Avatar } from "@/components/panelui/avatar";
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
import { useAppColors } from "@/hooks/use-app-colors";
import { setDefaultLinkedAccount } from "@/services/linked-accounts";
import { clearConsumerProfileCaches } from "@/hooks/use-consumer-profile";
import {
  fetchCurrentConsumerProfileView,
  updateVerifiedConsumerDetails,
  type ConsumerProfileScope,
  type StructuredProfileAddressInput,
} from "@/services/profile";
import { fetchComplaintMeta } from "@/services/reports";
import { creationFixtureMeta } from "@/features/reports/creation-fixtures";
import { emptyComplaintMeta } from "@/features/reports/data";
import { readReportCoordinates } from "@/features/reports/address";
import { isWithinAlbay } from "@/features/reports/contract";
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
import { ServiceAccountCard } from "./service-account-card";
import { profileEditAllowed, validateProfileDraft } from "./profile-state";
export default function ProfileDetailsScreen() {
  const params = useLocalSearchParams<{ serviceAccountId?: string; state?: string }>();
  return (
    <ProfileGate>
      {(identity) => (
        <Details
          identity={identity}
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
}: {
  identity: ProfileIdentity;
  requested?: string;
  locked: boolean;
}) {
  const { refreshConsumerAccount } = useConsumerAccount();
  const [cameraForeground] = useAppColors(["primary-foreground"]);
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
  const [address, setAddress] = useState<StructuredProfileAddressInput | null>(null),
    [meta, setMeta] = useState(emptyComplaintMeta),
    [map, setMap] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false),
    [help, setHelp] = useState(false);
  const profile = read.data,
    emailEditable = profile?.emailEditable === true && identity.account.sessionMode !== "identity";
  const changes = Boolean(
    profile &&
    (phone.replace(/\D/g, "") !== (profile.contactNum ?? "") ||
      (emailEditable && email.trim().toLowerCase() !== profile.email.toLowerCase()) ||
      address),
  );
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
      return () => setPassword("");
    }, [refreshDetails]),
  );
  const startEdit = () => {
    if (!profileEditAllowed(profile?.profileEditing)) return;
    setPhone(profile?.contactNum ?? "");
    setEmail(profile?.email ?? "");
    setAddress(null);
    setError("");
    setView("edit");
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
    if (busy || !profile || !password) return;
    setBusy(true);
    setError("");
    const secret = password;
    const reviewed = {
      ...(phone.replace(/\D/g, "") !== (profile.contactNum ?? "")
        ? { phone: phone.replace(/\D/g, "") }
        : {}),
      ...(emailEditable && email.trim().toLowerCase() !== profile.email.toLowerCase()
        ? { email: email.trim().toLowerCase() }
        : {}),
      ...(address ? { address } : {}),
    };
    setPassword("");
    try {
      if (!identity.fixture) {
        const fresh = await fetchCurrentConsumerProfileView(scope);
        if (!current()) return;
        if (!profileEditAllowed(fresh?.profileEditing)) {
          await read.reload(true);
          setView("info");
          throw new Error(
            "Secure editing is unavailable. Refresh account access before saving.",
          );
        }
        await updateVerifiedConsumerDetails(reviewed, secret, scope);
        if (!current()) return;
        await clearConsumerProfileCaches();
        await read.reload(true);
      }
      if (current()) {
        setView("saved");
        setAddress(null);
      }
    } catch (e) {
      if (current())
        setError(
          e instanceof Error
            ? e.message
            : "Your changes were not saved. Re-enter the password and retry.",
        );
    } finally {
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
        const problem = validateProfileDraft({ phone, email }, emailEditable);
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
    <Button loading={busy} disabled={!password} onPress={() => void save()}>
      Verify & save
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
    <>
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
            {view === "info" ? (
              <>
                <Avatar size="xl" className="self-center" source={profile.avatarUrl ? { uri: profile.avatarUrl } : undefined}
                  fallback={profile.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("")}
                  accessibilityLabel="Profile photo">
                  <Avatar.Badge style={{ top: "auto", bottom: -4 }}>
                    <Button size="icon" className="h-9 w-9 rounded-full" hitSlop={6} disabled={busy} accessibilityLabel="Change profile photo"
                      onPress={() => router.push(("/profile/photo?serviceAccountId=" + encodeURIComponent(id)) as Href)}>
                      <Camera size={18} color={cameraForeground} />
                    </Button>
                  </Avatar.Badge>
                </Avatar>
                <ServiceAccountCard account={{
                  id, accountNumber: profile.accountNumber, registeredName: profile.fullName,
                  address: profile.fullAddress, phoneNumber: profile.contactNum,
                  isDefault: defaultSaved || identity.account.defaultServiceAccountId === id,
                }} />
                {!defaultSaved && identity.account.defaultServiceAccountId !== id ? <Button variant="outline"
                  disabled={busy || identity.account.sessionMode !== "identity"} onPress={() => setDefaultDialog(true)}>Set as default</Button> : null}
                <ProfileNotice title="Keep your details current"
                  description="Verify your password to update contact details and home location. Active reports keep their original submitted details." />
                <View className="gap-5 rounded-xl bg-card p-4">
                  <DetailRow label="Contact" value={profile.contactNum ?? "No contact number"} />
                  <DetailRow
                    label={emailEditable ? "Service account email" : "Email sign-in"}
                    value={profile.email || "No email on file"}
                  />
                  <DetailRow
                    label="Location"
                    value={profile.fullAddress ?? "No location on file"}
                  />
                </View>
                <View className="gap-2 rounded-xl bg-card p-4">
                  <Text size="sm" weight="semibold">
                    Service details
                  </Text>
                  <DetailRow label="Service class" value={profile.serviceType ?? "Unavailable"} />
                  <DetailRow label="Meter" value={"••" + (profile.meterSerialNum?.slice(-4) ?? "—")} />
                  <Text size="xs" muted>
                    Your name and service details are managed by ALECO.
                  </Text>
                </View>
              </>
            ) : view === "edit" ? (
              <>
                <ProfileHeading
                  title="Update your details"
                  description={"ALECO account ••" + profile.accountNumber?.slice(-4)}
                />
                <ProfileField
                  label="Contact number"
                  Icon={Phone}
                  keyboardType="phone-pad"
                  maxLength={20}
                  value={phone}
                  onChangeText={setPhone}
                  description="Use an 11-digit Philippine mobile number."
                />
                <ProfileField
                  label={emailEditable ? "Service account email" : "Email sign-in"}
                  Icon={Mail}
                  editable={emailEditable}
                  value={email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={setEmail}
                  maxLength={255}
                  description={
                    emailEditable
                      ? "Used for this service account."
                      : "Changing your email sign-in requires email verification, which is not available yet."
                  }
                />
                <View className="gap-2 rounded-xl bg-card p-4">
                  <Text size="sm" weight="semibold">
                    Home location
                  </Text>
                  <Text size="sm" muted>
                    {address
                      ? addressText(address)
                      : (profile.fullAddress ?? "No location on file")}
                  </Text>
                  <Button variant="outline" onPress={location}>
                    Change location
                  </Button>
                </View>
                <ProfileNotice
                  title="Before saving"
                  description="Review your changes and confirm this ALECO account’s password. Editing stays locked while reports are active."
                />
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
                <ProfileHeading title="Review your changes" />
                <View className="gap-4 rounded-xl bg-card p-4">
                  {phone.replace(/\D/g, "") !== (profile.contactNum ?? "") ? (
                    <>
                      <DetailRow label="Previous contact" value={profile.contactNum ?? "Not set"} />
                      <DetailRow label="After" value={phone} />
                    </>
                  ) : null}
                  {emailEditable && email !== profile.email ? (
                    <>
                      <DetailRow label="Previous email" value={profile.email} />
                      <DetailRow label="After" value={email} />
                    </>
                  ) : null}
                  {address ? (
                    <>
                      <DetailRow
                        label="Previous location"
                        value={profile.fullAddress ?? "Not set"}
                      />
                      <DetailRow label="After" value={addressText(address)} />
                    </>
                  ) : null}
                  <Button variant="outline" disabled={busy} onPress={() => setView("edit")}>
                    Edit changes
                  </Button>
                </View>
                <ProfileField
                  label="Current ALECO account password"
                  secret
                  editable={!busy}
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="current-password"
                  maxLength={128}
                  description="Use this service account’s password, not your email sign-in password."
                />
                <Button variant="ghost" disabled={busy} onPress={() => setHelp(true)}>
                  Account password help
                </Button>
                <ProfileNotice
                  title="Secure update"
                  description="Your changes are saved together after ALECO verifies the password and checks for active reports."
                />
              </>
            ) : (
              <ProfileNotice
                title="Your details are updated"
                description={
                  identity.fixture
                    ? "Visual fixture saved locally. No live account was changed."
                    : "Your changes were saved securely to this service account."
                }
              />
            )}
            {error ? <ProfileNotice title="Check your details" description={error} danger /> : null}
            {read.error ? <DataNotice title="Could not refresh your details" description="Your loaded details remain visible. Refresh before editing to check current information and report eligibility." actionLabel="Refresh details" busy={read.busy} onAction={() => void read.reload(true)} /> : null}
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
          <Dialog.Description>Your account details have not been updated.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                setDiscard(false);
                setPassword("");
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
    </>
  );
}
