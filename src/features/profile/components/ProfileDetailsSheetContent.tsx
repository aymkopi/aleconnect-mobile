import {
  Alert,
  BottomSheet,
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  useBottomSheetAwareHandlers,
} from "heroui-native";
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
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <View style={{ paddingBottom: 20, paddingHorizontal: 10, gap: 16 }}>
      <View>
        <BottomSheet.Title>{sheetTitle}</BottomSheet.Title>
        <BottomSheet.Description>{sheetDescription}</BottomSheet.Description>
      </View>
      <View>
        <TextField isInvalid={!!inputError}>
          <Label>
            {editingField === "phone"
              ? "New phone number"
              : editingField === "email"
                ? "New email address"
                : "New address"}
          </Label>
          <View className="w-full flex-row items-center">
            <Input
              className="flex-1 px-10"
              isInvalid={!!inputError}
              variant="secondary"
              onFocus={onFocus}
              onBlur={onBlur}
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
            <View className="absolute left-3.5" pointerEvents="none">
              <SheetIcon size={18} color="#888" />
            </View>
          </View>
          {inputError ? <FieldError>{inputError}</FieldError> : null}
        </TextField>
      </View>
      <Alert className="bg-accent/10 border border-accent/20" status="accent">
        <Alert.Description>
          {editingField === "phone"
            ? `Current phone number: ${currentPhone}.`
            : editingField === "email"
              ? `Current email: ${currentEmail}.`
              : "Address updates will be available soon."}
        </Alert.Description>
      </Alert>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-evenly",
          gap: 8,
        }}
      >
        <Button
          variant="tertiary"
          size="md"
          onPress={onCancel}
          isDisabled={isUpdating}
          style={{ flex: 1 }}
        >
          <Button.Label>Cancel</Button.Label>
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={onSave}
          isDisabled={isUpdating}
          style={{ flex: 1 }}
        >
          <Button.Label>{isUpdating ? "Saving..." : "Save"}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
