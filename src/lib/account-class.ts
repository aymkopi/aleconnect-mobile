// Keep labels aligned with Staff's src/lib/account-class.ts.
export const accountClassLabels: Record<string, string> = {
  RM: "Residential Mainland",
  RI: "Residential Island",
  LVM: "Low Voltage Mainland",
  LVI: "Low Voltage Island",
  HV: "High Voltage",
  CM: "Commercial Mainland",
  CI: "Commercial Island",
};

export function formatAccountClass(value: string | null | undefined) {
  return value ? accountClassLabels[value] ?? value : null;
}
