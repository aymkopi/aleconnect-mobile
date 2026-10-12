interface NativeSelectOption {
  disabled?: boolean;
  description?: string;
  startContent?: unknown;
}

/**
 * The portable native picker cannot preserve per-option disabled state,
 * descriptions or icons. Keep these options in the styled Select.
 */
export function nativeSelectSupportsOptions(options: NativeSelectOption[]): boolean {
  return options.every((option) => !option.disabled && !option.description && !option.startContent);
}
