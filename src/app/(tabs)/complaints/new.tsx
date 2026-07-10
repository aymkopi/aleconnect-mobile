import { statusBarHeight } from "@/constants";
import { aleconnectApiBaseUrl } from "@/constants/api";
import { useConsumerProfileContext } from "@/context/consumer-profile-context";
import {
  emptyComplaintMeta,
  formatComplaintCategoryTitle,
  initialComplaintForm,
  type ComplaintFormState,
  type ComplaintMeta,
} from "@/features/complaints/data";
import {
  createEvidenceUploads,
  fetchComplaintMeta,
  submitComplaint,
  uploadEvidenceToR2,
} from "@/services/complaints";
import { emitComplaintSubmissionToast } from "@/services/complaint-submission-events";
import { compressEvidencePhoto } from "@/utils/evidence-image-processing";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import {
  BottomSheet,
  Button,
  Checkbox,
  ControlField,
  Dialog,
  FieldError,
  Input,
  Label,
  Separator,
  Surface,
  TextField,
  Typography,
  useThemeColor,
} from "heroui-native";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleX,
  MapPin,
  Navigation,
} from "lucide-react-native";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import type { KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const minEvidencePhotos = 1;
const maxEvidencePhotos = 3;
const albayCenter = { latitude: 13.1775, longitude: 123.528 };
const albayMapStyle = `${aleconnectApiBaseUrl}/styles/map-bright.json`;
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
    <TextField
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? "top" : "center"}
      />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

function SelectField({
  label,
  value,
  placeholder,
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
  options: SelectOption[];
  onChange: (value: string) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  error?: string;
  isDisabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [foregroundColor] = useThemeColor(["foreground"]);
  const { height } = useWindowDimensions();
  const sheetHeight = useMemo(
    () =>
      Math.min(
        height * 0.5,
        Math.max(168, 92 + Math.min(options.length, 6) * 54),
      ),
    [height, options.length],
  );
  const listMaxHeight = Math.max(96, sheetHeight - 72);
  const snapPoints = useMemo(() => [sheetHeight], [sheetHeight]);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <Label>{label}</Label>
          {isRequired ? (
            <Typography className="text-danger" type="body-sm">
              *
            </Typography>
          ) : null}
        </View>
        <Pressable
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          onPress={() => setIsOpen(true)}
          className={`min-h-14 flex-row items-center justify-between rounded-full px-4 ${
            isDisabled ? "bg-surface-secondary opacity-60" : "bg-surface-secondary"
          }`}
        >
          <Typography
            type="body-sm"
            weight="medium"
            className={selectedOption ? "text-foreground" : "text-muted"}
          >
            {selectedOption?.label ?? placeholder}
          </Typography>
          <ChevronRight size={18} color={foregroundColor} />
        </Pressable>
        {isInvalid && error ? (
          <Typography type="body-xs" className="text-danger">
            {error}
          </Typography>
        ) : null}
      </View>

      <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={snapPoints}
            enableOverDrag={false}
            enableDynamicSizing={false}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
          >
            <BottomSheet.Title>{label}</BottomSheet.Title>
            {/* ponytail: ScrollShadow crashes in current native bundle; re-add after linear-gradient works. */}
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={{ maxHeight: listMaxHeight }}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {options.map((option, index) => (
                <Fragment key={option.value}>
                  {index > 0 ? <Separator /> : null}
                  <Button
                    variant="ghost"
                    className="justify-between rounded-none"
                    onPress={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <Button.Label>{option.label}</Button.Label>
                    {option.value === value ? (
                      <Check size={18} color={foregroundColor} />
                    ) : null}
                  </Button>
                </Fragment>
              ))}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
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

function formatCoordinate(value: number | null) {
  return value == null ? "Not set" : value.toFixed(6);
}

export default function NewComplaintRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<KeyboardAwareScrollViewRef | null>(null);
  const isLeavingToParentRef = useRef(false);
  const isMountedRef = useRef(true);
  const submitBackgroundRef = useRef(false);
  const [accentColor, mutedColor, foregroundColor] = useThemeColor([
    "accent",
    "muted",
    "foreground",
  ]);
  const { profile } = useConsumerProfileContext();
  const [meta, setMeta] = useState<ComplaintMeta>(emptyComplaintMeta);
  const [isMapSheetOpen, setIsMapSheetOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<ComplaintFormState>(initialComplaintForm);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const [mapModule, setMapModule] = useState<MapLibreModule | null>(null);
  const [mapCoordinates, setMapCoordinates] = useState<Coordinates | null>(null);
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const childBottomPadding =
    Math.max(insets.bottom, 16) + (step < 5 ? 112 : 32) + keyboardBottomInset;

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
              : "Failed to load complaint form.",
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
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardBottomInset(Math.min(event.endCoordinates.height, 320));
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardBottomInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
              form.photoUploads.every((photo) => photo.status === "uploaded" && photo.key),
            )
          : true;
  const showErrors = attemptedStep === step && !canGoNext;

  const updateForm = <Key extends keyof ComplaintFormState>(
    key: Key,
    value: ComplaintFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadSelectedPhoto = async (uri: string) => {
    setForm((current) => ({
      ...current,
      photos: [...current.photos, uri],
      photoUploads: [
        ...current.photoUploads,
        { uri, key: null, uploadUrl: null, status: "processing" },
      ],
    }));

    try {
      const { uploads } = await createEvidenceUploads(1);
      const upload = uploads[0];
      const imageBytes = await compressEvidencePhoto(uri);
      await uploadEvidenceToR2(upload.uploadUrl, imageBytes);

      setForm((current) => {
        const photoStillSelected = current.photoUploads.some(
          (photo) => photo.uri === uri,
        );

        if (!photoStillSelected) {
          return current;
        }

        return {
          ...current,
          imageKeys: [...current.imageKeys.filter(Boolean), upload.key],
          photoUploads: current.photoUploads.map((photo) =>
            photo.uri === uri
              ? {
                  ...photo,
                  key: upload.key,
                  uploadUrl: upload.uploadUrl,
                  status: "uploaded",
                }
              : photo,
          ),
        };
      });
    } catch (error) {
      setForm((current) => ({
        ...current,
        photoUploads: current.photoUploads.map((photo) =>
          photo.uri === uri
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

  const removePhoto = (uri: string) => {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo !== uri),
      photoUploads: current.photoUploads.filter((photo) => photo.uri !== uri),
      imageKeys: current.photoUploads
        .filter((photo) => photo.uri !== uri)
        .map((photo) => photo.key)
        .filter((key): key is string => Boolean(key)),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    submitBackgroundRef.current = false;
    setSubmitProgress("Submitting report...");
    setSubmitError(null);

    try {
      const imageKeys = form.photoUploads
        .map((photo) => photo.key)
        .filter((key): key is string => Boolean(key));
      if (imageKeys.length < minEvidencePhotos) {
        throw new Error("Wait until evidence photos finish uploading.");
      }

      const ticket = await submitComplaint({
        typeId: form.typeId,
        accountNumber: form.accountNumber,
        barangayPsgc: form.barangayPsgc,
        purok: form.purok,
        landmark: form.landmark,
        description: form.description,
        actionDesired: form.desiredAction,
        imageKeys,
        latitude: form.latitude,
        longitude: form.longitude,
      });

      if (submitBackgroundRef.current) {
        emitComplaintSubmissionToast({
          message: `Complaint submitted: ${ticket.ticketNumber}`,
          status: "success",
        });
      } else if (isMountedRef.current) {
        setForm((current) => ({
          ...current,
          imageKeys,
          ticketId: ticket.ticketId,
          ticketNumber: ticket.ticketNumber,
        }));
        setSubmitProgress("");
        setStep(5);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit complaint.";
      if (submitBackgroundRef.current) {
        emitComplaintSubmissionToast({
          message: `Complaint submission failed: ${message}`,
          status: "danger",
        });
      } else {
        setSubmitError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
        setSubmitProgress("");
      }
      submitBackgroundRef.current = false;
    }
  };

  const navigateToComplaintsParent = useCallback(() => {
    isLeavingToParentRef.current = true;
    router.replace("/complaints");
  }, [router]);

  const waitFromHome = () => {
    submitBackgroundRef.current = true;
    router.replace("/");
  };

  const viewSubmittedReport = () => {
    if (!form.ticketId) {
      navigateToComplaintsParent();
      return;
    }

    router.replace({ pathname: "/complaints/[id]", params: { id: form.ticketId } });
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
      .forEach((asset) => void uploadSelectedPhoto(asset.uri));
  };

  const openMapPicker = async () => {
    const homeCoordinates = readCoordinates(profile?.homeCoordinates);
    const initialCoordinates = clampToAlbay(
      form.latitude != null && form.longitude != null
        ? { latitude: form.latitude, longitude: form.longitude }
        : homeCoordinates ?? {
            latitude: albayCenter.latitude,
            longitude: albayCenter.longitude,
          },
    );

    setMapCoordinates(initialCoordinates);
    setMapError(null);
    setIsMapSheetOpen(true);

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

  const confirmMapCoordinates = () => {
    if (!mapCoordinates) return;
    setForm((current) => ({
      ...current,
      useHomeAddress: false,
      latitude: mapCoordinates.latitude,
      longitude: mapCoordinates.longitude,
    }));
    setIsMapSheetOpen(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      style={{ width }}
    >
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
          paddingTop: statusBarHeight + 16,
          gap: 16,
          paddingBottom: childBottomPadding,
        }}
        scrollIndicatorInsets={{ bottom: childBottomPadding }}
      >
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <Button
              isIconOnly
              variant="ghost"
              onPress={handleBackPress}
              accessibilityLabel={
                step > 1 ? "Previous step" : "Back to complaints"
              }
            >
              <ChevronLeft size={22} color={foregroundColor} />
            </Button>
            <View className="flex-1">
              <Typography.Heading type="h2" weight="bold">
                {title}
              </Typography.Heading>
              <Typography.Paragraph type="body-sm" color="muted" className="mt-1">
                {selectedCategory
                  ? formatComplaintCategoryTitle(selectedCategory.title)
                  : "Choose the closest category"}
              </Typography.Paragraph>
            </View>
          </View>
          <View className="flex-row gap-2 pl-14">
            {Array.from({ length: 5 }, (_, index) => (
              <View
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index + 1 <= step ? "bg-accent" : "bg-default"
                }`}
              />
            ))}
          </View>
        </View>

        {submitError ? (
          <Typography.Paragraph type="body-sm" className="text-danger">
            {submitError}
          </Typography.Paragraph>
        ) : null}

        {step === 1 ? (
          <>
            <Label className="ml-2 text-sm font-semibold text-muted">
              Category
            </Label>
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
                    className={`min-h-19 flex-row items-center gap-3 rounded-[20px] border px-4 py-3 ${
                      selected
                        ? "border-accent bg-surface"
                        : "border-border bg-surface"
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
                      <Typography.Heading type="h6" weight="bold">
                        {formatComplaintCategoryTitle(category.title)}
                      </Typography.Heading>
                      <Typography.Paragraph
                        type="body-xs"
                        color="muted"
                        weight="medium"
                        className="mt-1"
                      >
                        {category.description}
                      </Typography.Paragraph>
                    </View>
                    {selected ? (
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
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
            <Label className="ml-2 text-sm text-muted">Complaint type</Label>
            <SelectField
              isRequired
              label="Complaint type"
              value={form.typeId}
              placeholder="Select complaint type"
              options={reportTypeOptions}
              onChange={(value) => updateForm("typeId", value)}
              isInvalid={showErrors && !form.typeId}
              error="Select a complaint type."
            />

            <Label className="ml-2 text-sm text-muted">Account</Label>
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

            <Label className="ml-2 text-sm text-muted">Address</Label>
            <ControlField
              isSelected={form.useHomeAddress}
              onSelectedChange={(selected) => {
                const homeCoordinates = readCoordinates(profile?.homeCoordinates);
                setForm((current) => ({
                  ...current,
                  useHomeAddress: selected,
                  ...(selected
                    ? {
                        ...findHomeAddress(meta, profile),
                        latitude: homeCoordinates?.latitude ?? current.latitude,
                        longitude: homeCoordinates?.longitude ?? current.longitude,
                      }
                    : {}),
                }));
              }}
            >
              <ControlField.Indicator>
                <Checkbox className="mt-0.5" />
              </ControlField.Indicator>
              <View className="flex-1">
                <Label>Use home address</Label>
              </View>
            </ControlField>
            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <SelectField
                  isRequired
                  label="Municipality"
                  value={form.municipalityCode}
                  placeholder="Select municipality"
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
                isIconOnly
                variant="secondary"
                size="lg"
                isDisabled={form.useHomeAddress}
                onPress={() => void openMapPicker()}
                accessibilityLabel="Open map picker"
              >
                <MapPin size={20} color={foregroundColor} />
              </Button>
            </View>
            <SelectField
              isRequired
              label="Barangay"
              value={form.barangayPsgc}
              placeholder="Select barangay"
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
            <Label className="ml-2 text-sm text-muted">Report details</Label>
            <ReportInput
              isRequired
              label="Description"
              value={form.description}
              placeholder="Describe the issue"
              multiline
              onChangeText={(value) => updateForm("description", value)}
              isInvalid={showErrors && !form.description}
              error="Describe the complaint."
            />
            <ReportInput
              label="Action desired"
              value={form.desiredAction}
              placeholder="What action do you want?"
              multiline
              onChangeText={(value) => updateForm("desiredAction", value)}
            />
            <Surface variant="secondary" className="rounded-3xl p-4">
              <View className="flex-row items-center justify-between">
                <Typography type="body-sm" weight="bold">
                  Evidence photos *
                </Typography>
                <Typography type="body-xs" color="muted" weight="bold">
                  {form.photoUploads.length}/{maxEvidencePhotos}
                </Typography>
              </View>
              <Typography.Paragraph type="body-sm" color="muted" className="mt-1">
                Add 1 to 3 clear photos. Upload starts after selection.
              </Typography.Paragraph>
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
                          isIconOnly
                          size="sm"
                          variant="danger"
                          className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                          onPress={() => removePhoto(photo.uri)}
                          accessibilityLabel="Remove evidence photo"
                        >
                          <CircleX size={15} color="white" />
                        </Button>
                        {photo.status !== "uploaded" ? (
                          <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/45">
                            <Typography type="body-xs" className="text-white">
                              {photo.status === "failed" ? "Failed" : "Uploading"}
                            </Typography>
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
              <FieldError
                isInvalid={
                  showErrors &&
                  (form.photoUploads.length < minEvidencePhotos ||
                    form.photoUploads.some((photo) => photo.status !== "uploaded"))
                }
              >
                Add at least 1 uploaded photo.
              </FieldError>
            </Surface>
          </>
        ) : null}

        {step === 4 ? (
          <Surface className="rounded-3xl p-4">
            <Typography.Heading type="h5" weight="bold">Preview</Typography.Heading>
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
              [
                "Coordinates",
                form.latitude != null && form.longitude != null
                  ? `${formatCoordinate(form.latitude)}, ${formatCoordinate(form.longitude)}`
                  : "No pin selected",
              ],
              ["Photos", `${form.photoUploads.length} attached`],
            ].map(([label, value]) => (
              <View key={label} className="border-border mt-3 border-t pt-3">
                <Label className="text-xs font-bold text-muted">{label}</Label>
                <Typography.Paragraph
                  type="body-sm"
                  weight="semibold"
                  className="mt-1"
                >
                  {value || "Not provided"}
                </Typography.Paragraph>
              </View>
            ))}
            <Typography.Paragraph type="body-xs" color="muted" className="mt-4">
              By submitting this form, I agree to all terms and conditions.
            </Typography.Paragraph>
          </Surface>
        ) : null}

        {step === 5 ? (
          <Surface
            className="items-center justify-center rounded-3xl p-6"
            style={{
              minHeight: Math.max(420, height - statusBarHeight - 140),
            }}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-success/20">
              <Check size={28} color="#16a34a" />
            </View>
            <Typography.Heading
              type="h4"
              weight="bold"
              align="center"
              className="mt-4"
            >
              We received your complaint.
            </Typography.Heading>
            <Typography type="body-xs" color="muted" weight="bold" className="mt-4">
              Reference Number
            </Typography>
            <Typography
              type="body"
              weight="bold"
              align="center"
              className="mt-2 rounded-full bg-accent px-5 py-3 text-white"
            >
              {form.ticketNumber}
            </Typography>
            <Typography.Paragraph
              type="body-sm"
              color="muted"
              align="center"
              className="mt-5"
            >
              Technicians have been notified. You will receive updates once a
              crew is assigned.
            </Typography.Paragraph>
            <View className="mt-5 w-full flex-row gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onPress={navigateToComplaintsParent}
              >
                <Button.Label>Back to complaints</Button.Label>
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onPress={viewSubmittedReport}
              >
                <Button.Label>View details</Button.Label>
              </Button>
            </View>
          </Surface>
        ) : null}
      </KeyboardAwareScrollView>

      {step < 5 && keyboardBottomInset === 0 ? (
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 bottom-0 flex-row items-end justify-end px-5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
        >
          <Button
            variant="primary"
            size="md"
            isDisabled={isSubmitting}
            onPress={handleNext}
            accessibilityLabel={step === 4 ? "Submit report" : "Next"}
            className="rounded-full"
          >
            <Button.Label className="ml-2">
              {isSubmitting ? "Submitting" : step === 4 ? "Submit" : "Next"}
            </Button.Label>
            {step === 4 ? (
              <Check size={20} color="white" />
            ) : (
              <ChevronRight size={20} color="white" />
            )}
          </Button>
        </View>
      ) : null}

      <Dialog isOpen={isSubmitting} onOpenChange={() => undefined}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content isSwipeable={false} className="mx-5 rounded-3xl p-5">
            <Dialog.Title>Submitting report</Dialog.Title>
            <Dialog.Description>
              {submitProgress || "Submitting report..."}
            </Dialog.Description>
            <View className="mt-5 overflow-hidden rounded-full bg-default">
              <View className="h-2 rounded-full bg-accent" style={{ width: "72%" }} />
            </View>
            <Typography.Paragraph type="body-sm" color="muted" className="mt-4">
              Evidence is already uploaded. ALECO database is creating your
              ticket number.
            </Typography.Paragraph>
            <Button variant="secondary" className="mt-5" onPress={waitFromHome}>
              <Button.Label>Go home while submitting</Button.Label>
            </Button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {isMapSheetOpen ? (
        <BottomSheet isOpen={isMapSheetOpen} onOpenChange={setIsMapSheetOpen}>
          <BottomSheet.Portal>
            <BottomSheet.Overlay />
            <BottomSheet.Content snapPoints={["100%"]}>
              <BottomSheet.Close />
              <BottomSheet.Title>Choose location</BottomSheet.Title>
              <BottomSheet.Description>
                Drag the pin inside Albay, then confirm the coordinates.
              </BottomSheet.Description>
              <View className="mt-5 flex-1 overflow-hidden rounded-3xl bg-surface-secondary">
                {Platform.OS === "web" ||
                !MapLibreMap ||
                !MapLibreCamera ||
                !Marker ||
                !ViewAnnotation ||
                !mapCoordinates ? (
                  <View className="h-96 items-center justify-center px-6">
                    <MapPin size={36} color={accentColor} />
                    <Typography.Paragraph
                      type="body-sm"
                      color="muted"
                      align="center"
                      className="mt-2"
                    >
                      {Platform.OS === "web"
                        ? "Native map picker is available on Android and iOS."
                        : mapError ?? "Loading map..."}
                    </Typography.Paragraph>
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
                      setMapError("Map style failed to load. Check Aleconnect server.");
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
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-accent shadow-lg">
                          <MapPin size={20} color="white" />
                        </View>
                        <View className="-mt-1 h-3 w-3 rotate-45 bg-accent" />
                      </View>
                    </ViewAnnotation>
                  </MapLibreMap>
                )}
              </View>
              <Surface variant="secondary" className="mt-4 rounded-3xl p-4">
                <Typography type="body-xs" color="muted" weight="bold">
                  Selected coordinates
                </Typography>
                <Typography type="body-sm" weight="bold" className="mt-1">
                  {formatCoordinate(mapCoordinates?.latitude ?? null)},{" "}
                  {formatCoordinate(mapCoordinates?.longitude ?? null)}
                </Typography>
                {mapError ? (
                  <Typography.Paragraph type="body-xs" className="mt-2 text-danger">
                    {mapError}
                  </Typography.Paragraph>
                ) : null}
              </Surface>
              <Button
                variant="primary"
                size="lg"
                className="mt-4"
                onPress={confirmMapCoordinates}
                isDisabled={!mapCoordinates}
              >
                <Navigation size={18} color="white" />
                <Button.Label>Confirm coordinates</Button.Label>
              </Button>
              <Typography.Paragraph
                type="body-xs"
                color="muted"
                align="center"
                className="mt-2"
              >
                Map is limited to Albay coordinates.
              </Typography.Paragraph>
            </BottomSheet.Content>
          </BottomSheet.Portal>
        </BottomSheet>
      ) : null}
    </KeyboardAvoidingView>
  );
}
