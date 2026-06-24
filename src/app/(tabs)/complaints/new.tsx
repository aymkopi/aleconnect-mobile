import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import {
  complaintCategories,
  initialComplaintForm,
  nextTicketNumber,
  reportTypesByCategory,
  type ComplaintFormState,
} from "@/features/complaints/data";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useRouter } from "expo-router";
import {
  BottomSheet,
  Button,
  Checkbox,
  Input,
  Label,
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
import { useEffect, useState } from "react";
import {
  type DimensionValue,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ReportInput({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  isRequired,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  isRequired?: boolean;
}) {
  return (
    <TextField isRequired={isRequired}>
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </TextField>
  );
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
  const { session } = useAuthSession();
  const sessionUsername = session?.user.username ?? "";
  const [isMapSheetOpen, setIsMapSheetOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ComplaintFormState>({
    ...initialComplaintForm,
    accountNumber: sessionUsername,
  });

  useEffect(() => {
    if (!sessionUsername) {
      return;
    }

    setForm((current) =>
      current.accountNumber
        ? current
        : { ...current, accountNumber: sessionUsername },
    );
  }, [sessionUsername]);

  const selectedCategory = complaintCategories.find(
    (category) => category.id === form.category,
  );
  const reportTypes = form.category ? reportTypesByCategory[form.category] : [];
  const progressWidth = `${(step / 5) * 100}%` as DimensionValue;
  const title =
    step === 1
      ? "Report an Issue"
      : step === 2
        ? "Location and Account"
        : step === 3
          ? "Details and Evidence"
          : step === 4
            ? "Review Report"
            : "To be verified";
  const canGoNext =
    step === 1
      ? Boolean(form.category)
      : step === 2
        ? Boolean(
            form.reportType &&
              form.accountNumber &&
              form.municipality &&
              form.barangay,
          )
        : step === 3
          ? Boolean(form.description && form.photos >= 3)
          : true;

  const updateForm = <Key extends keyof ComplaintFormState>(
    key: Key,
    value: ComplaintFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleNext = () => {
    if (step === 4) {
      updateForm("ticketNumber", nextTicketNumber());
      setStep(5);
      return;
    }

    setStep((current) => Math.min(5, current + 1));
  };

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="bg-background"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: statusBarHeight + 16,
          gap: 16,
          paddingBottom: bottomPadding + 104,
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
              <Text className="text-foreground text-2xl font-black">
                {title}
              </Text>
              <Text className="text-muted text-sm">
                {selectedCategory?.title ?? "Choose a category"}
              </Text>
            </View>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-default">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: progressWidth }}
            />
          </View>
        </View>

        {step === 1 ? (
          <>
            <Text className="ml-2 text-sm text-muted">Category</Text>
            <View className="flex-row flex-wrap gap-3">
              {complaintCategories.map((category, index) => {
                const selected = form.category === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      updateForm("category", category.id);
                      updateForm(
                        "reportType",
                        reportTypesByCategory[category.id][0],
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="overflow-hidden rounded-3xl p-4"
                    style={{
                      backgroundColor: category.color,
                      minHeight: index === 0 ? 124 : 142,
                      width: index === 0 ? "100%" : "47.8%",
                      opacity: selected || !form.category ? 1 : 0.72,
                    }}
                  >
                    <Text className="text-white text-[21px] font-black leading-6">
                      {category.title}
                    </Text>
                    <Text className="mt-3 text-sm font-semibold text-white/90">
                      {category.description}
                    </Text>
                    {selected ? (
                      <View className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full bg-white/25">
                        <Check size={16} color="white" />
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
            <Surface className="gap-2 rounded-3xl p-3">
              {reportTypes.map((type) => {
                const selected = form.reportType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => updateForm("reportType", type)}
                    className={`flex-row items-center justify-between rounded-2xl px-4 py-3 ${
                      selected ? "bg-accent" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        selected ? "text-white" : "text-foreground"
                      }`}
                    >
                      {type}
                    </Text>
                    {selected ? <Check size={17} color="white" /> : null}
                  </Pressable>
                );
              })}
            </Surface>

            <Text className="ml-2 text-sm text-muted">Account</Text>
            <ReportInput
              isRequired
              label="Account number"
              value={form.accountNumber}
              placeholder="100001321412634"
              onChangeText={(value) => updateForm("accountNumber", value)}
            />

            <Text className="ml-2 text-sm text-muted">Address</Text>
            <Checkbox
              isSelected={form.useHomeAddress}
              onSelectedChange={(selected) =>
                updateForm("useHomeAddress", selected)
              }
            >
              <Checkbox.Indicator />
              <Text className="text-foreground text-sm font-semibold">
                Use home address
              </Text>
            </Checkbox>
            <View className="flex-row items-end gap-2">
              <View className="flex-1">
                <ReportInput
                  isRequired
                  label="Municipality"
                  value={form.municipality}
                  placeholder="Municipality"
                  onChangeText={(value) => updateForm("municipality", value)}
                />
              </View>
              <Button
                isIconOnly
                variant="secondary"
                size="lg"
                onPress={() => setIsMapSheetOpen(true)}
                accessibilityLabel="Open map picker"
              >
                <MapPin size={20} color={foregroundColor} />
              </Button>
            </View>
            <ReportInput
              isRequired
              label="Barangay"
              value={form.barangay}
              placeholder="Barangay"
              onChangeText={(value) => updateForm("barangay", value)}
            />
            <ReportInput
              label="Purok"
              value={form.purok}
              placeholder="Purok or street"
              onChangeText={(value) => updateForm("purok", value)}
            />
            <ReportInput
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
                  {form.photos}/5
                </Text>
              </View>
              <Text className="text-muted mt-1 text-sm">
                Add at least 3 clear photos.
              </Text>
              <View className="mt-3 flex-row gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <Pressable
                    key={index}
                    onPress={() =>
                      updateForm(
                        "photos",
                        Math.min(5, Math.max(form.photos, index + 1)),
                      )
                    }
                    className={`h-14 flex-1 items-center justify-center rounded-2xl ${
                      index < form.photos ? "bg-accent" : "bg-background"
                    }`}
                  >
                    <Camera
                      size={18}
                      color={index < form.photos ? "white" : mutedColor}
                    />
                  </Pressable>
                ))}
              </View>
            </Surface>
          </>
        ) : null}

        {step === 4 ? (
          <Surface className="rounded-3xl p-4">
            <Text className="text-foreground text-lg font-black">Preview</Text>
            {[
              ["Category", selectedCategory?.title],
              ["Type", form.reportType],
              ["Account", form.accountNumber],
              [
                "Address",
                [form.purok, form.barangay, form.municipality, form.landmark]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["Description", form.description],
              ["Action desired", form.desiredAction || "Not specified"],
              ["Photos", `${form.photos} attached`],
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
          className="absolute inset-x-0 bottom-0 flex-row items-end justify-between px-5"
          style={{ paddingBottom: insets.bottom + 18 }}
        >
          <Button
            variant="secondary"
            isIconOnly
            isDisabled={step === 1}
            onPress={() => setStep((current) => Math.max(1, current - 1))}
            accessibilityLabel="Previous"
          >
            <ChevronLeft size={20} color={foregroundColor} />
          </Button>
          <Button
            variant="primary"
            isIconOnly
            size="lg"
            isDisabled={!canGoNext}
            onPress={handleNext}
            accessibilityLabel={step === 4 ? "Submit report" : "Next"}
            className="h-16 w-16 rounded-full"
          >
            {step === 4 ? (
              <Check size={24} color="white" />
            ) : (
              <ChevronRight size={24} color="white" />
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
    </View>
  );
}
