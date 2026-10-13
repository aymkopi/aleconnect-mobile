import { SearchBar } from "@/components/panelui/search-bar";
export function SearchField({
  value,
  onChangeText,
  placeholder = "Search",
  compact = false,
  isClearable = true,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  compact?: boolean;
  isClearable?: boolean;
}) {
  return (
    <SearchBar
      accessibilityLabel={placeholder}
      value={value}
      isClearable={isClearable}
      onChangeText={onChangeText}
      placeholder={placeholder}
      cancel="never"
      panel="never"
      containerClassName="w-full"
      className={
        compact
          ? "min-h-11 rounded-xl bg-card text-sm"
          : "min-h-12 rounded-xl bg-card text-sm"
      }
    />
  );
}
