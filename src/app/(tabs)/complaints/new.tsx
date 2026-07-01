import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
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
import { compressEvidencePhoto } from "@/utils/evidence-image-processing";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  BottomSheet,
  Button,
  Checkbox,
  ControlField,
  FieldError,
  Input,
  Label,
  ScrollShadow,
  Separator,
  Surface,
  TextField,
  useThemeColor,
} from "heroui-native";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react-native";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [backgroundColor, foregroundColor] = useThemeColor([
    "background",
    "foreground",
  ]);
  const snapPoints = useMemo(() => ["50%"], []);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      <TextField
        isRequired={isRequired}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
      >
        <Label>{label}</Label>
        <Button
          variant="secondary"
          isDisabled={isDisabled}
          onPress={() => setIsOpen(true)}
          className="justify-between"
        >
          <Button.Label
            className={selectedOption ? "text-foreground" : "text-muted"}
          >
            {selectedOption?.label ?? placeholder}
          </Button.Label>
          <ChevronRight size={18} color={foregroundColor} />
        </Button>
        <FieldError>{error}</FieldError>
      </TextField>

      <BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={snapPoints}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheet.Title>{label}</BottomSheet.Title>
            <ScrollShadow
              className="flex-1"
              color={backgroundColor}
              size={36}
              LinearGradientComponent={LinearGradient}
            >
              <BottomSheetScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
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
            </ScrollShadow>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
  );
}

function findHomeAddress(meta: ComplaintMeta, profile: ReturnType<typeof useConsumerProfileContext>["profile"]) {
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

export default function NewComplaintRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<ComplaintFormState>(initialComplaintForm);

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
    setForm((current) => ({
      ...current,
      accountNumber: profile?.accountNumber ?? current.accountNumber,
      ...(current.useHomeAddress ? findHomeAddress(meta, profile) : {}),
    }));
  }, [meta, profile]);

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
          ? Boolean(form.description && form.photos.length >= 3)
          : true;
  const showErrors = attemptedStep === step && !canGoNext;

  const updateForm = <Key extends keyof ComplaintFormState>(
    key: Key,
    value: ComplaintFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { uploads } = await createEvidenceUploads(form.photos.length);
      const imageBytes = await Promise.all(form.photos.map(compressEvidencePhoto));

      await Promise.all(
        uploads.map((upload, index) =>
          uploadEvidenceToR2(upload.uploadUrl, imageBytes[index]),
        ),
      );

      const ticket = await submitComplaint({
        typeId: form.typeId,
        accountNumber: form.accountNumber,
        barangayPsgc: form.barangayPsgc,
        purok: form.purok,
        landmark: form.landmark,
        description: form.description,
        actionDesired: form.desiredAction,
        imageKeys: uploads.map((upload) => upload.key),
      });

      setForm((current) => ({
        ...current,
        imageKeys: uploads.map((upload) => upload.key),
        ticketNumber: ticket.ticketNumber,
      }));
      setStep(5);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit complaint.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 5 - form.photos.length),
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    updateForm(
      "photos",
      [...form.photos, ...result.assets.map((asset) => asset.uri)].slice(0, 5),
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      style={{ width }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        className="bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: statusBarHeight + 16,
          gap: 16,
          paddingBottom: bottomPadding + 140,
        }}
      >
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <Button
              isIconOnly
              variant="ghost"
              onPress={() => router.back()}
              accessibilityLabel="Back to complaints"
            >
              <ChevronLeft size={22} color={foregroundColor} />
            </Button>
            <View className="flex-1">
              <Text className="text-foreground text-[28px] font-black leading-8">
                {title}
              </Text>
              <Text className="text-muted mt-1 text-[15px] leading-5">
                {selectedCategory
                  ? formatComplaintCategoryTitle(selectedCategory.title)
                  : "Choose the closest category"}
              </Text>
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
          <Text className="text-danger text-sm">{submitError}</Text>
        ) : null}

        {step === 1 ? (
          <>
            <Text className="ml-2 text-sm font-semibold text-muted">
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
                    className={`min-h-[76px] flex-row items-center gap-3 rounded-[20px] border px-4 py-3 ${
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
                      <Text className="text-foreground text-[16px] font-bold leading-5">
                        {formatComplaintCategoryTitle(category.title)}
                      </Text>
                      <Text className="text-muted mt-1 text-[13px] font-medium leading-[18px]">
                        {category.description}
                      </Text>
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
            <Text className="ml-2 text-sm text-muted">Complaint type</Text>
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

            <Text className="ml-2 text-sm text-muted">Account</Text>
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

            <Text className="ml-2 text-sm text-muted">Address</Text>
            <ControlField
              isSelected={form.useHomeAddress}
              onSelectedChange={(selected) => {
                setForm((current) => ({
                  ...current,
                  useHomeAddress: selected,
                  ...(selected ? findHomeAddress(meta, profile) : {}),
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
                onPress={() => setIsMapSheetOpen(true)}
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
            <Text className="ml-2 text-sm text-muted">Report details</Text>
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
                <Text className="text-foreground text-sm font-bold">
                  Evidence photos *
                </Text>
                <Text className="text-muted text-xs font-bold">
                  {form.photos.length}/5
                </Text>
              </View>
              <Text className="text-muted mt-1 text-sm">
                Add at least 3 clear photos.
              </Text>
              <View className="mt-3 flex-row gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <Pressable
                    key={index}
                    onPress={index < form.photos.length ? undefined : addPhotos}
                    className={`h-14 flex-1 items-center justify-center rounded-2xl ${
                      index < form.photos.length ? "bg-accent" : "bg-background"
                    }`}
                  >
                    {form.photos[index] ? (
                      <Image
                        source={{ uri: form.photos[index] }}
                        className="h-full w-full rounded-2xl"
                      />
                    ) : (
                      <Camera size={18} color={mutedColor} />
                    )}
                  </Pressable>
                ))}
              </View>
              <FieldError isInvalid={showErrors && form.photos.length < 3}>
                Add at least 3 photos.
              </FieldError>
            </Surface>
          </>
        ) : null}

        {step === 4 ? (
          <Surface className="rounded-3xl p-4">
            <Text className="text-foreground text-lg font-black">Preview</Text>
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
              ["Photos", `${form.photos.length} attached`],
            ].map(([label, value]) => (
              <View key={label} className="border-border mt-3 border-t pt-3">
                <Text className="text-muted text-xs font-bold">{label}</Text>
                <Text className="text-foreground mt-1 text-sm font-semibold">
                  {value || "Not provided"}
                </Text>
              </View>
            ))}
            <Text className="text-muted mt-4 text-xs leading-4">
              By submitting this form, I agree to all terms and conditions.
            </Text>
          </Surface>
        ) : null}

        {step === 5 ? (
          <Surface className="items-center rounded-3xl p-6">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-success/20">
              <Check size={28} color="#16a34a" />
            </View>
            <Text className="text-foreground mt-4 text-center text-xl font-black">
              We received your complaint.
            </Text>
            <Text className="text-muted mt-4 text-xs font-bold">
              Reference Number
            </Text>
            <Text className="bg-accent mt-1 rounded-full px-4 py-2 text-base font-black text-white">
              {form.ticketNumber}
            </Text>
            <Text className="text-muted mt-5 text-center text-sm leading-5">
              Technicians have been notified. You will receive updates once a
              crew is assigned.
            </Text>
            <View className="mt-5 w-full flex-row gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onPress={() => router.replace("/complaints")}
              >
                <Button.Label>Back to complaints</Button.Label>
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => router.replace("/complaints")}
              >
                <Button.Label>View status</Button.Label>
              </Button>
            </View>
          </Surface>
        ) : null}
      </ScrollView>

      {step < 5 ? (
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 bottom-16 flex-row items-end justify-between px-5"
          style={{ paddingBottom: insets.bottom + 18 }}
        >
          <Button
            variant="secondary"
            isIconOnly
            isDisabled={step === 1 || isSubmitting}
            onPress={() => {
              setAttemptedStep(null);
              setStep((current) => Math.max(1, current - 1));
            }}
            accessibilityLabel="Previous"
          >
            <ChevronLeft size={20} color={foregroundColor} />
          </Button>
          <Button
            variant="primary"
            size="md"
            isDisabled={(attemptedStep === step && !canGoNext) || isSubmitting}
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

      <BottomSheet isOpen={isMapSheetOpen} onOpenChange={setIsMapSheetOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content snapPoints={["92%"]}>
            <BottomSheet.Close />
            <BottomSheet.Title>Choose location</BottomSheet.Title>
            <BottomSheet.Description>
              Map picker will be connected next.
            </BottomSheet.Description>
            <View className="mt-5 h-80 items-center justify-center rounded-3xl bg-surface-secondary">
              <MapPin size={36} color={accentColor} />
              <Text className="text-muted mt-2 text-sm">Map placeholder</Text>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}
