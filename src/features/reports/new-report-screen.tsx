import { Asset } from "expo-asset";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Image, Pressable, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ServiceRequestFields } from "@/features/services/service-request-fields";
import { selectServiceRequest } from "@/features/services/service-request-contract";
import { useAppGuide } from "@/context/app-guide-context";
import { toast } from "@/components/panelui/toast";
import {
  Activity,
  Check,
  CircleEllipsis,
  ClipboardCheck,
  Cpu,
  Gauge,
  Lightbulb,
  MapPin,
  LocateFixed,
  Pencil,
  Plug,
  PowerOff,
  Scissors,
  TriangleAlert,
  ZapOff,
  type LucideIcon,
} from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Dialog } from "@/components/panelui/dialog";
import { Card } from "@/components/panelui/card";
import { Field } from "@/components/panelui/field";
import { FileUpload, type FileUploadFile } from "@/components/panelui/file-upload";
import { Input } from "@/components/panelui/input";
import { Select } from "@/components/panelui/select";
import { SearchField } from "@/components/search-field";
import { filterComplaintOptions } from "./issue-search";
import { RadioGroup } from "@/components/panelui/radio-group";
import { Spinner } from "@/components/panelui/spinner";
import { ContentSkeleton } from "@/components/content-skeleton";
import { Text } from "@/components/panelui/text";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useReportQueue } from "@/context/report-queue-context";
import { ReportLocationPicker } from "@/features/maps/report-location-picker";
import { StaticLocationMap } from "@/features/maps/static-location-map";
import { readReportCoordinates, resolveHomeReportLocation } from "./address";
import { findAlbayBarangay } from "./albay-barangays";
import {
  conditionalReportPayload,
  hasCurrentReportContract,
  reportLimits,
  validateReportForm,
} from "./contract";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  initialComplaintForm,
  type ComplaintFormState,
} from "./data";
import { ReportPage } from "./components/report-page";
import { ReportReceipt } from "./report-receipt";
import { KnownOutageChoice } from "./known-outage-choice";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { fetchServiceStatus } from "@/services/service-status";
import type { ServiceStatus } from "@/features/home/service-status-contract";
import { EvidencePhotoViewer } from "./components/evidence-photo-viewer";
import {
  creationStepErrors,
  nextCreationStep,
  singleCategoryTypeId,
  previousCreationStep,
  confirmedReportReceipt,
  isDraftScopeCurrent,
  creationSubmissionMode,
  changeReportIssue,
  type CreationStep,
  type ReportDraftScope,
} from "./creation-state";
import {
  creationFixtureAccounts,
  creationFixtureLocation,
  creationFixtureMeta,
  buildFixtureEvidence,
} from "./creation-fixtures";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useConsumerProfile } from "@/hooks/use-consumer-profile";
import { createLocalReportId, enqueueReport } from "@/services/report-queue";
import { fetchComplaintMeta } from "@/services/reports";
import {
  deleteEvidencePhoto,
  prepareEvidencePhoto,
} from "@/utils/evidence-image-processing";

const stepLabels = [
  "Account",
  "Issue & type",
  "Location",
  "Details",
  "Photos",
  "Review",
];
const categoryIcons: LucideIcon[] = [
  ZapOff,
  Activity,
  Plug,
  TriangleAlert,
  Gauge,
  Scissors,
  PowerOff,
  Lightbulb,
  Cpu,
  CircleEllipsis,
  ClipboardCheck,
];
const fixtureImages = [
  require("@/assets/aleconnect/report-evidence-1.png"),
  require("@/assets/aleconnect/report-evidence-2.png"),
  require("@/assets/aleconnect/report-evidence-3.png"),
];
function Heading({
  children,
  description,
}: {
  children: string;
  description?: string;
}) {
  return (
    <View className="gap-1">
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: "PlusJakartaSans_600SemiBold",
          fontSize: 22,
          lineHeight: 30,
        }}
      >
        {children}
      </Text>
      {description ? (
        <Text size="sm" muted>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
function EditRow({ title, onPress }: { title: string; onPress: () => void }) {
  const [primary] = useAppColors(["primary"]);
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text size="sm" weight="semibold" className="flex-1">
        {title}
      </Text>
      <Button
        size="sm"
        variant="ghost"
        onPress={onPress}
        accessibilityLabel={`Edit ${title}`}
        startContent={<Pencil size={14} color={primary} />}
      >
        Edit
      </Button>
    </View>
  );
}
function draftHasContent(form: ComplaintFormState) {
  return Boolean(
    form.categoryId ||
    form.typeId ||
    form.categoryDescription ||
    form.typeDescription ||
    form.desiredAction ||
    form.currentRegisteredName ||
    form.requestedRegisteredName ||
    form.photoUploads.length ||
    !form.useHomeAddress,
  );
}

export default function NewReportScreen() {
  const { serviceRequest: requestedServiceKind } = useLocalSearchParams<{serviceRequest?: string}>();
  const preselectedService = useRef("");
  const { guide, stopGuide } = useAppGuide();
  const router = useRouter(),
    navigation = useNavigation();
  const { session, isLoading: authLoading } = useAuthSession();
  const {
    accountContext,
    selectedServiceAccountId,
    isLoading: accountLoading,
    refreshConsumerAccount,
  } = useConsumerAccount();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
    setServiceAccountId,
    reload: reloadProfile,
  } = useConsumerProfile();
  const { sync, refresh: refreshQueue, announceSubmission } = useReportQueue();
  const { fixtures } = useVisualPreview();
  const [primary, muted, primaryForeground, danger] = useAppColors([
    "primary",
    "muted-foreground",
    "primary-foreground",
    "destructive",
  ]);
  const [step, setStep] = useState<CreationStep>(1),
    [editingReview, setEditingReview] = useState(false);
  const [outageChoice, setOutageChoice] = useState<{ scopeKey: string; status: Extract<ServiceStatus, { enabled: true }> } | null>(null);
  const [form, setForm] = useState<ComplaintFormState>({
    ...initialComplaintForm,
  });
  const [meta, setMeta] = useState(emptyComplaintMeta),
    [metaLoading, setMetaLoading] = useState(true),
    [metaError, setMetaError] = useState<string | null>(null),
    [metaRetry, setMetaRetry] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null),
    [scope, setScope] = useState<ReportDraftScope | null>(null);
  useEffect(() => {
    const selected = selectServiceRequest(meta.serviceRequestKinds ?? [], requestedServiceKind);
    const key = `${selectedAccount}:${requestedServiceKind}`;
    if (metaLoading || !selected || preselectedService.current === key) return;
    preselectedService.current = key;
    setForm(current => ({ ...changeReportIssue(current, selected.categoryId, selected.typeId), serviceRequestKind: selected.kind, requestedServiceDate: "" }));
  }, [meta, metaLoading, requestedServiceKind, selectedAccount]);
  const [attempted, setAttempted] = useState(false),
    [submitError, setSubmitError] = useState<string | null>(null),
    [submitting, setSubmitting] = useState(false);
  const [mapOpen, setMapOpen] = useState(false),
    [locateOnOpen, setLocateOnOpen] = useState(false),
    [photoError, setPhotoError] = useState<string | null>(null),
    [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<
      "discard" | "account" | "restart" | "issue" | null
    >(null),
    [nextAccount, setNextAccount] = useState<string | null>(null);
  const [nextIssue, setNextIssue] = useState<{
    categoryId: string;
    typeId: string;
  } | null>(null);
  const [issueQuery, setIssueQuery] = useState("");
  const [issueView, setIssueView] = useState<"category" | "type">("category");
  const [submissionPhase, setSubmissionPhase] = useState<
    "saving" | "sending" | "checking"
  >("saving");
  const [fixtureSubmit, setFixtureSubmit] = useState(false),
    [receipt, setReceipt] = useState<{
      ticketId: string;
      ticketNumber: string;
    } | null>(null);
  const reportId = useRef(createLocalReportId()),
    leaving = useRef(false),
    mounted = useRef(true),
    submittingRef = useRef(false),
    queued = useRef(false),
    draftGeneration = useRef(0);
  const previousFixture = useRef(fixtures),
    manualLocation = useRef<Partial<ComplaintFormState> | null>(null);
  const accounts = fixtures
    ? creationFixtureAccounts
    : (accountContext?.accounts ?? []);
  const accountId =
    selectedAccount ??
    (fixtures
      ? creationFixtureAccounts[0].id
      : (selectedServiceAccountId ?? accountContext?.defaultServiceAccountId ?? session?.user.id ?? null));
  const selected = accounts.find((account) => account.id === accountId);
  const currentScope = {
    principalId: fixtures ? "fixture" : (session?.user.id ?? null),
    identityUserId: fixtures
      ? "fixture"
      : (accountContext?.identityUserId ?? session?.user.id ?? null),
    accessRevision: fixtures ? 0 : (accountContext?.accessRevision ?? 0),
    authorizedServiceAccountIds: fixtures
      ? accounts.map((account) => account.id)
      : (accountContext?.authorizedServiceAccountIds ??
        (session ? [session.user.id] : [])),
    profileId: fixtures ? accountId : (profile?.profileId ?? null),
  };
  const scopeCurrent = isDraftScopeCurrent(scope, currentScope);
  const accountReady =
    scopeCurrent &&
    !metaLoading &&
    hasCurrentReportContract(meta) &&
    (fixtures || (!accountLoading && !profileLoading && !profileError));
  const stale = Boolean(
    scope &&
    (scope.principalId !== currentScope.principalId ||
      scope.identityUserId !== currentScope.identityUserId ||
      scope.accessRevision !== currentScope.accessRevision ||
      !currentScope.authorizedServiceAccountIds.includes(
        scope.serviceAccountId,
      )),
  );
  useEffect(() => {
    if (guide?.id !== "report-new" || (!metaError && !stale)) return;
    stopGuide();
    toast.show({ label: "Guide unavailable", description: "Load the report form, then try this guide again from Help & support." });
  }, [guide?.id, metaError, stale, stopGuide]);
  const latest = useRef({ currentScope, scopeCurrent, fixtures, accountId });
  latest.current = { currentScope, scopeCurrent, fixtures, accountId };
  useEffect(
    () => () => {
      mounted.current = false;
      draftGeneration.current += 1;
    },
    [],
  );
  useEffect(() => {
    let active = true;
    setMetaLoading(true);
    setMetaError(null);
    if (fixtures) {
      setMeta(creationFixtureMeta);
      setMetaLoading(false);
      return;
    }
    if (!session?.user.id) {
      setMetaLoading(false);
      return;
    }
    fetchComplaintMeta({ force: true })
      .then((next) => {
        if (!hasCurrentReportContract(next))
          throw new Error(
            "Connect to update the report form before continuing.",
          );
        if (active) setMeta(next);
      })
      .catch((error) => {
        if (active)
          setMetaError(
            error instanceof Error
              ? error.message
              : "Could not load the report form.",
          );
      })
      .finally(() => {
        if (active) setMetaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fixtures, metaRetry, session?.user.id]);
  useEffect(() => {
    if (!fixtures && accountId) setServiceAccountId(accountId);
  }, [fixtures, accountId, setServiceAccountId]);
  useEffect(() => {
    if (previousFixture.current === fixtures) return;
    previousFixture.current = fixtures;
    draftGeneration.current += 1;
    setForm({ ...initialComplaintForm });
    setScope(null);
    setSelectedAccount(null);
    setStep(1);
    setReceipt(null);
    setEditingReview(false);
    setAttempted(false);
    queued.current = false;
    reportId.current = createLocalReportId();
  }, [fixtures]);
  useEffect(() => {
    if (
      scope ||
      !accountId ||
      !currentScope.principalId ||
      !currentScope.identityUserId ||
      !hasCurrentReportContract(meta) ||
      (!fixtures &&
        (profile?.profileId !== accountId || accountLoading || profileLoading))
    )
      return;
    const coordinates = readReportCoordinates(profile?.homeCoordinates);
    const home = fixtures
      ? creationFixtureLocation
      : resolveHomeReportLocation(
          meta,
          profile,
          coordinates
            ? findAlbayBarangay(coordinates.latitude, coordinates.longitude)
                ?.barangayPsgc
            : null,
        );
    setScope({
      principalId: currentScope.principalId,
      identityUserId: currentScope.identityUserId,
      serviceAccountId: accountId,
      accessRevision: currentScope.accessRevision,
    });
    setForm((current) => ({
      ...current,
      serviceAccountId: accountId,
      accessRevision: currentScope.accessRevision,
      accountNumber: fixtures
        ? (selected?.accountNumber ?? "")
        : (profile?.accountNumber ?? ""),
      ...home,
    }));
  }, [
    scope,
    accountId,
    currentScope.principalId,
    currentScope.identityUserId,
    currentScope.accessRevision,
    meta,
    fixtures,
    profile,
    selected?.accountNumber,
    accountLoading,
    profileLoading,
  ]);
  const category = meta.categories.find((item) => item.id === form.categoryId),
    type = meta.types.find((item) => item.id === form.typeId);
  const types = meta.types.filter(
    (item) => item.categoryId === form.categoryId,
  );
  const options = filterComplaintOptions(meta, issueQuery, issueView === "type" ? form.categoryId : undefined);
  const outageScopeKey = `${currentScope.principalId}:${currentScope.identityUserId}:${currentScope.accessRevision}:${accountId}:${form.typeId}`;
  const outageRead = useScopedRead(!fixtures && step === 2 && accountReady && type?.knownOutageEligible === true && accountContext?.capabilities.areaOutageStatus ? outageScopeKey : null, () => fetchServiceStatus({ principalId: currentScope.principalId!, identityUserId: currentScope.identityUserId!, accessRevision: currentScope.accessRevision, serviceAccountId: accountId! }));
  const errors = validateReportForm(form, category, type, meta),
    stepErrors = creationStepErrors(step, errors, accountReady);
  const summaryErrors = step === 5 ? [] : stepErrors.filter(message => step !== 3 || message !== errors.purok);
  const readyPhotos = form.photoUploads.filter(
    (photo) => photo.status === "ready",
  );
  const pickerBusy = form.photoUploads.some((photo) => photo.status === "processing");
  const photoGeneration = draftGeneration.current;
  const uploadFiles: FileUploadFile[] = form.photoUploads.map((photo, index) => ({
    id: photo.id,
    uri: photo.uri,
    name: `Evidence ${index + 1}.webp`,
    kind: "image",
    mimeType: "image/webp",
    size: photo.size ?? undefined,
    status: photo.status === "ready" ? "idle" : photo.status === "failed" ? "error" : "processing",
    error: photo.error,
  }));
  const address = [
    form.purok.trim(),
    meta.barangays.find((item) => item.code === form.barangayPsgc)?.name,
    meta.municipalities.find((item) => item.code === form.municipalityCode)
      ?.name,
    form.landmark,
  ]
    .filter(Boolean)
    .join(", ");
  const accountLabel = selected?.registeredName ?? "Service account";
  const update = <K extends keyof ComplaintFormState>(
    key: K,
    value: ComplaintFormState[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const leave = useCallback(
    (path: "/reports" | "/reports/queue" | "/home" = "/reports") => {
      leaving.current = true;
      router.dismissTo(path);
    },
    [router],
  );
  const cleanDraft = () => {
    draftGeneration.current += 1;
    if (!PANELUI_PREVIEW && !fixtures && !queued.current)
      form.photoUploads
        .filter((photo) => photo.status === "ready")
        .forEach((photo) => deleteEvidencePhoto(photo.uri));
  };
  const closeDraft = useCallback(() => {
    leaving.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/reports");
  }, [router]);
  const requestClose = useCallback(() => {
    if (submittingRef.current) { if (queued.current) leave(); return; }
    if (receipt) leave();
    else if (!draftHasContent(form)) closeDraft();
    else setConfirm("discard");
  }, [form, leave, closeDraft, receipt]);
  const back = useCallback(() => {
    if (outageChoice) { setOutageChoice(null); return; }
    if (submitting && fixtures) {
      setSubmitting(false);
      return;
    }
    if (submittingRef.current) { if (queued.current) leave(); return; }
    if (mapOpen) {
      setMapOpen(false);
      return;
    }
    if (viewerIndex != null) {
      setViewerIndex(null);
      return;
    }
    if (confirm) {
      setConfirm(null);
      return;
    }
    if (receipt) {
      leave();
      return;
    }
    if (step === 1) {
      requestClose();
      return;
    }
    if (step === 2 && issueView === "type" && !editingReview) {
      setIssueView("category");
      return;
    }
    setStep(previousCreationStep(step, editingReview));
    setEditingReview(false);
    setAttempted(false);
  }, [
    outageChoice,
    mapOpen,
    viewerIndex,
    confirm,
    receipt,
    step,
    editingReview,
    issueView,
    submitting,
    fixtures,
    requestClose,
    leave,
  ]);
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        back();
        return true;
      });
      return () => listener.remove();
    }, [back]),
  );
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (leaving.current) return;
        event.preventDefault();
        back();
      }),
    [navigation, back],
  );
  const reset = (target = accountId) => {
    cleanDraft();
    setScope(null);
    setSelectedAccount(target);
    setForm({ ...initialComplaintForm });
    setStep(1);
    setIssueView("category");
    setEditingReview(false);
    setAttempted(false);
    setSubmitError(null);
    setPhotoError(null);
    setConfirm(null);
    manualLocation.current = null;
    reportId.current = createLocalReportId();
    queued.current = false;
  };
  const selectAccount = (id: string) => {
    if (id === accountId || submitting || pickerBusy) return;
    if (draftHasContent(form)) {
      setNextAccount(id);
      setConfirm("account");
    } else reset(id);
  };
  const edit = (target: CreationStep) => {
    setStep(target);
    setEditingReview(true);
    setAttempted(false);
  };
  const applyIssue = (categoryId: string, typeId: string) => {
    const selected = meta.serviceRequestKinds?.find(item => item.typeId === typeId && item.categoryId === categoryId);
    setForm(current => ({ ...changeReportIssue(current, categoryId, typeId), serviceRequestKind: selected?.kind ?? null }));
    setAttempted(false);
  };
  const selectIssue = (categoryId: string, typeId: string) => {
    if (!typeId && categoryId === form.categoryId) return;
    if (form.categoryId === categoryId && form.typeId === typeId) {
      applyIssue(categoryId, typeId);
      return;
    }
    if (
      form.typeId &&
      (editingReview ||
        form.categoryDescription ||
        form.typeDescription ||
        form.currentRegisteredName ||
        form.requestedRegisteredName)
    ) {
      setNextIssue({ categoryId, typeId });
      setConfirm("issue");
      return;
    }
    applyIssue(categoryId, typeId);
  };
  const previewPhotos = (state: string) => {
    if (!fixtures) return;
    const photos = buildFixtureEvidence(
      fixtureImages.map((asset) => Asset.fromModule(asset).uri),
      state,
    );
    setForm((current) => ({
      ...current,
      photos: photos.map((photo) => photo.uri),
      photoUploads: photos,
    }));
  };
  const preparePhoto = async (uri: string, generation: number, id: string) => {
    const localReportId = reportId.current;
    setForm((current) =>
      current.photoUploads.length >= reportLimits.evidenceMax
        ? current
        : {
            ...current,
            photos: [...current.photos, uri],
            photoUploads: [
              ...current.photoUploads,
              { id, uri, size: null, status: "processing" },
            ],
          },
    );
    try {
      const prepared = await prepareEvidencePhoto(uri, localReportId, id);
      if (!mounted.current || generation !== draftGeneration.current || !latest.current.scopeCurrent) {
        deleteEvidencePhoto(prepared.uri);
        return;
      }
      setForm((current) => {
        if (!current.photoUploads.some((photo) => photo.id === id)) {
          deleteEvidencePhoto(prepared.uri);
          return current;
        }
        return {
          ...current,
          photos: current.photoUploads.map((photo) =>
            photo.id === id ? prepared.uri : photo.uri,
          ),
          photoUploads: current.photoUploads.map((photo) =>
            photo.id === id
              ? {
                  ...photo,
                  uri: prepared.uri,
                  size: prepared.size,
                  status: "ready",
                }
              : photo,
          ),
        };
      });
    } catch (error) {
      if (!mounted.current || generation !== draftGeneration.current) return;
      setForm((current) => ({
        ...current,
        photoUploads: current.photoUploads.map((photo) =>
          photo.id === id
            ? {
                ...photo,
                status: "failed",
                error:
                  error instanceof Error
                    ? error.message
                    : "Could not prepare this photo.",
              }
            : photo,
        ),
      }));
    }
  };
  const removePhoto = (id: string) => {
    if (submitting || queued.current) return;
    const removed = form.photoUploads.find((photo) => photo.id === id);
    if (!PANELUI_PREVIEW && !fixtures && removed?.status === "ready")
      deleteEvidencePhoto(removed.uri);
    setForm((current) => {
      const remaining = current.photoUploads.filter((photo) => photo.id !== id);
      return {
        ...current,
        photos: remaining.map((photo) => photo.uri),
        photoUploads: remaining,
      };
    });
  };
  const changePhotos = (files: FileUploadFile[]) => {
    if (submittingRef.current || queued.current || !mounted.current ||
        photoGeneration !== draftGeneration.current || !latest.current.scopeCurrent) return;
    setPhotoError(null);
    if (fixtures) {
      // Visual fixtures select real local images without writing durable evidence.
      setForm((current) => ({
        ...current,
        photos: files.map((file) => file.uri),
        photoUploads: files.map((file) => ({ id: file.id, uri: file.uri, size: file.size ?? null, status: "ready" as const })),
      }));
      return;
    }
    const kept = new Set(files.map((file) => file.id));
    form.photoUploads.filter((photo) => !kept.has(photo.id)).forEach((photo) => removePhoto(photo.id));
    const existing = new Set(form.photoUploads.map((photo) => photo.id));
    files.filter((file) => !existing.has(file.id)).forEach((file) => {
      void preparePhoto(file.uri, photoGeneration, file.id);
    });
  };
  const submit = async () => {
    if (submittingRef.current || queued.current) return;
    setAttempted(true);
    setSubmitError(null);
    if (
      Object.keys(errors).length ||
      !accountReady ||
      !isDraftScopeCurrent(scope, latest.current.currentScope)
    ) {
      setSubmitError(
        "Review the required fields and current account access before submitting.",
      );
      return;
    }
    const submissionMode = creationSubmissionMode(PANELUI_PREVIEW, fixtures);
    if (submissionMode === "fixture") {
      setFixtureSubmit(true);
      return;
    }
    if (submissionMode === "disabled") {
      setSubmitError(
        "Queue replay is paused in this preview. Enable visual fixtures in Account to simulate submission.",
      );
      return;
    }
    if (!session || !scope) {
      setSubmitError("Sign in again before sending this report.");
      return;
    }
    const submissionScope = scope;
    const submissionId = reportId.current;
    submittingRef.current = true;
    setSubmissionPhase("saving");
    setSubmitting(true);
    try {
      await enqueueReport({
        id: reportId.current,
        idempotencyKey: `mobile:${reportId.current}`,
        userId: session.user.id,
        identityUserId: scope.identityUserId,
        serviceAccountId: scope.serviceAccountId,
        accessRevision: scope.accessRevision,
        title: type?.title ?? category?.title ?? "Report",
        evidence: readyPhotos.map(({ id, uri, size }) => ({
          id,
          uri,
          size: size ?? 0,
        })),
        payload: {
          typeId: form.typeId,
          accountNumber: form.accountNumber,
          barangayPsgc: form.barangayPsgc,
          purok: form.purok,
          landmark: form.landmark,
          actionDesired: form.desiredAction,
          latitude: form.latitude,
          longitude: form.longitude,
          serviceAccountId: scope.serviceAccountId,
          accessRevision: scope.accessRevision,
          ...conditionalReportPayload(form),
        },
      });
      queued.current = true;
      await refreshQueue();
      if (!isDraftScopeCurrent(submissionScope, latest.current.currentScope)) {
        if (mounted.current)
          setSubmitError(
            "Account access changed. Your saved report remains protected on this device.",
          );
        return;
      }
      setSubmissionPhase("sending");
      const results = await sync(false);
      if (leaving.current || !mounted.current) { await announceSubmission(submissionId); return; }
      setSubmissionPhase("checking");
      if (
        !mounted.current ||
        !isDraftScopeCurrent(submissionScope, latest.current.currentScope)
      )
        return;
      const confirmed = confirmedReportReceipt(
        results.find((item) => item.id === reportId.current),
      );
      if (confirmed) setReceipt(confirmed);
      else leave("/reports/queue");
    } catch (error) {
      if (!mounted.current || leaving.current) { if (queued.current) await announceSubmission(submissionId); return; }
      if (
        queued.current &&
        isDraftScopeCurrent(submissionScope, latest.current.currentScope)
      )
        leave("/reports/queue");
      else
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Could not save this report. Your draft is kept; try again.",
        );
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };
  const continueStep = () => {
    setAttempted(true);
    if (pickerBusy) return;
    if (step === 2 && issueView === "category") {
      if (!form.categoryId || !accountReady) return;
      if (types.length !== 1 || !form.typeId) { setIssueView("type"); setAttempted(false); return; }
    }
    if (stepErrors.length) return;
    if (step === 2 && !fixtures && type?.knownOutageEligible === true && accountContext?.capabilities.areaOutageStatus && scopeCurrent && outageRead.data?.enabled && !outageRead.data.isStale && outageRead.data.canAcknowledge && outageRead.data.items.some(item => item.state === "active")) {
      setOutageChoice({scopeKey:outageScopeKey,status:outageRead.data});
      return;
    }
    if (step === 6) {
      void submit();
      return;
    }
    setStep(nextCreationStep(step, editingReview));
    setEditingReview(false);
    setAttempted(false);
  };
  const photoStrip = () => (
    <View className="flex-row gap-2">
      {readyPhotos.map((photo, index) => (
        <View
          key={photo?.id ?? index}
          className="flex-1"
          style={{ aspectRatio: 1 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              photo
                ? `View evidence photo ${index + 1}, ${photo.status}`
                : "Add evidence photo"
            }
            disabled={submitting || !photo}
            onPress={() => {
              if (photo)
                setViewerIndex(
                  form.photoUploads.findIndex((item) => item.id === photo.id),
                );
            }}
            className="flex-1 rounded-xl overflow-hidden bg-muted items-center justify-center"
          >
            {photo ? (
              <Image
                source={{ uri: photo.uri }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              null
            )}
            {photo?.status === "processing" ? (
              <View className="absolute inset-0 items-center justify-center bg-background/80">
                <Spinner />
                <Text size="xs">Preparing</Text>
              </View>
            ) : photo?.status === "failed" ? (
              <View className="absolute inset-0 items-center justify-center bg-background/90 p-2">
                <TriangleAlert color={muted} size={20} />
                <Text size="xs" className="text-center">
                  Failed. Remove and retry
                </Text>
              </View>
            ) : null}
          </Pressable>

        </View>
      ))}
    </View>
  );
  const textField = (
    key:
      | "categoryDescription"
      | "typeDescription"
      | "desiredAction"
      | "currentRegisteredName"
      | "requestedRegisteredName",
    label: string,
    required = false,
    multiline = true,
  ) => (
    <Field
      key={key}
      required={required}
      invalid={attempted && Boolean(errors[key])}
    >
      <Input
        label={label}
        value={form[key]}
        onChangeText={(value) => update(key, value)}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        isRequired={required}
        disabled={submitting}
        maxLength={
          key === "desiredAction"
            ? reportLimits.actionDesired
            : multiline
              ? reportLimits.description
              : reportLimits.registeredName
        }
        errorMessage={attempted ? errors[key] : undefined}
        placeholder={key === "desiredAction"
          ? "How would you like ALECO to help?"
          : multiline
            ? "What happened, when did it start, and what is affected?"
            : key === "currentRegisteredName" ? "Name currently on the account" : "Name to register on the account"}
        containerClassName="rounded-xl"
      />
      <Text size="xs" muted className="text-right">
        {form[key].length} /{" "}
        {key === "desiredAction"
          ? reportLimits.actionDesired
          : multiline
            ? reportLimits.description
            : reportLimits.registeredName}
      </Text>
    </Field>
  );

  if (!fixtures && (authLoading || !session))
    return (
      <ReportPage title="New report">
        {authLoading ? (
          <View accessibilityLabel="Checking sign-in">
            <Spinner />
          </View>
        ) : (
          <View className="gap-3">
            <Text weight="semibold" size="lg">
              Sign in to create a report
            </Text>
            <Text muted>
              Use your ALECO account to report an issue and follow its progress.
            </Text>
            <Button onPress={() => router.push({ pathname: "/sign-in", params: { returnTo: "/reports/new" } })}>Sign in</Button>
          </View>
        )}
      </ReportPage>
    );

  if (outageChoice?.scopeKey === outageScopeKey && scopeCurrent && accountContext && session && accountId)
    return <ReportPage title="Outage notice" onBack={() => setOutageChoice(null)}><KnownOutageChoice key={outageChoice.scopeKey} initialStatus={outageChoice.status} scope={{ principalId: session.user.id, identityUserId: accountContext.identityUserId, accessRevision: accountContext.accessRevision, authorizedServiceAccountIds: accountContext.authorizedServiceAccountIds }} serviceAccountId={accountId} accountLabel={accountLabel} onContinue={() => { setOutageChoice(null); setStep(nextCreationStep(step, editingReview)); setEditingReview(false); setAttempted(false); }} onHome={() => leave("/home")} /></ReportPage>;

  if (receipt && scopeCurrent)
    return (
      <ReportReceipt
        ticketNumber={receipt.ticketNumber}
        title={form.categoryDescription || type?.title || "Report"}
        issue={type?.title || category?.title || "Report"}
        account={accountLabel}
        address={address}
        photoCount={readyPhotos.length}
        fixture={fixtures}
        onHome={() => leave("/home")}
        onTrack={() => {
          leaving.current = true;
          router.replace({
            pathname: "/reports/[id]",
            params: { id: receipt.ticketId },
          });
        }}
      />
    );
  if (submitting)
    return (
      <ReportPage
        title="Submitting report"
        onBack={back}
        scroll={false}
        footer={
          fixtures ? (
            <Button variant="secondary" onPress={() => setSubmitting(false)}>
              Back to review
            </Button>
          ) : <Button variant="secondary" disabled={submissionPhase === "saving"} onPress={() => leave()}>Back to reports</Button>
        }
      >
        <View className="flex-1 items-center justify-center px-4 gap-3">
          <Spinner />
          <Text weight="semibold">
            {submissionPhase === "saving"
              ? "Saving your report on this device"
              : submissionPhase === "sending"
                ? "Sending your saved report"
                : "Checking ticket confirmation"}
          </Text>
          <Text muted size="sm" className="text-center">
            Once saved, you can return to Reports while submission finishes. Your evidence stays in the queue if the connection changes.
          </Text>
        </View>
      </ReportPage>
    );
  return (
    <>
      <ReportPage
        title="New report"
        onBack={requestClose}
        step={{ current: step, total: 6, label: stepLabels[step - 1] }}
        guideReport={!metaLoading && !metaError && !stale}
        footer={
          <>
            {step === 6 ? (
              <Text size="xs" muted>
                By submitting, you confirm these details are accurate and agree to the{" "}
                <Text size="xs" className="text-primary" accessibilityRole="link" onPress={() => router.push("/legal/terms")}>Terms and Conditions</Text>{" "}
                and{" "}<Text size="xs" className="text-primary" accessibilityRole="link" onPress={() => router.push("/legal/privacy")}>Privacy Policy</Text>.
              </Text>
            ) : null}
            <View className="flex-row gap-3">
              {step > 1 ? (
                <Button
                  variant="secondary"
                  onPress={back}
                  disabled={submitting}
                  accessibilityLabel={
                    editingReview ? "Back to review" : "Previous step"
                  }
                >
                  Back
                </Button>
              ) : null}
              <Button
                className="flex-1 rounded-2xl"
                loading={submitting}
                disabled={metaLoading || stale || pickerBusy || !accountReady}
                onPress={continueStep}
              >
                {editingReview
                  ? "Save changes"
                  : step === 6
                    ? "Submit report"
                    : "Continue"}
              </Button>
            </View>
          </>
        }
      >
        {metaLoading ? (
          <ContentSkeleton layout="form" count={2} label="Loading report form" />
        ) : metaError ? (
          <View className="gap-3 rounded-xl bg-card p-4">
            <Text accessibilityRole="alert">{metaError}</Text>
            <Button onPress={() => setMetaRetry((current) => current + 1)}>
              Retry
            </Button>
          </View>
        ) : stale ? (
          <View className="gap-3 rounded-xl bg-card p-4">
            <Text weight="semibold">Account access changed</Text>
            <Text muted size="sm">
              This draft cannot be sent with another login or changed account
              access. Refresh before starting again. Saved queue evidence is
              kept.
            </Text>
            <Button
              loading={submitting}
              onPress={() => {
                void refreshConsumerAccount()
                  .then(() => setConfirm("restart"))
                  .catch(() =>
                    setSubmitError(
                      "Could not refresh account access. Connect and retry.",
                    ),
                  );
              }}
            >
              Refresh account access
            </Button>
          </View>
        ) : (
          <>
            {step === 1 ? (
              <>
                <Heading description="Choose the service account connected to this issue.">
                  Which ALECO account?
                </Heading>
                <RadioGroup variant="card" value={accountId ?? undefined} onValueChange={selectAccount}
                  disabled={submitting || pickerBusy} accessibilityLabel="ALECO service account">
                  {accounts.map(account => <RadioGroup.Item key={account.id} value={account.id}
                    label={account.registeredName}
                    description={[(account.accountNumber ? "ALECO " + account.accountNumber : "Number unavailable"), account.address ?? "Service address unavailable"].join("\n")} />)}
                </RadioGroup>
                {!accounts.length && !accountLoading ? (
                  <Text muted>
                    No linked service account is available. Refresh your account
                    access.
                  </Text>
                ) : null}
                {profileLoading || accountLoading ? (
                  <View className="flex-row items-center gap-2">
                    <Spinner size="sm" />
                    <Text muted size="sm">
                      Loading account details
                    </Text>
                  </View>
                ) : profileError ? (
                  <>
                    <Text
                      accessibilityRole="alert"
                      className="text-destructive"
                      size="sm"
                    >
                      {profileError.message}
                    </Text>
                    <Button
                      variant="secondary"
                      onPress={() => void reloadProfile({ forceNetwork: true })}
                    >
                      Retry account details
                    </Button>
                  </>
                ) : null}
                {accountReady && !(fixtures ? selected?.accountNumber : profile?.accountNumber) ? <Input
                    label="Account number"
                    value={accountReady ? form.accountNumber : selected?.accountNumber ?? ""}
                    disabled={submitting || pickerBusy}
                    onChangeText={(value) => update("accountNumber", value)}
                    isRequired
                    errorMessage={attempted ? errors.accountNumber : undefined}
                    description={
                      fixtures || profile?.accountNumber
                        ? "Confirmed from your linked service account"
                        : "Enter the account number for this linked service account"
                    }
                  /> : null}
              </>
            ) : null}
            {step === 2 ? (
              <>
                {outageRead.busy ? <Text muted size="sm">Checking matching outage notices…</Text> : outageRead.data?.enabled && !outageRead.data.isStale && outageRead.data.canAcknowledge && outageRead.data.items.some(item => item.state === "active") ? <Text muted size="sm">A current official notice may describe this issue.</Text> : null}
                <Heading
                  description={
                    issueView === "category"
                      ? "Select a category to continue."
                      : "Select a report type to continue."
                  }
                >
                  {issueView === "category"
                    ? "What’s the issue?"
                    : category
                      ? formatComplaintCategoryTitle(category.title)
                      : "Select type"}
                </Heading>
                <SearchField value={issueQuery} onChangeText={setIssueQuery} placeholder="Search categories and report types" />
                {!(issueView === "category" ? options.categories.length : options.types.length) && issueQuery.trim() ? <Text muted size="sm" accessibilityLiveRegion="polite">No matching issues. Try another word or clear the search.</Text> : null}
                {issueView === "category" ? (
                  <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                    {options.categories.map((item) => {
                      const Icon = categoryIcons[meta.categories.indexOf(item) % categoryIcons.length];
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setIssueQuery("");
                            selectIssue(
                              item.id,
                              singleCategoryTypeId(meta.types, item.id),
                            );
                          }}
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: form.categoryId === item.id,
                          }}
                          className={`rounded-xl p-4 gap-3 ${form.categoryId === item.id ? "bg-accent" : "bg-card"}`}
                          style={{ width: "48%", minHeight: 106 }}
                        >
                          <Icon
                            size={24}
                            color={
                              form.categoryId === item.id ? primary : muted
                            }
                          />
                          <Text size="sm" weight="semibold">
                            {formatComplaintCategoryTitle(item.title)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : category ? (
                  <>
                    <Field
                      required
                      invalid={attempted && Boolean(errors.typeId)}
                    >
                      <Field.Label>Report type</Field.Label>
                      <RadioGroup
                        className="gap-3"
                        variant="card" value={form.typeId} onValueChange={id => selectIssue(form.categoryId, id)}
                        accessibilityLabel="Report type"
                      >
                        {options.types.map(item => <RadioGroup.Item key={item.id} value={item.id} label={item.title} description={item.description ?? undefined}
                          accessibilityHint={editingReview ? "Select, then press Continue to return to review" : "Select, then press Continue to choose the issue location"} />)}
                        {!types.length ? (
                          <Text size="sm" muted>
                            No report types are available for this category. Choose another category or refresh the form.
                          </Text>
                        ) : null}
                      </RadioGroup>
                      {attempted && errors.typeId ? (
                        <Field.Error>{errors.typeId}</Field.Error>
                      ) : null}
                    </Field>
                    <Button
                      variant="ghost"
                      onPress={() => { setIssueView("category"); setIssueQuery(""); }}
                    >
                      Change category
                    </Button>
                  </>
                ) : null}
              </>
            ) : null}
            {step === 3 ? (
              <>
                <Heading>Where is the issue?</Heading>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.useHomeAddress }}
                  onPress={() => {
                    if (form.useHomeAddress) {
                      manualLocation.current = manualLocation.current ?? {};
                      setForm((current) => ({
                        ...current,
                        useHomeAddress: false,
                        municipalityCode: "",
                        barangayPsgc: "",
                        latitude: null,
                        longitude: null,
                        locationVerified: false,
                        purok: "",
                        landmark: "",
                        ...manualLocation.current,
                      }));
                    } else {
                      const coordinates = readReportCoordinates(
                        profile?.homeCoordinates,
                      );
                      manualLocation.current = {
                        municipalityCode: form.municipalityCode,
                        barangayPsgc: form.barangayPsgc,
                        latitude: form.latitude,
                        longitude: form.longitude,
                        locationVerified: form.locationVerified,
                        purok: form.purok,
                        landmark: form.landmark,
                      };
                      setForm((current) => ({
                        ...current,
                        useHomeAddress: true,
                        ...(fixtures
                          ? creationFixtureLocation
                          : resolveHomeReportLocation(
                              meta,
                              profile,
                              coordinates
                                ? findAlbayBarangay(
                                    coordinates.latitude,
                                    coordinates.longitude,
                                  )?.barangayPsgc
                                : null,
                            )),
                      }));
                    }
                  }}
                  className="flex-row items-center gap-3 rounded-xl bg-card p-4"
                >
                  <View
                    className={`h-5 w-5 rounded items-center justify-center ${form.useHomeAddress ? "bg-primary" : "bg-control"}`}
                  >
                    {form.useHomeAddress ? (
                      <Check size={14} color={primaryForeground} />
                    ) : null}
                  </View>
                  <Text size="sm">Use my saved Home Address</Text>
                </Pressable>
                {form.latitude != null && form.longitude != null ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Choose location on the full map" onPress={() => { setLocateOnOpen(false); setMapOpen(true); }}>
                  <View pointerEvents="none"><StaticLocationMap
                    latitude={form.latitude}
                    longitude={form.longitude}
                    label={address}
                    height={200}
                    fixture={fixtures}
                  /></View>
                  </Pressable>
                ) : null}
                <View className="gap-2 rounded-xl bg-card p-4">
                  <Text size="xs" muted>
                    Issue location
                  </Text>
                  <Text weight="semibold" size="sm">
                    {address || "Choose the location on the map"}
                  </Text>
                  <Text muted size="xs">
                    {form.locationVerified
                      ? "Location confirmed within Albay"
                      : "Location needs confirmation"}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <Button className="flex-1" variant="secondary" size="sm" startContent={<MapPin size={16} color={primary} />} onPress={() => { setLocateOnOpen(false); setMapOpen(true); }}>
                    Search map
                  </Button>
                  <Button className="flex-1" variant="secondary" size="sm" startContent={<LocateFixed size={16} color={primary} />} onPress={() => { setLocateOnOpen(true); setMapOpen(true); }}>
                    My location
                  </Button>
                </View>
                <Input
                  label="Purok / street"
                  isRequired
                  maxLength={reportLimits.purok}
                  errorMessage={attempted ? errors.purok : undefined}
                  value={form.purok}
                  onChangeText={(value) => update("purok", value)}
                />
                <Input
                  label="Landmark (optional)"
                  maxLength={reportLimits.landmark}
                  errorMessage={attempted ? errors.landmark : undefined}
                  value={form.landmark}
                  onChangeText={(value) => update("landmark", value)}
                />
              </>
            ) : null}
            {step === 4 ? (
              <>
                {form.serviceRequestKind ? <ServiceRequestFields kind={form.serviceRequestKind} requirements={meta.serviceRequestKinds?.find(item => item.kind === form.serviceRequestKind)?.requirements} requestedDate={form.requestedServiceDate ?? ""} onChange={value => setForm(current => ({ ...current, requestedServiceDate: value }))} error={attempted ? errors.requestedServiceDate : undefined} disabled={submitting} /> : null}
                <Heading>Describe the issue</Heading>
                {textField(
                  "categoryDescription",
                  category?.descriptionLabel ?? "Description",
                  Boolean(category?.requiresDescription),
                )}
                {type?.requiresDescription
                  ? textField(
                      "typeDescription",
                      type.descriptionLabel ?? "Report type details",
                      true,
                    )
                  : null}
                {type?.requiresKwhmTransfer ? (
                  <>
                    {textField(
                      "currentRegisteredName",
                      "Current registered name",
                      true,
                      false,
                    )}
                    {textField(
                      "requestedRegisteredName",
                      "Requested registered name",
                      true,
                      false,
                    )}
                  </>
                ) : null}
                {textField("desiredAction", "Action Desired")}
              </>
            ) : null}
            {step === 5 ? (
              <>
                <Heading>Add photos</Heading>
                {attempted && errors.evidence ? (
                  <Card className="flex-row items-start gap-2 bg-destructive-subtle p-3" accessibilityRole="alert">
                    <TriangleAlert size={18} color={danger} />
                    <View className="flex-1 gap-1">
                      <Text size="sm" weight="semibold" className="text-destructive">Photo required</Text>
                      <Text size="xs" className="text-destructive">{errors.evidence}</Text>
                    </View>
                  </Card>
                ) : null}
                {fixtures ? (
                  <Field>
                    <Field.Label>Visual fixture photo state</Field.Label>
                    <Select
                      presentation="inline"
                      placeholder="Preview an evidence state"
                      onValueChange={previewPhotos}
                    >
                      <Select.Item
                        value="ready"
                        label="Three ready photos / maximum"
                      />
                      <Select.Item value="preparing" label="Photos preparing" />
                      <Select.Item value="failed" label="Preparation failed" />
                      <Select.Item value="removed" label="Photos removed" />
                    </Select>
                  </Field>
                ) : null}
                <View className="gap-3 rounded-xl bg-card p-4">
                  <Text size="sm" weight="semibold">
                    Attach {reportLimits.evidenceMin}–{reportLimits.evidenceMax}{" "}
                    photos
                  </Text>
                  <Text muted size="xs">
                    Each prepared photo must be 5 MB or smaller.
                  </Text>
                    <FileUpload
                      key={reportId.current + ":" + photoGeneration}
                      value={uploadFiles}
                      onValueChange={changePhotos}
                      sources={["camera", "library"]}
                      sourceTitle="Add evidence photos"
                      accept={["image/*"]}
                      multiple
                      maxFiles={reportLimits.evidenceMax}
                      image={{ quality: 1 }}
                      disabled={submitting || !scopeCurrent || (PANELUI_PREVIEW && !fixtures)}
                      onError={(error) => setPhotoError(error.message)}
                      onReject={(rejections) => setPhotoError(rejections.map((entry) => entry.message).join(" "))}
                    >
                      <FileUpload.Grid columns={3} placeholders addLabel="Add photos" />
                    </FileUpload>
                  <Text muted size="xs">{form.photoUploads.length} photos added</Text>
                  {form.photoUploads.map((photo) => photo.error ? (
                    <Text key={photo.id} size="xs" className="text-destructive" accessibilityRole="alert">{photo.error}</Text>
                  ) : null)}
                </View>
                {photoError ? (
                  <Text
                    size="sm"
                    className="text-destructive"
                    accessibilityRole="alert"
                  >
                    {photoError}
                  </Text>
                ) : null}
              </>
            ) : null}
            {step === 6 ? (
              <>
                <Heading description="Check your report before sending to ALECO.">
                  Review & submit
                </Heading>
                <View className="rounded-xl bg-card p-3 gap-3">
                  <EditRow
                    title={category?.title ?? "Issue & type"}
                    onPress={() => edit(2)}
                  />
                  <Text size="sm" weight="semibold">
                    {type?.title}
                  </Text>
                  <EditRow title="Service account" onPress={() => edit(1)} />
                  <Text size="sm">{accountLabel}</Text>
                </View>
                <View className="rounded-xl bg-card p-3 gap-2">
                  <EditRow title="Location" onPress={() => edit(3)} />
                  <Text size="sm">{address}</Text>
                </View>
                <View className="rounded-xl bg-card p-3 gap-2">
                  <EditRow title="Report details" onPress={() => edit(4)} />
                  <Text size="sm">
                    {form.categoryDescription || "No additional description"}
                  </Text>
                  {form.typeDescription ? (
                    <Text size="sm">{form.typeDescription}</Text>
                  ) : null}
                  {type?.requiresKwhmTransfer ? (
                    <>
                      <Text muted size="xs">
                        Current registered name
                      </Text>
                      <Text size="sm">{form.currentRegisteredName}</Text>
                      <Text muted size="xs">
                        Requested registered name
                      </Text>
                      <Text size="sm">{form.requestedRegisteredName}</Text>
                    </>
                  ) : null}
                  <Text size="xs" muted>
                    Requested action
                  </Text>
                  <Text size="sm">{form.desiredAction || "Not specified"}</Text>
                  {form.serviceRequestKind ? <><Text size="xs" muted>Requested service date (not confirmed)</Text><Text size="sm">{form.requestedServiceDate || "No preference provided"}</Text></> : null}
                </View>
                <View className="rounded-xl bg-card p-3 gap-2">
                  <EditRow
                    title={`Attached photos (${readyPhotos.length})`}
                    onPress={() => edit(5)}
                  />
                  {photoStrip()}
                </View>
              </>
            ) : null}
          </>
        )}
        {attempted && summaryErrors.length ? (
          <Text
            accessibilityRole="alert"
            size="sm"
            className="text-destructive"
          >
            {summaryErrors.join("\n")}
          </Text>
        ) : null}
        {submitError ? (
          <View className="gap-2">
            <Text
              accessibilityRole="alert"
              size="sm"
              className="text-destructive"
            >
              {submitError}
            </Text>
            {queued.current ? (
              <Button
                variant="secondary"
                onPress={() => leave("/reports/queue")}
              >
                Open saved reports
              </Button>
            ) : null}
          </View>
        ) : null}
      </ReportPage>
      <Dialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Title>
            {confirm === "account"
              ? "Change service account?"
              : confirm === "issue"
                ? "Change report type?"
                : confirm === "restart"
                  ? "Start a new report?"
                  : "Discard this draft?"}
          </Dialog.Title>
          <Dialog.Description>
            {confirm === "account"
              ? "The issue, location, details, and photos will be reset for the other account."
              : confirm === "issue"
                ? "Details that belong to the old category or report type will be cleared. Your location, requested action, and photos are kept."
                : "Unsaved details and photos will be removed. Reports already saved in the queue are kept."}
          </Dialog.Description>
          <Dialog.Footer>
            <Button variant="secondary" onPress={() => setConfirm(null)}>
              Keep draft
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                if (confirm === "discard") {
                  cleanDraft();
                  closeDraft();
                } else if (confirm === "issue" && nextIssue) {
                  setConfirm(null);
                  applyIssue(nextIssue.categoryId, nextIssue.typeId);
                } else reset(confirm === "account" ? nextAccount : null);
              }}
            >
              {confirm === "account"
                ? "Change account"
                : confirm === "issue"
                  ? "Change type"
                  : confirm === "restart"
                    ? "Start again"
                    : "Discard draft"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      <BottomSheet
        open={fixtureSubmit && scopeCurrent}
        onOpenChange={setFixtureSubmit}
      >
        <BottomSheet.Content size="auto">
          <BottomSheet.Header>
            <Text weight="semibold">Simulate submission</Text>
          </BottomSheet.Header>
          <BottomSheet.Body className="gap-3">
            <Text muted size="sm">
              Visual fixture only. No report or evidence will be sent.
            </Text>
            <Select
              presentation="inline"
              placeholder="Preview a submission stage"
              onValueChange={(value) => {
                setFixtureSubmit(false);
                setSubmissionPhase(value as "saving" | "sending" | "checking");
                setSubmitting(true);
              }}
            >
              <Select.Item value="saving" label="Saving locally" />
              <Select.Item value="sending" label="Sending saved report" />
              <Select.Item value="checking" label="Checking confirmation" />
            </Select>
            <Button
              variant="outline"
              onPress={() => {
                setFixtureSubmit(false);
                setSubmitError(
                  "Simulated local save failure. Your draft is kept. Try submitting again.",
                );
              }}
            >
              Show local save failure / retry
            </Button>
            <Button
              onPress={() => {
                setFixtureSubmit(false);
                setReceipt({
                  ticketId: "fixture-1",
                  ticketNumber: "TK-2026-1043",
                });
              }}
            >
              Show confirmed receipt
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setFixtureSubmit(false);
                leave("/reports/queue");
              }}
            >
              Show saved on device
            </Button>
          </BottomSheet.Body>
        </BottomSheet.Content>
      </BottomSheet>
      <EvidencePhotoViewer
        photos={form.photoUploads}
        initialIndex={viewerIndex ?? 0}
        open={viewerIndex != null && scopeCurrent}
        onClose={() => setViewerIndex(null)}
      />
      <ReportLocationPicker
        open={mapOpen && scopeCurrent}
        meta={meta}
        initialCoordinates={
          form.latitude != null && form.longitude != null
            ? { latitude: form.latitude, longitude: form.longitude }
            : null
        }
        locateOnOpen={locateOnOpen}
        fixture={fixtures}
        onClose={() => setMapOpen(false)}
        onConfirm={(location) => {
          manualLocation.current = location;
          setForm((current) => ({
            ...current,
            ...location,
            useHomeAddress: false,
          }));
          setMapOpen(false);
        }}
      />
    </>
  );
}
