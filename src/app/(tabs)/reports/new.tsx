import { ChildAppBar } from "@/components/child-app-bar";
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetContent,
  BottomSheetPortal,
  type BottomSheetRef,
} from "@/components/ui/bottomsheet";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  CheckboxLabel,
} from "@/components/ui/checkbox";
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
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { Pressable } from "@/components/ui/pressable";
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
import { aleconnectAssetBaseUrl } from "@/constants/api";
import { useConsumerProfileContext } from "@/context/consumer-profile-context";
import { useReportQueue } from "@/context/report-queue-context";
import {
  formatResolvedAddress,
  resolvePsgcAddress,
  type ResolvedReportAddress,
} from "@/features/reports/address";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  initialComplaintForm,
  type ComplaintFormState,
  type ComplaintMeta,
} from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { emitComplaintSubmissionToast } from "@/services/report-submission-events";
import {
  createLocalReportId,
  enqueueReport,
} from "@/services/report-queue";
import { fetchComplaintMeta } from "@/services/reports";
import {
  deleteEvidencePhoto,
  prepareEvidencePhoto,
} from "@/utils/evidence-image-processing";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  LocateFixed,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Keyboard,
  Platform,
  View,
  useWindowDimensions,
} from "react-native";
import type { KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const minEvidencePhotos = 1;
const maxEvidencePhotos = 3;
const albayCenter = { latitude: 13.1775, longitude: 123.528 };
const albayMapStyle = `${aleconnectAssetBaseUrl}/styles/map-bright.json?v=2`;
const albayBounds = {
  minLatitude: 12.9,
  maxLatitude: 13.55,
  minLongitude: 123.25,
  maxLongitude: 124.0,
};

type MapLibreModule = typeof import("@maplibre/maplibre-react-native");
type Coordinates = { latitude: number; longitude: number };

type SelectOption = {
  value: string;
  label: string;
};

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
        selectedLabel={selectedOptionLabel}
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
  const municipality = meta.municipalities.find(
    (item) =>
      item.name.toLowerCase() === profile?.municipality?.trim().toLowerCase(),
  );
  const barangay = meta.barangays.find(
    (item) =>
      item.municipalityCode === municipality?.code &&
      item.name.toLowerCase() === profile?.barangay?.trim().toLowerCase(),
  );

  return {
    municipalityCode: municipality?.code ?? "",
    barangayPsgc: barangay?.code ?? "",
    purok: profile?.purokOrStreet ?? "",
    landmark: "",
  };
}

function readCoordinates(value: Record<string, unknown> | null | undefined) {
  const latitude = Number(value?.lat ?? value?.latitude);
  const longitude = Number(value?.lng ?? value?.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { latitude, longitude };
  }

  return null;
}

function clampToAlbay(coordinates: Coordinates) {
  return {
    latitude: Math.min(
      albayBounds.maxLatitude,
      Math.max(albayBounds.minLatitude, coordinates.latitude),
    ),
    longitude: Math.min(
      albayBounds.maxLongitude,
      Math.max(albayBounds.minLongitude, coordinates.longitude),
    ),
  };
}

function toLngLat(coordinates: Coordinates): [number, number] {
  return [coordinates.longitude, coordinates.latitude];
}

export default function NewComplaintRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { session } = useAuthSession();
  const { sync: syncQueue } = useReportQueue();
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const mapSheetRef = useRef<BottomSheetRef>(null);
  const reportIdRef = useRef(createLocalReportId());
  const isLeavingToParentRef = useRef(false);
  const isMountedRef = useRef(true);
  const submitBackgroundRef = useRef(false);
  const [accentColor, mutedColor, successColor] = useAppColors([
    "accent",
    "muted",
    "success",
  ]);
  const { profile } = useConsumerProfileContext();
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [isMapSheetOpen, setIsMapSheetOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [submitProgressValue, setSubmitProgressValue] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<ComplaintFormState>(initialComplaintForm);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [mapModule, setMapModule] = useState<MapLibreModule | null>(null);
  const [mapCoordinates, setMapCoordinates] = useState<Coordinates | null>(
    null,
  );
  const [currentCoordinates, setCurrentCoordinates] =
    useState<Coordinates | null>(null);
  const [mapAddress, setMapAddress] =
    useState<ResolvedReportAddress | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const childBottomPadding =
    Math.max(insets.bottom, 16) + (step < 5 ? 112 : 32);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    void import("@maplibre/maplibre-react-native")
      .then(setMapModule)
      .catch(() => setMapError("Map is not available on this device."));
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchComplaintMeta()
      .then((nextMeta) => {
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
    const homeCoordinates = readCoordinates(profile?.homeCoordinates);
    setForm((current) => ({
      ...current,
      accountNumber: profile?.accountNumber ?? current.accountNumber,
      ...(current.useHomeAddress
        ? {
            ...findHomeAddress(meta, profile),
            latitude: homeCoordinates?.latitude ?? current.latitude,
            longitude: homeCoordinates?.longitude ?? current.longitude,
          }
        : {}),
    }));
  }, [meta, profile]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isMapSheetOpen) {
      requestAnimationFrame(() => mapSheetRef.current?.open());
    } else {
      mapSheetRef.current?.close();
    }
  }, [isMapSheetOpen]);

  useEffect(() => {
    if (!isMapSheetOpen || !mapCoordinates) return;

    let active = true;
    const timeout = setTimeout(() => {
      setIsResolvingAddress(true);
      void Location.reverseGeocodeAsync(mapCoordinates)
        .then(([address]) => {
          if (!active || !address) return;
          setMapAddress(resolvePsgcAddress(address, meta));
        })
        .catch(() => {
          if (active) setMapAddress(null);
        })
        .finally(() => {
          if (active) setIsResolvingAddress(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isMapSheetOpen, mapCoordinates, meta]);

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
  const MapLibreMap = mapModule?.Map;
  const MapLibreCamera = mapModule?.Camera;
  const Marker = mapModule?.Marker;
  const ViewAnnotation = mapModule?.ViewAnnotation;
  const NativeUserLocation = mapModule?.NativeUserLocation;

  const reportTypeOptions = meta.types
    .filter((type) => type.categoryId === form.categoryId)
    .map((type) => ({ value: type.id, label: type.title }));
  const municipalityOptions = meta.municipalities.map((municipality) => ({
    value: municipality.code,
    label: municipality.name,
  }));
  const barangayOptions = meta.barangays
    .filter((barangay) => barangay.municipalityCode === form.municipalityCode)
    .map((barangay) => ({ value: barangay.code, label: barangay.name }));

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
  const canGoNext =
    step === 1
      ? Boolean(form.categoryId)
      : step === 2
        ? Boolean(
            form.typeId &&
            form.accountNumber &&
            form.municipalityCode &&
            form.barangayPsgc,
          )
        : step === 3
          ? Boolean(
              form.description &&
              form.photoUploads.length >= minEvidencePhotos &&
              form.photoUploads.length <= maxEvidencePhotos &&
              form.photoUploads.every((photo) => photo.status === "ready"),
            )
          : true;
  const showErrors = attemptedStep === step && !canGoNext;

  const updateForm = <Key extends keyof ComplaintFormState>(
    key: Key,
    value: ComplaintFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
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
    if (!session) {
      isLeavingToParentRef.current = true;
      router.replace("/sign-in");
      return;
    }

    setIsSubmitting(true);
    submitBackgroundRef.current = false;
    setSubmitProgress("Saving report securely...");
    setSubmitProgressValue(15);
    setSubmitError(null);

    try {
      const evidence = form.photoUploads.filter(
        (photo) => photo.status === "ready" && photo.size != null,
      );
      if (evidence.length < minEvidencePhotos) {
        throw new Error("Wait until evidence photos finish processing.");
      }
      const reportId = reportIdRef.current;
      await enqueueReport({
        id: reportId,
        idempotencyKey: `mobile:${reportId}`,
        userId: session.user.id,
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
          description: form.description,
          actionDesired: form.desiredAction,
          latitude: form.latitude,
          longitude: form.longitude,
        },
      });
      setSubmitProgressValue(40);
      setSubmitProgress("Uploading evidence and creating your ticket...");
      setSubmitProgressValue(65);
      const results = await syncQueue(false);
      const result = results.find((item) => item.id === reportId);

      if (result?.status === "submitted") {
        setSubmitProgressValue(100);
        if (submitBackgroundRef.current) {
          emitComplaintSubmissionToast({
            message: `Report submitted: ${result.ticketNumber}`,
            status: "success",
          });
        } else if (isMountedRef.current) {
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
          message: "Report saved. It will submit when your connection returns.",
          status: "info",
        });
        if (!submitBackgroundRef.current && isMountedRef.current) {
          isLeavingToParentRef.current = true;
          router.replace("/reports/queue");
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit report.";
      if (submitBackgroundRef.current) {
        emitComplaintSubmissionToast({
          message: `Report submission failed: ${message}`,
          status: "danger",
        });
      } else {
        setSubmitError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
        setSubmitProgress("");
        setSubmitProgressValue(0);
      }
      submitBackgroundRef.current = false;
    }
  };

  const navigateToComplaintsParent = useCallback(() => {
    isLeavingToParentRef.current = true;
    router.replace("/reports");
  }, [router]);

  const waitFromHome = () => {
    submitBackgroundRef.current = true;
    isLeavingToParentRef.current = true;
    router.replace("/");
  };

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
  }, [isMapSheetOpen, navigateToComplaintsParent, step]);

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

  const addPhotos = async () => {
    const availableSlots = maxEvidencePhotos - form.photoUploads.length;
    if (availableSlots <= 0) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
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
  };

  const locateCurrentPosition = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setMapError("Location permission denied. Drag the pin manually.");
      return;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).catch(() => null);

    if (current) {
      const next = clampToAlbay({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setCurrentCoordinates(next);
      setMapCoordinates(next);
    }
  };

  const openMapPicker = async () => {
    const homeCoordinates = readCoordinates(profile?.homeCoordinates);
    const initialCoordinates = clampToAlbay(
      form.latitude != null && form.longitude != null
        ? { latitude: form.latitude, longitude: form.longitude }
        : (homeCoordinates ?? albayCenter),
    );

    setMapCoordinates(initialCoordinates);
    setMapAddress(null);
    setMapError(null);
    setIsMapSheetOpen(true);
    await locateCurrentPosition();
  };

  const confirmMapCoordinates = () => {
    if (!mapCoordinates) return;
    setForm((current) => ({
      ...current,
      useHomeAddress: false,
      latitude: mapCoordinates.latitude,
      longitude: mapCoordinates.longitude,
      municipalityCode: mapAddress?.municipalityCode ?? "",
      barangayPsgc: mapAddress?.barangayPsgc ?? "",
      purok: mapAddress?.purok ?? "",
    }));
    setIsMapSheetOpen(false);
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
        backAccessibilityLabel={
          step > 1 ? "Previous step" : "Back to reports"
        }
      />
      <KeyboardAwareScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        bottomOffset={Math.max(insets.bottom, 20) + 88}
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
        <View className="gap-4">
          <View className="flex-row gap-2 px-1">
            {Array.from({ length: 5 }, (_, index) => (
              <View
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index + 1 <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </View>
        </View>

        {submitError ? (
          <Text className="text-sm text-destructive">{submitError}</Text>
        ) : null}

        {step === 1 ? (
          <>
            <Text className="ml-2 text-sm font-semibold text-muted-foreground">
              Category
            </Text>
            <View className="gap-3">
              {meta.categories.map((category) => {
                const selected = form.categoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      const firstType = meta.types.find(
                        (type) => type.categoryId === category.id,
                      );
                      setForm((current) => ({
                        ...current,
                        categoryId: category.id,
                        typeId: firstType?.id ?? "",
                      }));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-19 flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
                      selected
                        ? "border-primary bg-card"
                        : "border-border bg-card"
                    }`}
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-2xl"
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
            <Text className="ml-2 text-sm text-muted-foreground">
              Report type
            </Text>
            <SelectField
              isRequired
              label="Report type"
              value={form.typeId}
              placeholder="Select report type"
              description={`Choose the issue type under ${selectedCategory?.title ?? "this category"}.`}
              options={reportTypeOptions}
              onChange={(value) => updateForm("typeId", value)}
              isInvalid={showErrors && !form.typeId}
              error="Select a report type."
            />

            <Text className="ml-2 text-sm text-muted-foreground">Account</Text>
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

            <Text className="ml-2 text-sm text-muted-foreground">Address</Text>
            <Checkbox
              value="home-address"
              isChecked={form.useHomeAddress}
              onChange={(selected) => {
                const homeCoordinates = readCoordinates(
                  profile?.homeCoordinates,
                );
                setForm((current) => ({
                  ...current,
                  useHomeAddress: selected,
                  ...(selected
                    ? {
                        ...findHomeAddress(meta, profile),
                        latitude: homeCoordinates?.latitude ?? current.latitude,
                        longitude:
                          homeCoordinates?.longitude ?? current.longitude,
                      }
                    : {
                        municipalityCode: "",
                        barangayPsgc: "",
                        purok: "",
                        landmark: "",
                        latitude: null,
                        longitude: null,
                      }),
                }));
              }}
              className="rounded-lg border border-border bg-card p-4"
            >
              <CheckboxIndicator>
                <CheckboxIcon as={Check} />
              </CheckboxIndicator>
              <CheckboxLabel>Use home address</CheckboxLabel>
            </Checkbox>
            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <SelectField
                  isRequired
                  label="Municipality"
                  value={form.municipalityCode}
                  placeholder="Select municipality"
                  description="Choose the municipality where the issue is located."
                  options={municipalityOptions}
                  isDisabled={form.useHomeAddress}
                  onChange={(value) => {
                    updateForm("municipalityCode", value);
                    updateForm("barangayPsgc", "");
                  }}
                  isInvalid={showErrors && !form.municipalityCode}
                  error="Select a municipality."
                />
              </View>
              <Button
                className="h-12 w-12"
                size="icon"
                variant="secondary"
                isDisabled={form.useHomeAddress}
                onPress={() => void openMapPicker()}
                accessibilityLabel="Open map picker"
              >
                <ButtonIcon as={MapPin} height={20} width={20} />
              </Button>
            </View>
            <SelectField
              isRequired
              label="Barangay"
              value={form.barangayPsgc}
              placeholder="Select barangay"
              description="Choose a barangay within the selected municipality."
              options={barangayOptions}
              onChange={(value) => updateForm("barangayPsgc", value)}
              isDisabled={form.useHomeAddress || !form.municipalityCode}
              isInvalid={showErrors && !form.barangayPsgc}
              error="Select a barangay."
            />
            <ReportInput
              isDisabled={form.useHomeAddress}
              label="Purok"
              value={form.purok}
              placeholder="Purok or street"
              onChangeText={(value) => updateForm("purok", value)}
            />
            <ReportInput
              isDisabled={form.useHomeAddress}
              label="Landmark"
              value={form.landmark}
              placeholder="Nearest landmark"
              onChangeText={(value) => updateForm("landmark", value)}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text className="ml-2 text-sm text-muted-foreground">
              Report details
            </Text>
            <ReportInput
              isRequired
              label="Description"
              value={form.description}
              placeholder="Describe the issue"
              multiline
              onChangeText={(value) => updateForm("description", value)}
              isInvalid={showErrors && !form.description}
              error="Describe the report."
            />
            <ReportInput
              label="Action desired"
              value={form.desiredAction}
              placeholder="What action do you want?"
              multiline
              onChangeText={(value) => updateForm("desiredAction", value)}
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
              <Text className="mt-1 text-sm text-muted-foreground">
                Add 1 to 3 clear photos. Photos are compressed and saved for
                reliable submission.
              </Text>
              <View className="mt-3 flex-row gap-2">
                {Array.from({ length: maxEvidencePhotos }, (_, index) => {
                  const photo = form.photoUploads[index];
                  return (
                    <Pressable
                      key={index}
                      onPress={photo ? undefined : addPhotos}
                      className={`h-14 flex-1 items-center justify-center rounded-2xl ${
                        photo ? "bg-accent" : "bg-background"
                      }`}
                    >
                      {photo ? (
                        <>
                          <Image
                            source={{ uri: photo.uri }}
                            className="h-full w-full rounded-2xl"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                            onPress={() => removePhoto(photo.id)}
                            accessibilityLabel="Remove evidence photo"
                          >
                            <ButtonIcon as={CircleX} height={15} width={15} />
                          </Button>
                          {photo.status !== "ready" ? (
                            <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/45">
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
              {showErrors &&
              (form.photoUploads.length < minEvidencePhotos ||
                form.photoUploads.some(
                  (photo) => photo.status !== "ready",
                )) ? (
                <Text className="mt-2 text-xs text-destructive">
                  Add at least 1 prepared photo.
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        {step === 4 ? (
          <View className="rounded-lg border border-border bg-card p-4">
            <Heading size="md">Preview</Heading>
            {[
              ["Category", selectedCategory?.title],
              ["Type", selectedType?.title],
              ["Account", form.accountNumber],
              [
                "Address",
                [
                  form.purok,
                  selectedBarangay?.name,
                  selectedMunicipality?.name,
                  form.landmark,
                ]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["Description", form.description],
              ["Action desired", form.desiredAction || "Not specified"],
              ["Pinned location", form.latitude != null ? "Location saved" : "Using address only"],
              ["Photos", `${form.photoUploads.length} attached`],
            ].map(([label, value]) => (
              <View key={label} className="border-border mt-3 border-t pt-3">
                <Text className="text-xs font-bold text-muted-foreground">
                  {label}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-foreground">
                  {value || "Not provided"}
                </Text>
              </View>
            ))}
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
              Reference Number
            </Text>
            <Text className="mt-2 rounded-full bg-primary px-5 py-3 text-center font-bold text-primary-foreground">
              {form.ticketNumber}
            </Text>
            <Text className="mt-5 text-center text-sm text-muted-foreground">
              Technicians have been notified. You will receive updates once a
              crew is assigned.
            </Text>
            <View className="mt-5 w-full flex-row gap-2">
              <Button className="flex-1" onPress={navigateToComplaintsParent}>
                <ButtonText>Reports</ButtonText>
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onPress={viewSubmittedReport}
              >
                <ButtonText>View details</ButtonText>
              </Button>
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {step < 5 && !isKeyboardVisible ? (
        <View
          className="absolute inset-x-0 bottom-0 flex-row items-end justify-end px-5"
          style={{
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            pointerEvents: "box-none",
          }}
        >
          <Button
            isDisabled={isSubmitting}
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

      <Modal isOpen={isSubmitting} onClose={() => undefined} size="sm">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Submitting report</Heading>
          </ModalHeader>
          <ModalBody>
            <Text className="text-sm text-muted-foreground">
              {submitProgress || "Submitting report..."}
            </Text>
            <Progress className="mt-5" value={submitProgressValue}>
              <ProgressFilledTrack />
            </Progress>
            <Text className="mt-4 text-sm text-muted-foreground">
              Your report is saved locally first. Evidence and report details
              are now being sent securely.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onPress={waitFromHome}>
              <ButtonText>Go home while submitting</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <BottomSheet ref={mapSheetRef} onClose={() => setIsMapSheetOpen(false)}>
        <BottomSheetPortal
          snapPoints={["100%"]}
          enableDynamicSizing={false}
          enableContentPanningGesture={false}
          enableHandlePanningGesture={false}
          enablePanDownToClose={false}
          handleComponent={() => null}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
        >
          <BottomSheetContent
            className="flex-1"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="flex-row items-start justify-between gap-3 pb-1">
              <View className="flex-1">
                <Heading size="lg">Choose location</Heading>
                <Text className="text-sm text-muted-foreground">
                  Move the pin within Albay, then confirm the matched address.
                </Text>
              </View>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                onPress={() => setIsMapSheetOpen(false)}
                accessibilityLabel="Close map picker"
              >
                <ButtonIcon as={CircleX} height={20} width={20} />
              </Button>
            </View>
            <View className="flex-1 overflow-hidden rounded-lg border border-border bg-secondary">
              {Platform.OS === "web" ||
              !MapLibreMap ||
              !MapLibreCamera ||
              !Marker ||
              !ViewAnnotation ||
              !mapCoordinates ? (
                <View className="h-96 items-center justify-center px-6">
                  <MapPin size={36} color={accentColor} />
                  <Text className="mt-2 text-center text-sm text-muted-foreground">
                    {Platform.OS === "web"
                      ? "Native map picker is available on Android and iOS."
                      : (mapError ?? "Loading map...")}
                  </Text>
                </View>
              ) : (
                <MapLibreMap
                  style={{ flex: 1, minHeight: 420 }}
                  mapStyle={albayMapStyle}
                  androidView="texture"
                  compass
                  logo={false}
                  attribution
                  onDidFailLoadingMap={() => {
                    setMapError(
                      "Map style failed to load. Check Aleconnect server.",
                    );
                  }}
                  onPress={(event) => {
                    const [longitude, latitude] = event.nativeEvent.lngLat;
                    setMapCoordinates(clampToAlbay({ latitude, longitude }));
                  }}
                >
                  <MapLibreCamera
                    center={toLngLat(mapCoordinates)}
                    zoom={13}
                    maxBounds={[
                      albayBounds.minLongitude,
                      albayBounds.minLatitude,
                      albayBounds.maxLongitude,
                      albayBounds.maxLatitude,
                    ]}
                    duration={250}
                  />
                  {NativeUserLocation ? <NativeUserLocation /> : null}
                  {currentCoordinates ? (
                    <Marker
                      id="current-location"
                      lngLat={toLngLat(currentCoordinates)}
                    >
                      <View className="h-5 w-5 rounded-full border-2 border-white bg-blue-500" />
                    </Marker>
                  ) : null}
                  <ViewAnnotation
                    id="complaint-location"
                    lngLat={toLngLat(mapCoordinates)}
                    draggable
                    onDragEnd={(event) => {
                      const [longitude, latitude] = event.nativeEvent.lngLat;
                      setMapCoordinates(clampToAlbay({ latitude, longitude }));
                    }}
                  >
                    <View className="items-center">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary shadow-lg">
                        <MapPin size={20} color="white" />
                      </View>
                      <View className="-mt-1 h-3 w-3 rotate-45 bg-primary" />
                    </View>
                  </ViewAnnotation>
                </MapLibreMap>
              )}
            </View>
            <View className="rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-accent/15">
                  <MapPin size={18} color={accentColor} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-bold text-muted-foreground">
                    Selected address
                  </Text>
                  <Text className="mt-1 text-sm font-bold leading-5 text-foreground">
                    {isResolvingAddress
                      ? "Finding this address..."
                      : mapAddress
                        ? formatResolvedAddress(mapAddress)
                        : "Move the pin to identify an address."}
                  </Text>
                  {mapAddress &&
                  (!mapAddress.municipalityCode || !mapAddress.barangayPsgc) ? (
                    <Text className="mt-2 text-xs text-warning">
                      Municipality or barangay could not be matched. Confirm the
                      fields after selecting this pin.
                    </Text>
                  ) : null}
                </View>
              </View>
              {mapError ? (
                <Text className="mt-2 text-xs text-destructive">
                  {mapError}
                </Text>
              ) : null}
            </View>
            <View className="flex-row gap-2">
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onPress={() => void locateCurrentPosition()}
              >
                <ButtonIcon as={LocateFixed} height={18} width={18} />
                <ButtonText>Use my location</ButtonText>
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onPress={confirmMapCoordinates}
                isDisabled={!mapCoordinates || isResolvingAddress}
              >
                <ButtonIcon as={Navigation} height={18} width={18} />
                <ButtonText>Use this pin</ButtonText>
              </Button>
            </View>
            <Text className="text-center text-xs text-muted-foreground">
              Location selection is limited to Albay.
            </Text>
          </BottomSheetContent>
        </BottomSheetPortal>
      </BottomSheet>
    </View>
  );
}
