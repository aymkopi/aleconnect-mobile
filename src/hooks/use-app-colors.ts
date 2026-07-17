import { useCSSVariable } from "uniwind";

export type AppColorToken =
  | "accent"
  | "accent-foreground"
  | "background"
  | "border"
  | "card"
  | "card-foreground"
  | "danger"
  | "destructive"
  | "foreground"
  | "input"
  | "muted"
  | "muted-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "ring"
  | "separator"
  | "success"
  | "surface"
  | "surface-foreground"
  | "warning";

export function useAppColors<const T extends readonly AppColorToken[]>(
  names: T,
): { [K in keyof T]: string } {
  const values = useCSSVariable(names.map((name) => `--color-${name}`));

  return values.map((value, index) => {
    if (typeof value !== "string") {
      throw new Error(`Missing color token: ${names[index]}`);
    }
    return value;
  }) as { [K in keyof T]: string };
}
