import { ChildAppBar } from "@/components/child-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectScrollView,
  SelectTrigger,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { useConsumerProfileContext } from "@/context/consumer-profile-context";
import { useReportQueue } from "@/context/report-queue-context";
import { AlbayLocationPickerSheet } from "@/features/maps/albay-location-picker-sheet";
import { StaticLocationMap } from "@/features/maps/static-location-map";
import {
  readReportCoordinates,
  resolveHomeReportLocation,
} from "@/features/reports/address";
import { findAlbayBarangay } from "@/features/reports/albay-barangays";
import { EvidencePhotoViewer } from "@/features/reports/components/evidence-photo-viewer";
import {
  conditionalReportPayload,
  hasCurrentReportContract,
  isWithinAlbay,
  reportLimits,
  validateReportForm,
} from "@/features/reports/contract";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  initialComplaintForm,
  type ComplaintFormState,
  type ComplaintMeta,
} from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { createLocalReportId, enqueueReport } from "@/services/report-queue";
import { emitComplaintSubmissionToast } from "@/services/report-submission-events";
import { fetchComplaintMeta } from "@/services/reports";
import {
  deleteEvidencePhoto,
  prepareEvidencePhoto,
} from "@/utils/evidence-image-processing";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  Images,
  MapPin,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Platform,
  View,
  useWindowDimensions,
} from "react-native";
import type { KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const minEvidencePhotos = reportLimits.evidenceMin;
const maxEvidencePhotos = reportLimits.evidenceMax;

type SelectOption = {
  value: string;
  label: string;
};
type ReportLocationSnapshot = {
  municipalityCode: string;
  barangayPsgc: string;
  purok: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  locationVerified: boolean;
};

const emptyReportLocation: ReportLocationSnapshot = {
  municipalityCode: "",
  barangayPsgc: "",
  purok: "",
  landmark: "",
  latitude: null,
  longitude: null,
  locationVerified: false,
};

function snapshotReportLocation(
  form: ComplaintFormState,
): ReportLocationSnapshot {
  return {
    municipalityCode: form.municipalityCode,
    barangayPsgc: form.barangayPsgc,
    purok: form.purok,
    landmark: form.landmark,
    latitude: form.latitude,
    longitude: form.longitude,
    locationVerified: form.locationVerified,
  };
}

function isVerifiedReportLocation(
  location: ReportLocationSnapshot | null,
): location is ReportLocationSnapshot {
  return Boolean(
    location &&
    location.locationVerified &&
    location.latitude != null &&
    location.longitude != null &&
    location.municipalityCode &&
    location.barangayPsgc,
  );
}
function ReportInput({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  isRequired,
  isInvalid,
  error,
  isDisabled,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  error?: string;
  isDisabled?: boolean;
  maxLength?: number;
}) {
  return (
    <FormControl
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <FormControlLabel>
        <FormControlLabelText>{label}</FormControlLabelText>
      </FormControlLabel>
      {multiline ? (
        <Textarea
          className="rounded-xl"
          isDisabled={isDisabled}
          isInvalid={isInvalid}
        >
          <TextareaInput
            value={value}
            placeholder={placeholder}
            onChangeText={onChangeText}
            maxLength={maxLength}
          />
        </Textarea>
      ) : (
        <Input
          className="h-12 rounded-xl"
          isDisabled={isDisabled}
          isInvalid={isInvalid}
        >
          <InputField
            value={value}
            placeholder={placeholder}
            onChangeText={onChangeText}
            maxLength={maxLength}
          />
        </Input>
      )}
      {isInvalid && error ? (
        <FormControlError>
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      ) : null}
    </FormControl>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  description,
  options,
  onChange,
  isRequired,
  isInvalid,
  error,
  isDisabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  description: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  error?: string;
  isDisabled?: boolean;
}) {
  const selectedOptionLabel = options.find(
    (option) => option.value === value,
  )?.label;

  return (
    <FormControl
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <FormControlLabel>
        <FormControlLabelText>{label}</FormControlLabelText>
      </FormControlLabel>
      <Select
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        isRequired={isRequired}
        initialLabel={selectedOptionLabel}
        selectedValue={value}
        onValueChange={(nextValue) => nextValue && onChange(nextValue)}
      >
        <SelectTrigger className="h-12 rounded-xl">
          <SelectInput
            placeholder={placeholder}
            value={selectedOptionLabel}
            className="flex-1"
          />
          <SelectIcon as={ChevronDown} className="mr-3" />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent
            className="max-h-[50vh]"
            title={label}
            description={description}
          >
            <SelectScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </SelectScrollView>
          </SelectContent>
        </SelectPortal>
      </Select>
      {isInvalid && error ? (
        <FormControlError>
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      ) : null}
    </FormControl>
  );
}

function findHomeAddress(
  meta: ComplaintMeta,
  profile: ReturnType<typeof useConsumerProfileContext>["profile"],
) {
  const coordinates = readReportCoordinates(profile?.homeCoordinates);
  const detectedBarangay = coordinates
    ? findAlbayBarangay(coordinates.latitude, coordinates.longitude)
    : null;

  return resolveHomeReportLocation(
    meta,
    profile,
    detectedBarangay?.barangayPsgc,
  );
}

export default function NewComplaintRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { session } = useAuthSession();
  const { sync: syncQueue } = useReportQueue();
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const reportIdRef = useRef(createLocalReportId());
  const isLeavingToParentRef = useRef(false);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const lastManualLocationRef = useRef<ReportLocationSnapshot | null>(null);
  const [mutedColor, successColor, accentColor] = useAppColors([
    "muted",
    "success",
    "primary",
  ]);
  const { accountContext } = useConsumerAccount();
  const { profile, setServiceAccountId } = useConsumerProfileContext();
  const accounts = useMemo(() => accountContext?.accounts ?? [], [accountContext?.accounts]);
  const hasMultipleAccounts = accounts.length > 1;
  const [selectedServiceAccountId, setSelectedServiceAccountId] = useState<string | null>(null);
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [isMapSheetOpen, setIsMapSheetOpen] = useState(false);
  const [isEvidenceSourcePickerOpen, setIsEvidenceSourcePickerOpen] =
    useState(false);

  const [evidencePickerError, setEvidencePickerError] = useState<string | null>(
    null,
  );
  const [step, setStep] = useState(1);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [submitProgressValue, setSubmitProgressValue] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState<number | null>(null);
  const [form, setForm] = useState<ComplaintFormState>(initialComplaintForm);
  const childBottomPadding = Math.max(insets.bottom, 16) + (step < 5 ? 50 : 32);
  const activeServiceAccountId = selectedServiceAccountId && accounts.some((account) => account.id === selectedServiceAccountId)
    ? selectedServiceAccountId
    : accountContext?.defaultServiceAccountId ?? session?.user.id ?? null;

  useEffect(() => {
    if (!activeServiceAccountId || selectedServiceAccountId === activeServiceAccountId) return;
    setSelectedServiceAccountId(activeServiceAccountId);
    setServiceAccountId(activeServiceAccountId);
  }, [accounts, activeServiceAccountId, selectedServiceAccountId, setServiceAccountId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchComplaintMeta({ force: true })
      .then((nextMeta) => {
        if (!hasCurrentReportContract(nextMeta)) {
          throw new Error(
            "Connect to the internet to update the report form before continuing.",
          );
        }
        if (isMounted) {
          setMeta(nextMeta);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "Failed to load report form.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeServiceAccountId && profile?.profileId !== activeServiceAccountId) return;
    const homeAddress = findHomeAddress(meta, profile);
    setForm((current) => ({
      ...current,
      serviceAccountId: activeServiceAccountId,
      accessRevision: accountContext?.accessRevision ?? 0,
      accountNumber: profile?.accountNumber ?? current.accountNumber,
      ...(current.useHomeAddress
        ? {
            ...homeAddress,
          }
        : {}),
    }));
    if (isAccountSwitching && profile?.profileId === activeServiceAccountId) setIsAccountSwitching(false);
  }, [accountContext?.accessRevision, activeServiceAccountId, isAccountSwitching, meta, profile]);

  const selectedCategory = meta.categories.find(
    (category) => category.id === form.categoryId,
  );
  const selectedType = meta.types.find((type) => type.id === form.typeId);
  const selectedMunicipality = meta.municipalities.find(
    (municipality) => municipality.code === form.municipalityCode,
  );
  const selectedBarangay = meta.barangays.find(
    (barangay) => barangay.code === form.barangayPsgc,
  );
  const formattedAddress = [
    form.purok,
    selectedBarangay?.name,
    selectedMunicipality?.name,
    form.landmark,
  ]
    .filter(Boolean)
    .join(", ");
  const displayName = profile?.fullName || session?.user.name || "Consumer";
  const readyPhotos = form.photoUploads.filter(
    (photo) => photo.status === "ready",
  );
  const mapPickerInitialCoordinates =
    form.latitude != null && form.longitude != null
      ? { latitude: form.latitude, longitude: form.longitude }
      : readReportCoordinates(profile?.homeCoordinates);

  const reportTypeOptions = meta.types
    .filter((type) => type.categoryId === form.categoryId)
    .map((type) => ({
      value: type.id,
      label: type.title,
    }));

  const formErrors = validateReportForm(
    form,
    selectedCategory,
    selectedType,
    meta,
  );

  const title =
    step === 1
      ? "Report an issue"
      : step === 2
        ? "Location and Account"
        : step === 3
          ? "Details and Evidence"
          : step === 4
            ? "Review Report"
            : "To be verified";
  const canGoNext = !isAccountSwitching &&
    step === 1
      ? !formErrors.categoryId
      : step === 2
        ? ![
            formErrors.typeId,
            formErrors.accountNumber,
            formErrors.municipalityCode,
            formErrors.barangayPsgc,
            formErrors.location,
          ].some(Boolean)
        : step === 3
          ? ![
              formErrors.categoryDescription,
              formErrors.typeDescription,
              formErrors.currentRegisteredName,
              formErrors.requestedRegisteredName,
              formErrors.desiredAction,
              formErrors.evidence,
            ].some(Boolean)
          : true;
  const showErrors = attemptedStep === step && !canGoNext;

  const updateForm = <Key extends keyof ComplaintFormState>(
    key: Key,
    value: ComplaintFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const switchReportAccount = (nextServiceAccountId: string) => {
    if (isSubmitting || nextServiceAccountId === activeServiceAccountId) return;
    for (const photo of form.photoUploads) deleteEvidencePhoto(photo.uri);
    reportIdRef.current = createLocalReportId();
    lastManualLocationRef.current = null;
    setSelectedServiceAccountId(nextServiceAccountId);
    setServiceAccountId(nextServiceAccountId);
    setIsAccountSwitching(true);
    setIsMapSheetOpen(false);
    setIsEvidenceSourcePickerOpen(false);
    setViewerPhotoIndex(null);
    setEvidencePickerError(null);
    setSubmitError(null);
    setAttemptedStep(null);
    setStep(1);
    setForm({ ...initialComplaintForm, serviceAccountId: nextServiceAccountId, accessRevision: accountContext?.accessRevision ?? 0 });
  };

  const prepareSelectedPhoto = async (uri: string) => {
    const photoId = createLocalReportId();
    setForm((current) => ({
      ...current,
      photos: [...current.photos, uri],
      photoUploads: [
        ...current.photoUploads,
        {
          id: photoId,
          uri,
          size: null,
          status: "processing",
        },
      ],
    }));

    try {
      const prepared = await prepareEvidencePhoto(
        uri,
        reportIdRef.current,
        photoId,
      );

      setForm((current) => {
        const photoStillSelected = current.photoUploads.some(
          (photo) => photo.id === photoId,
        );

        if (!photoStillSelected) {
          deleteEvidencePhoto(prepared.uri);
          return current;
        }

        return {
          ...current,
          photoUploads: current.photoUploads.map((photo) =>
            photo.id === photoId
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
      setForm((current) => ({
        ...current,
        photoUploads: current.photoUploads.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                status: "failed",
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to upload photo.",
              }
            : photo,
        ),
      }));
    }
  };

  const removePhoto = (photoId: string) => {
    setForm((current) => {
      const remaining = current.photoUploads.filter((photo) => {
        if (photo.id !== photoId) return true;
        if (photo.status === "ready") deleteEvidencePhoto(photo.uri);
        return false;
      });
      return {
        ...current,
        photos: remaining.map((photo) => photo.uri),
        photoUploads: remaining,
      };
    });
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    if (!session) {
      isLeavingToParentRef.current = true;
      router.replace("/sign-in");
      return;
    }
    if (isAccountSwitching || !form.serviceAccountId) {
      setSubmitError("Wait for the selected ALECO account to finish loading before submitting.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitProgress("Saving report securely...");
    setSubmitProgressValue(15);
    setSubmitError(null);

    try {
      const validationErrors = validateReportForm(
        form,
        selectedCategory,
        selectedType,
        meta,
      );
      if (Object.keys(validationErrors).length > 0) {
        throw new Error("Review the required report fields before submitting.");
      }
      const evidence = form.photoUploads.filter(
        (photo) => photo.status === "ready" && photo.size != null,
      );
      if (evidence.length < minEvidencePhotos) {
        throw new Error("Wait until evidence photos finish processing.");
      }
      const reportId = reportIdRef.current;
      const conditionalDetails = conditionalReportPayload(form);
      await enqueueReport({
        id: reportId,
        idempotencyKey: `mobile:${reportId}`,
        userId: session.user.id,
        identityUserId: accountContext?.identityUserId ?? session.user.id,
        serviceAccountId: form.serviceAccountId,
        accessRevision: form.accessRevision ?? accountContext?.accessRevision ?? 0,
        title: selectedType?.title ?? selectedCategory?.title ?? "Report",
        evidence: evidence.map(({ id, uri, size }) => ({
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
          serviceAccountId: form.serviceAccountId,
          accessRevision: form.accessRevision ?? accountContext?.accessRevision ?? 0,
          ...conditionalDetails,
        },
      });
      setSubmitProgressValue(40);
      setSubmitProgress("Uploading evidence and creating your ticket...");
      setSubmitProgressValue(65);
      const results = await syncQueue(false);
      const result = results.find((item) => item.id === reportId);

      if (result?.status === "submitted") {
        setSubmitProgressValue(100);
        if (isMountedRef.current) {
          setForm((current) => ({
            ...current,
            ticketId: result.ticketId,
            ticketNumber: result.ticketNumber,
          }));
          setSubmitProgress("");
          setStep(5);
        }
      } else if (result?.status === "failed") {
        throw new Error(result.lastError ?? "Report submission failed.");
      } else {
        emitComplaintSubmissionToast({
          message:
            "Report saved. Ticket Number pending until your connection returns.",
          status: "info",
        });
        if (isMountedRef.current) {
          isLeavingToParentRef.current = true;
          router.replace("/reports/queue");
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit report.";
      setSubmitError(message);
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
        setSubmitProgress("");
        setSubmitProgressValue(0);
      }
      isSubmittingRef.current = false;
    }
  };

  const navigateToComplaintsParent = useCallback(() => {
    isLeavingToParentRef.current = true;
    router.replace("/reports");
  }, [router]);

  const viewSubmittedReport = () => {
    if (!form.ticketId) {
      navigateToComplaintsParent();
      return;
    }

    isLeavingToParentRef.current = true;
    router.replace({
      pathname: "/report/[id]",
      params: { id: form.ticketId },
    });
  };

  const handleBackPress = useCallback(() => {
    if (isSubmitting) return;

    if (isEvidenceSourcePickerOpen) {
      setIsEvidenceSourcePickerOpen(false);
      return;
    }

    if (isMapSheetOpen) {
      if (__DEV__) {
        console.log("[nav] complaints map sheet back");
      }
      setIsMapSheetOpen(false);
      return;
    }

    if (step === 5) {
      if (__DEV__) {
        console.log("[nav] complaints success back to parent");
      }
      navigateToComplaintsParent();
      return;
    }

    if (step > 1) {
      if (__DEV__) {
        console.log("[nav] complaints previous step", { step });
      }
      setAttemptedStep(null);
      setStep((current) => Math.max(1, current - 1));
      return;
    }

    if (__DEV__) {
      console.log("[nav] complaints child back to parent");
    }
    navigateToComplaintsParent();
  }, [
    isEvidenceSourcePickerOpen,
    isMapSheetOpen,
    isSubmitting,
    navigateToComplaintsParent,
    step,
  ]);

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

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (isLeavingToParentRef.current) {
          return;
        }

        if (__DEV__) {
          console.log("[nav] complaints beforeRemove intercepted");
        }
        event.preventDefault();
        handleBackPress();
      }),
    [handleBackPress, navigation],
  );

  const handleNext = () => {
    if (!canGoNext) {
      setAttemptedStep(step);
      return;
    }

    setAttemptedStep(null);

    if (step === 4) {
      void handleSubmit();
      return;
    }

    setStep((current) => Math.min(5, current + 1));
  };

  const availableEvidenceSlots = () =>
    Math.max(0, maxEvidencePhotos - form.photoUploads.length);

  const openEvidenceSourcePicker = () => {
    if (availableEvidenceSlots() <= 0) return;

    setEvidencePickerError(null);
    setIsEvidenceSourcePickerOpen(true);
  };

  const runAfterEvidenceSourcePickerCloses = (action: () => void) => {
    setIsEvidenceSourcePickerOpen(false);

    setTimeout(() => {
      action();
    }, 250);
  };

  const takeEvidencePhoto = async () => {
    if (availableEvidenceSlots() <= 0) return;

    setEvidencePickerError(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setEvidencePickerError(
          "Camera access is required to take an evidence photo.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      void prepareSelectedPhoto(result.assets[0].uri);
    } catch {
      setEvidencePickerError(
        "Camera could not be opened. Try again or choose from gallery.",
      );
    }
  };

  const chooseEvidencePhotos = async () => {
    const availableSlots = availableEvidenceSlots();

    if (availableSlots <= 0) return;

    setEvidencePickerError(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setEvidencePickerError(
          "Photo library access is required to choose evidence photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: availableSlots,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      result.assets
        .slice(0, availableSlots)
        .forEach((asset) => void prepareSelectedPhoto(asset.uri));
    } catch {
      setEvidencePickerError("Photo library could not be opened. Try again.");
    }
  };
  const handleHomeAddressPress = () => {
    const homeAddress = findHomeAddress(meta, profile);

    setForm((current) => {
      // HOME IS CURRENTLY OFF:
      // switch to Home Address.
      if (!current.useHomeAddress) {
        // Preserve the current manual location so it can
        // be restored when Home Address is turned off.
        const currentManualLocation = snapshotReportLocation(current);

        if (isVerifiedReportLocation(currentManualLocation)) {
          lastManualLocationRef.current = currentManualLocation;
        }

        return {
          ...current,

          useHomeAddress: true,

          ...homeAddress,
        };
      }

      // HOME IS CURRENTLY ON:
      // return to the last manually confirmed report location.
      const previousManualLocation = lastManualLocationRef.current;

      return {
        ...current,

        useHomeAddress: false,

        ...(isVerifiedReportLocation(previousManualLocation)
          ? previousManualLocation
          : emptyReportLocation),
      };
    });
  };

  const openMapPicker = () => {
    setIsMapSheetOpen(true);
  };

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ChildAppBar
        title={title}
        description={
          selectedCategory
            ? formatComplaintCategoryTitle(selectedCategory.title)
            : "Choose the closest category"
        }
        onBack={handleBackPress}
        backAccessibilityLabel={step > 1 ? "Previous step" : "Back to reports"}
      />
      <KeyboardAwareScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        bottomOffset={Math.max(insets.bottom, 20) + 10}
        extraKeyboardSpace={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          gap: 16,
          paddingBottom: childBottomPadding,
        }}
        scrollIndicatorInsets={{ bottom: childBottomPadding }}
      >
        {hasMultipleAccounts ? (
          <View className="rounded-xl border border-border bg-card p-3">
            <SelectField
              label="Report for"
              value={activeServiceAccountId ?? ""}
              placeholder="Choose an ALECO account"
              description="Select the ALECO account this report is for. Changing accounts clears this draft to keep its location and evidence private."
              options={accounts.map((account) => ({
                value: account.id,
                label: `${account.accountNumber ?? "Account number unavailable"} — ${account.registeredName}${account.isDefault ? " (Default)" : ""}`,
              }))}
              onChange={switchReportAccount}
              isDisabled={isSubmitting || isAccountSwitching}
            />
            {isAccountSwitching ? <Text accessibilityLiveRegion="polite" className="mt-2 text-xs text-muted-foreground">Loading this account&apos;s saved location…</Text> : null}
          </View>
        ) : null}
        <View className="gap-2">
          <Progress value={(step / 5) * 100} className="h-2.5">
            <ProgressFilledTrack className="rounded-full" />
          </Progress>
        </View>

        {submitError ? (
          <Text className="text-sm text-destructive">{submitError}</Text>
        ) : null}

        {step === 1 ? (
          <>
            <Text className="ml-2 text-sm font-semibold text-muted-foreground">
              Category
            </Text>
            {showErrors && formErrors.categoryId ? (
              <Text className="ml-2 text-xs text-destructive">
                {formErrors.categoryId}
              </Text>
            ) : null}
            <View className="gap-3">
              {meta.categories.map((category) => {
                const categoryTypes = meta.types.filter(
                  (type) => type.categoryId === category.id,
                );

                const defaultTypeId =
                  categoryTypes.length === 1 ? categoryTypes[0].id : "";
                const selected = form.categoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      setForm((current) => ({
                        ...current,
                        categoryId: category.id,
                        typeId: defaultTypeId,
                        categoryDescription: "",
                        typeDescription: "",
                        currentRegisteredName: "",
                        requestedRegisteredName: "",
                      }));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-19 flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                      selected
                        ? "border-primary bg-card border-2"
                        : "border-border bg-card"
                    }`}
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: category.color }}
                    >
                      {selected ? (
                        <Check size={20} color="white" />
                      ) : (
                        <View className="h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Heading size="sm">
                        {formatComplaintCategoryTitle(category.title)}
                      </Heading>
                      <Text className="mt-1 text-xs font-medium text-muted-foreground">
                        {category.description}
                      </Text>
                    </View>
                    {selected ? (
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
                        <Check size={15} color="white" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View className="flex-1 gap-4 rounded-lg border border-border bg-card p-4">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-muted-foreground">
                  Report type
                </Text>

                <SelectField
                  isRequired
                  label="Report type"
                  value={form.typeId}
                  placeholder="Select report type"
                  description={`Choose the issue type under ${selectedCategory?.title ?? "this category"}.`}
                  options={reportTypeOptions}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      typeId: value,
                      typeDescription: "",
                      currentRegisteredName: "",
                      requestedRegisteredName: "",
                    }))
                  }
                  isInvalid={showErrors && Boolean(formErrors.typeId)}
                  error={formErrors.typeId}
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-muted-foreground">
                  Account
                </Text>

                <ReportInput
                  isRequired
                  isDisabled
                  label="Account number"
                  value={form.accountNumber}
                  placeholder="100001321412634"
                  onChangeText={() => undefined}
                  isInvalid={showErrors && !form.accountNumber}
                  error="Account number is required."
                />
              </View>

              <View className="gap-3">
                <Text className="text-sm font-semibold text-muted-foreground">
                  Address
                </Text>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: form.useHomeAddress,
                  }}
                  accessibilityLabel="Use home address"
                  accessibilityHint={
                    form.useHomeAddress
                      ? "Turn off to return to your last selected report location"
                      : "Use the home address saved to your account"
                  }
                  onPress={handleHomeAddressPress}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-secondary p-4 active:opacity-80"
                >
                  <View
                    className={
                      form.useHomeAddress
                        ? "h-5 w-5 items-center justify-center rounded border border-primary bg-primary"
                        : "h-5 w-5 items-center justify-center rounded border border-input bg-background"
                    }
                  >
                    {form.useHomeAddress ? (
                      <Check size={14} color="white" />
                    ) : null}
                  </View>

                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      Use home address
                    </Text>

                    <Text className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {form.useHomeAddress
                        ? "Using the home location saved to your account."
                        : "Use the home location saved to your account."}
                    </Text>
                  </View>
                </Pressable>
                <View className="gap-3 rounded-xl border border-border bg-secondary p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <MapPin size={20} color={accentColor} />
                    </View>

                    <View className="flex-1">
                      <Text className="text-xs font-bold text-muted-foreground">
                        Report location
                      </Text>

                      {form.locationVerified &&
                      selectedBarangay &&
                      selectedMunicipality ? (
                        <>
                          <Text className="mt-1 text-base font-bold text-foreground">
                            {selectedBarangay.name}, {selectedMunicipality.name}
                          </Text>

                          <View className="mt-2 flex-row items-center gap-1.5">
                            <Check size={15} color={successColor} />

                            <Text className="text-xs font-semibold text-muted-foreground">
                              Location confirmed
                            </Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text className="mt-1 text-sm font-semibold text-foreground">
                            Choose where the problem is located
                          </Text>

                          <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                            We&apos;ll fill in the municipality and barangay for
                            you.
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  <Button
                    size="lg"
                    variant="default"
                    className="rounded-xl"
                    onPress={() => void openMapPicker()}
                  >
                    <ButtonIcon as={MapPin} height={18} width={18} />

                    <ButtonText>
                      {form.locationVerified
                        ? "Change location"
                        : "Choose location"}
                    </ButtonText>
                  </Button>
                </View>

                <ReportInput
                  isRequired
                  label="Purok/Street"
                  value={form.purok}
                  placeholder="Purok or street"
                  onChangeText={(value) => updateForm("purok", value)}
                  isInvalid={form.purok.trim() === "" && showErrors}
                />

                <ReportInput
                  label="Landmark"
                  value={form.landmark}
                  placeholder="Nearest landmark"
                  onChangeText={(value) => updateForm("landmark", value)}
                />

                {showErrors && formErrors.location ? (
                  <Text className="text-xs text-destructive">
                    {formErrors.location}
                  </Text>
                ) : null}
              </View>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View className="flex-1 gap-4 rounded-lg border border-border bg-card p-4">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-muted-foreground">
                  Report details
                </Text>
                {selectedCategory?.requiresDescription ? (
                  <ReportInput
                    isRequired
                    label={
                      selectedCategory.descriptionLabel ?? "Category details"
                    }
                    value={form.categoryDescription}
                    placeholder="Describe why this category applies"
                    multiline
                    maxLength={reportLimits.description}
                    onChangeText={(value) =>
                      updateForm("categoryDescription", value)
                    }
                    isInvalid={
                      showErrors && Boolean(formErrors.categoryDescription)
                    }
                    error={formErrors.categoryDescription}
                  />
                ) : null}
                {selectedType?.requiresDescription ? (
                  <ReportInput
                    isRequired
                    label={
                      selectedType.descriptionLabel ?? "Report type details"
                    }
                    value={form.typeDescription}
                    placeholder="Describe this specific report type"
                    multiline
                    maxLength={reportLimits.description}
                    onChangeText={(value) =>
                      updateForm("typeDescription", value)
                    }
                    isInvalid={
                      showErrors && Boolean(formErrors.typeDescription)
                    }
                    error={formErrors.typeDescription}
                  />
                ) : null}
                {selectedType?.requiresKwhmTransfer ? (
                  <View className="gap-3 rounded-lg border border-border bg-card p-4">
                    <View>
                      <Heading size="sm">Registered name transfer</Heading>
                      <Text className="mt-1 text-sm text-muted-foreground">
                        Enter names only. Account records are verified privately
                        by ALECO staff.
                      </Text>
                    </View>
                    <ReportInput
                      isRequired
                      label="Current registered name"
                      value={form.currentRegisteredName}
                      placeholder="Name currently on the account"
                      maxLength={reportLimits.registeredName}
                      onChangeText={(value) =>
                        updateForm("currentRegisteredName", value)
                      }
                      isInvalid={
                        showErrors && Boolean(formErrors.currentRegisteredName)
                      }
                      error={formErrors.currentRegisteredName}
                    />
                    <ReportInput
                      isRequired
                      label="Requested registered name"
                      value={form.requestedRegisteredName}
                      placeholder="New registered name"
                      maxLength={reportLimits.registeredName}
                      onChangeText={(value) =>
                        updateForm("requestedRegisteredName", value)
                      }
                      isInvalid={
                        showErrors &&
                        Boolean(formErrors.requestedRegisteredName)
                      }
                      error={formErrors.requestedRegisteredName}
                    />
                  </View>
                ) : null}
                <ReportInput
                  label="Action desired"
                  value={form.desiredAction}
                  placeholder="What action do you want?"
                  multiline
                  maxLength={reportLimits.actionDesired}
                  onChangeText={(value) => updateForm("desiredAction", value)}
                  isInvalid={showErrors && Boolean(formErrors.desiredAction)}
                  error={formErrors.desiredAction}
                />
                <View className="rounded-lg border border-border bg-secondary p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-foreground">
                      Evidence photos *
                    </Text>
                    <Text className="text-xs font-bold text-muted-foreground">
                      {form.photoUploads.length}/{maxEvidencePhotos}
                    </Text>
                  </View>
                  {evidencePickerError ? (
                    <Text
                      className="mt-2 text-xs text-destructive"
                      accessibilityLiveRegion="polite"
                    >
                      {evidencePickerError}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row gap-2">
                    {Array.from({ length: maxEvidencePhotos }, (_, index) => {
                      const photo = form.photoUploads[index];
                      return (
                        <Pressable
                          key={index}
                          onPress={photo ? undefined : openEvidenceSourcePicker}
                          accessibilityRole={photo ? undefined : "button"}
                          accessibilityLabel={
                            photo ? undefined : "Add evidence photo"
                          }
                          className={`aspect-square flex-1 items-center justify-center rounded-xl ${
                            photo ? "bg-accent" : "bg-background"
                          }`}
                        >
                          {photo ? (
                            <>
                              <Image
                                source={{ uri: photo.uri }}
                                className="h-full w-full rounded-xl"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                                onPress={() => removePhoto(photo.id)}
                                accessibilityLabel="Remove evidence photo"
                              >
                                <ButtonIcon
                                  as={CircleX}
                                  height={15}
                                  width={15}
                                />
                              </Button>
                              {photo.status !== "ready" ? (
                                <View className="absolute inset-0 items-center justify-center rounded-xl bg-black/45">
                                  <Text className="text-xs text-white">
                                    {photo.status === "failed"
                                      ? "Failed"
                                      : "Preparing"}
                                  </Text>
                                </View>
                              ) : null}
                            </>
                          ) : (
                            <Camera size={18} color={mutedColor} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  {showErrors && formErrors.evidence ? (
                    <Text className="mt-2 text-xs text-destructive">
                      {formErrors.evidence}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        ) : null}

        {step === 4 ? (
          <View className="gap-4 rounded-lg border border-border bg-card p-4">
            <Heading size="md">Review & Submit</Heading>
            {[
              ["Reported by", displayName],
              ["Category", selectedCategory?.title],
              ["Type", selectedType?.title],
              ["Address", formattedAddress],
              ...(selectedCategory?.requiresDescription
                ? [["Category details", form.categoryDescription]]
                : []),
              ...(selectedType?.requiresDescription
                ? [["Report type details", form.typeDescription]]
                : []),
              ...(selectedType?.requiresKwhmTransfer
                ? [
                    ["Current registered name", form.currentRegisteredName],
                    ["Requested registered name", form.requestedRegisteredName],
                  ]
                : []),
              ["Action desired", form.desiredAction || "Not specified"],
            ].map(([label, value]) => (
              <View key={label} className="border-border border-t pt-3">
                <Text className="text-xs font-bold text-muted-foreground">
                  {label}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-foreground">
                  {value || "Not provided"}
                </Text>
              </View>
            ))}
            {form.latitude != null && form.longitude != null ? (
              <View className="gap-2 border-t border-border pt-3">
                <Text className="text-xs font-bold text-muted-foreground">
                  Pinned location
                </Text>
                <StaticLocationMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  label={formattedAddress || "selected report location"}
                />
              </View>
            ) : null}
            <View className="gap-2 border-t border-border pt-3">
              <Text className="text-xs font-bold text-muted-foreground">
                Evidence photos
              </Text>
              <View className="flex-row gap-2">
                {readyPhotos.map((photo, index) => (
                  <Pressable
                    key={photo.id}
                    className="aspect-square flex-1 overflow-hidden rounded-lg bg-secondary"
                    onPress={() => setViewerPhotoIndex(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`View evidence photo ${index + 1}`}
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </View>
            </View>
            <Text className="mt-4 text-xs text-muted-foreground">
              By submitting this form, I agree to all terms and conditions.
            </Text>
          </View>
        ) : null}

        {step === 5 ? (
          <View
            className="items-center justify-center rounded-lg border border-border bg-card p-6"
            style={{
              minHeight: Math.max(420, height - insets.top - 180),
            }}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-success/20">
              <Check size={28} color={successColor} />
            </View>
            <Heading className="mt-4 text-center" size="lg">
              We received your report.
            </Heading>
            <Text className="mt-4 text-xs font-bold text-muted-foreground">
              Ticket Number
            </Text>
            <Text className="mt-2 rounded-full bg-primary px-5 py-3 text-center font-bold text-primary-foreground">
              {form.ticketNumber}
            </Text>
            <Text className="mt-5 text-center text-sm text-muted-foreground">
              You can follow progress in Reports. We will notify you when the
              status changes or a crew is assigned.
            </Text>
            <View className="mt-5 w-full flex-row gap-2">
              <Button className="flex-1" onPress={viewSubmittedReport}>
                <ButtonText>View details</ButtonText>
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => {
                  isLeavingToParentRef.current = true;
                  router.replace("/");
                }}
              >
                <ButtonText>Home</ButtonText>
              </Button>
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {step < 5 ? (
        <View
          className="absolute inset-x-0 bottom-0 flex-row items-end justify-end px-5"
          pointerEvents="box-none"
          style={{
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          }}
        >
          <Button
            isDisabled={isSubmitting || (attemptedStep === step && !canGoNext)}
            onPress={handleNext}
            accessibilityLabel={step === 4 ? "Submit report" : "Next"}
            className="rounded-full"
          >
            <ButtonText className="ml-2">
              {isSubmitting ? "Submitting" : step === 4 ? "Submit" : "Next"}
            </ButtonText>
            {step === 4 ? (
              <ButtonIcon as={Check} height={20} width={20} />
            ) : (
              <ButtonIcon as={ChevronRight} height={20} width={20} />
            )}
          </Button>
        </View>
      ) : null}

      <Modal
        isOpen={isEvidenceSourcePickerOpen}
        onClose={() => setIsEvidenceSourcePickerOpen(false)}
        size="md"
      >
        <ModalBackdrop />

        <ModalContent>
          <ModalHeader>
            <Heading size="md">Add evidence photo</Heading>
          </ModalHeader>

          <ModalBody className="mb-0 mt-4 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take evidence photo"
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-secondary"
              onPress={() =>
                runAfterEvidenceSourcePickerCloses(() => {
                  void takeEvidencePhoto();
                })
              }
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Camera size={19} color={mutedColor} />
              </View>

              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Take photo
                </Text>

                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Use your camera to capture the issue
                </Text>
              </View>
            </Pressable>
            <View className="h-2"></View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose evidence photos from gallery"
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-secondary"
              onPress={() =>
                runAfterEvidenceSourcePickerCloses(() => {
                  void chooseEvidencePhotos();
                })
              }
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Images size={19} color={mutedColor} />
              </View>

              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Choose from gallery
                </Text>

                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Select existing photos from your device
                </Text>
              </View>
            </Pressable>

            <Button
              className="mt-2"
              variant="secondary"
              onPress={() => setIsEvidenceSourcePickerOpen(false)}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>

      <EvidencePhotoViewer
        photos={readyPhotos}
        initialIndex={viewerPhotoIndex ?? 0}
        open={viewerPhotoIndex != null}
        onClose={() => setViewerPhotoIndex(null)}
      />
      <AlbayLocationPickerSheet
        open={isMapSheetOpen}
        initialCoordinates={mapPickerInitialCoordinates}
        meta={meta}
        onClose={() => setIsMapSheetOpen(false)}
        onConfirm={({ coordinates, address }) => {
          const nextLocation: ReportLocationSnapshot = {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,

            municipalityCode: address.municipalityCode,
            barangayPsgc: address.barangayPsgc,

            // Don't carry street/landmark information from the old
            // location into a newly confirmed map point.
            purok: address.purok?.trim() ?? "",
            landmark: "",

            locationVerified: Boolean(
              address.municipalityCode &&
              address.barangayPsgc &&
              isWithinAlbay(coordinates.latitude, coordinates.longitude),
            ),
          };

          lastManualLocationRef.current = nextLocation;

          setForm((current) => ({
            ...current,

            // Choosing another point means this report is no longer
            // using the saved home location.
            useHomeAddress: false,

            ...nextLocation,
          }));

          setIsMapSheetOpen(false);
        }}
      />
    </View>
  );
}
