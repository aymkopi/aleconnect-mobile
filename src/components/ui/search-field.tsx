import { Search, X } from "lucide-react-native";
import type { ComponentProps } from "react";

import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";

type SearchFieldProps = Omit<ComponentProps<typeof Input>, "children"> & {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  value: string;
};

export function SearchField({
  accessibilityLabel,
  className,
  onChangeText,
  onClear,
  placeholder = "Search",
  value,
  ...props
}: SearchFieldProps) {
  return (
    <Input className={`h-12 rounded-xl ${className ?? ""}`} {...props}>
      <InputSlot pointerEvents="none">
        <InputIcon as={Search} />
      </InputSlot>
      <InputField
        accessibilityLabel={accessibilityLabel}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        value={value}
      />
      {value && onClear ? (
        <InputSlot
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          className="h-10 w-10"
          onPress={onClear}
        >
          <InputIcon as={X} />
        </InputSlot>
      ) : null}
    </Input>
  );
}
