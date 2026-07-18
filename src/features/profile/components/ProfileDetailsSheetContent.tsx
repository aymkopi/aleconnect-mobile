import { Alert, AlertText } from "@/components/ui/alert";
import { BottomSheetTextInput } from "@/components/ui/bottomsheet";
import { Button, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
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
  isUpdating,
  onChangeInput,
  onCancel,
  onSave,
}: ProfileDetailsSheetContentProps) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Heading size="lg">{sheetTitle}</Heading>
        <Text className="text-sm text-muted-foreground">{sheetDescription}</Text>
      </View>
      <View className="gap-4 rounded-lg border border-border bg-card p-4">
        <FormControl isInvalid={!!inputError} isRequired>
          <FormControlLabel>
            <FormControlLabelText>
            {editingField === "phone"
              ? "New phone number"
              : editingField === "email"
                ? "New email address"
                : "New address"}
            </FormControlLabelText>
          </FormControlLabel>
          <View className="w-full flex-row items-center">
            <BottomSheetTextInput
              className="h-12 flex-1 rounded-xl pl-10"
              value={inputValue}
              onChangeText={onChangeInput}
              keyboardType={editingField === "phone" ? "number-pad" : "default"}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={
                editingField === "phone"
                  ? 11
                  : editingField === "email"
                    ? 50
                    : undefined
              }
              placeholder={
                editingField === "phone"
                  ? "Enter new phone number"
                  : editingField === "email"
                    ? "Enter new email"
                    : "Address update coming soon"
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
        <Alert className="border-primary/20 bg-primary/10">
          <AlertText>
            {editingField === "phone"
              ? `Current phone number: ${currentPhone}.`
              : editingField === "email"
                ? `Current email: ${currentEmail}.`
                : "Address updates will be available soon."}
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
          variant="outline"
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
