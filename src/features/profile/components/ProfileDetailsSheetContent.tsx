import { Alert, AlertText } from "@/components/ui/alert";
import {
  BottomSheetHeader,
  BottomSheetTextInput,
} from "@/components/ui/bottomsheet";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { type LucideIcon } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

export type EditableField = "phone" | "email" | "address";

export type ProfileDetailsSheetContentProps = {
  editingField: EditableField | null;
  sheetTitle: string;
  sheetDescription: string;
  SheetIcon: LucideIcon;
  inputValue: string;
  inputError: string | null;
  currentPhone: string;
  currentEmail: string;
  currentAddress: string;
  isUpdating: boolean;
  onChangeInput: (nextValue: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function ProfileDetailsSheetContent({
  editingField,
  sheetTitle,
  sheetDescription,
  SheetIcon,
  inputValue,
  inputError,
  currentPhone,
  currentEmail,
  currentAddress,
  isUpdating,
  onChangeInput,
  onCancel,
  onSave,
}: ProfileDetailsSheetContentProps) {
  return (
    <View className="gap-4">
      <BottomSheetHeader
        title={sheetTitle}
        description={sheetDescription}
        icon={SheetIcon}
        closeAccessibilityLabel={`Close ${sheetTitle.toLowerCase()}`}
      />
      <View className="gap-4 rounded-lg border border-border/90 bg-card p-4">
        <FormControl isInvalid={!!inputError} isRequired>
          <FormControlLabel>
            <FormControlLabelText>
            {editingField === "phone"
              ? "New phone number"
              : editingField === "email"
                ? "New email address"
                : "New purok or street"}
            </FormControlLabelText>
          </FormControlLabel>
          <View className="w-full flex-row items-center">
            <BottomSheetTextInput
              className="h-12 flex-1 rounded-lg bg-background pl-10"
              value={inputValue}
              onChangeText={onChangeInput}
              keyboardType={editingField === "phone" ? "number-pad" : "default"}
              autoCapitalize={editingField === "address" ? "words" : "none"}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onSave}
              maxLength={
                editingField === "phone"
                  ? 11
                  : editingField === "email"
                    ? 50
                    : 100
              }
              placeholder={
                editingField === "phone"
                  ? "Enter new phone number"
                  : editingField === "email"
                    ? "Enter new email"
                    : "Enter purok or street"
              }
            />
            <View className="absolute left-3.5" style={{ pointerEvents: "none" }}>
              <SheetIcon size={18} color="#888" />
            </View>
          </View>
          {inputError ? (
            <FormControlError>
              <FormControlErrorText>{inputError}</FormControlErrorText>
            </FormControlError>
          ) : null}
        </FormControl>
        <Alert className="border-accent/20 bg-accent/10 px-3 py-3">
          <AlertText>
            {editingField === "phone"
              ? `Current phone number: ${currentPhone}.`
              : editingField === "email"
                ? `Current email: ${currentEmail}.`
                : `Current address: ${currentAddress}.`}
          </AlertText>
        </Alert>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-evenly",
          gap: 8,
        }}
      >
        <Button
          variant="ghost"
          onPress={onCancel}
          isDisabled={isUpdating}
          style={{ flex: 1 }}
        >
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button
          onPress={onSave}
          isDisabled={isUpdating}
          style={{ flex: 1 }}
        >
          <ButtonText>{isUpdating ? "Saving..." : "Save"}</ButtonText>
        </Button>
      </View>
    </View>
  );
}
