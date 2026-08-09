import { Alert, AlertText } from "@/components/ui/alert";
import {
  BottomSheetHeader,
  BottomSheetTextInput,
} from "@/components/ui/bottomsheet";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
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
import type { ComplaintMeta } from "@/features/reports/data";
import { ChevronDown, MapPin } from "lucide-react-native";
import { View } from "react-native";

export type ProfileAddressDraft = {
  municipalityCode: string;
  barangayPsgc: string;
  purokOrStreet: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  value: ProfileAddressDraft;
  meta: ComplaintMeta;
  error: string | null;
  currentAddress: string;
  isUpdating: boolean;
  onChange: (value: ProfileAddressDraft) => void;
  onOpenMap: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export function ProfileAddressSheetContent({
  value,
  meta,
  error,
  currentAddress,
  isUpdating,
  onChange,
  onOpenMap,
  onCancel,
  onSave,
}: Props) {
  const selectedMunicipality = meta.municipalities.find(
    (item) => item.code === value.municipalityCode,
  );
  const selectedBarangay = meta.barangays.find(
    (item) => item.code === value.barangayPsgc,
  );
  const barangays = meta.barangays.filter(
    (item) => item.municipalityCode === value.municipalityCode,
  );
  const hasPin = value.latitude != null && value.longitude != null;

  return (
    <View className="gap-4">
      <BottomSheetHeader
        title="Update Address"
        description="Update your complete service address and verify its Albay map pin."
        closeAccessibilityLabel="Close update address"
      />

      <View className="gap-4 rounded-lg border border-border/90 bg-card p-4">
        <FormControl isRequired>
          <FormControlLabel>
            <FormControlLabelText>Municipality</FormControlLabelText>
          </FormControlLabel>
          <Select
            selectedLabel={selectedMunicipality?.name}
            selectedValue={value.municipalityCode}
            isDisabled={isUpdating || !meta.municipalities.length}
            onValueChange={(municipalityCode) => {
              const matchingBarangays = meta.barangays.filter(
                (item) => item.municipalityCode === municipalityCode,
              );
              onChange({
                ...value,
                municipalityCode,
                barangayPsgc:
                  matchingBarangays.length === 1 ? matchingBarangays[0].code : "",
              });
            }}
          >
            <SelectTrigger className="h-12 rounded-lg">
              <SelectInput
                className="flex-1"
                placeholder="Select municipality"
                value={selectedMunicipality?.name}
              />
              <SelectIcon as={ChevronDown} className="mr-3" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent
                title="Municipality"
                description="Choose the municipality for this service address."
              >
                <SelectScrollView>
                  {meta.municipalities.map((item) => (
                    <SelectItem key={item.code} label={item.name} value={item.code} />
                  ))}
                </SelectScrollView>
              </SelectContent>
            </SelectPortal>
          </Select>
        </FormControl>

        <FormControl isRequired>
          <FormControlLabel>
            <FormControlLabelText>Barangay</FormControlLabelText>
          </FormControlLabel>
          <Select
            selectedLabel={selectedBarangay?.name}
            selectedValue={value.barangayPsgc}
            isDisabled={isUpdating || !value.municipalityCode}
            onValueChange={(barangayPsgc) => onChange({ ...value, barangayPsgc })}
          >
            <SelectTrigger className="h-12 rounded-lg">
              <SelectInput
                className="flex-1"
                placeholder="Select barangay"
                value={selectedBarangay?.name}
              />
              <SelectIcon as={ChevronDown} className="mr-3" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent
                title="Barangay"
                description="Choose a barangay within the selected municipality."
              >
                <SelectScrollView>
                  {barangays.map((item) => (
                    <SelectItem key={item.code} label={item.name} value={item.code} />
                  ))}
                </SelectScrollView>
              </SelectContent>
            </SelectPortal>
          </Select>
        </FormControl>

        <FormControl isRequired>
          <FormControlLabel>
            <FormControlLabelText>Purok or street</FormControlLabelText>
          </FormControlLabel>
          <BottomSheetTextInput
            className="h-12 rounded-lg bg-background"
            value={value.purokOrStreet}
            onChangeText={(purokOrStreet) => onChange({ ...value, purokOrStreet })}
            placeholder="Enter purok or street"
            maxLength={100}
            autoCapitalize="words"
            editable={!isUpdating}
          />
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Landmark (optional)</FormControlLabelText>
          </FormControlLabel>
          <BottomSheetTextInput
            className="h-12 rounded-lg bg-background"
            value={value.landmark}
            onChangeText={(landmark) => onChange({ ...value, landmark })}
            placeholder="Nearest landmark"
            maxLength={255}
            autoCapitalize="words"
            editable={!isUpdating}
          />
        </FormControl>

        <FormControl isRequired isInvalid={Boolean(error)}>
          <FormControlLabel>
            <FormControlLabelText>Map location</FormControlLabelText>
          </FormControlLabel>
          <Button
            variant="secondary"
            className="justify-start"
            onPress={onOpenMap}
            isDisabled={isUpdating}
            accessibilityLabel="Choose location on map"
          >
            <ButtonIcon as={MapPin} height={18} width={18} />
            <ButtonText>{hasPin ? "Change pinned location" : "Choose location on map"}</ButtonText>
          </Button>
          <Text className="mt-1 text-xs text-muted-foreground">
            {hasPin ? "Map location selected." : "No map location selected."}
          </Text>
          {error ? (
            <FormControlError>
              <FormControlErrorText>{error}</FormControlErrorText>
            </FormControlError>
          ) : null}
        </FormControl>

        <Alert className="border-accent/20 bg-accent/10 px-3 py-3">
          <AlertText>Current address: {currentAddress}.</AlertText>
        </Alert>
      </View>

      <View className="flex-row gap-2">
        <Button variant="ghost" onPress={onCancel} isDisabled={isUpdating} className="flex-1">
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button onPress={onSave} isDisabled={isUpdating} className="flex-1">
          <ButtonText>{isUpdating ? "Saving..." : "Save address"}</ButtonText>
        </Button>
      </View>
    </View>
  );
}
