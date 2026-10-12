import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { ReportPage } from "./components/report-page";
import { DatePicker } from "@/components/panelui/date-picker";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Label } from "@/components/panelui/label";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  reportPeriodLabels, reportPeriodRange, validDateRange, manilaDateKey,
  dateRangeWithinBounds, reportPickerDate, reportPickerDateKey,
} from "./browse-filter";

function dateLabel(value: string) {
  return validDateRange(value, value)
    ? new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(value + "T00:00:00Z"))
    : "Choose date";
}
export default function ReportPeriodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ period?: string; start?: string; end?: string; firstReportDate?: string }>();
  const today = manilaDateKey(new Date());
  const first = "2026-01-01";
  const bounds = validDateRange(first, today) ? { start: first, end: today } : null;
  const [period, setPeriod] = useState(typeof params.period === "string" && Object.keys(reportPeriodLabels).includes(params.period) ? params.period : "all");
  const [start, setStart] = useState(typeof params.start === "string" && validDateRange(params.start, params.start) ? params.start < first ? first : params.start > today ? today : params.start : first);
  const [end, setEnd] = useState(typeof params.end === "string" && validDateRange(params.end, params.end) ? params.end < first ? first : params.end > today ? today : params.end : today);
  const [primaryForeground] = useAppColors(["primary-foreground"]);
  const rangeValid = dateRangeWithinBounds(start, end, bounds);
  return (
    <ReportPage title="Reporting period" footer={
      <Button fullWidth disabled={period === "custom" && !rangeValid} onPress={() => router.dismissTo({
        pathname: "/reports", params: { period, start: period === "custom" ? start : "", end: period === "custom" ? end : "" },
      })}>Apply period</Button>
    }>
      <Text muted size="sm">Choose the period for your report summary.</Text>
      {Object.entries(reportPeriodLabels).map(([value, label]) => {
        const range = reportPeriodRange(value);
        return (
          <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label}
            accessibilityState={{ checked: period === value }} aria-checked={period === value}
            onPress={() => setPeriod(value)}
            className={"flex-row items-center gap-3 rounded-xl p-3 " + (period === value ? "bg-accent" : "bg-card")}
            style={{ minHeight: 56 }}>
            <View className="flex-1 gap-1">
              <Text weight="semibold">{label}</Text>
              {value !== "all" && value !== "custom" ? <Text muted size="xs">{dateLabel(range.start)} — {dateLabel(range.end)}</Text> : null}
            </View>
            <View className={"items-center justify-center rounded-full w-6 h-6 " + (period === value ? "bg-primary" : "bg-control")}>
              {period === value ? <Check size={16} color={primaryForeground} /> : null}
            </View>
          </Pressable>
        );
      })}
      {period === "custom" ? (
        <View className="gap-1">
          <Label isRequired>Date range</Label>
          <DatePicker mode="range" presentation="bottom-sheet" locale="en-PH" weekStartsOn={1}
            placeholder="Start date — End date" captionLayout="dropdown" disabled={!bounds}
            minDate={bounds ? reportPickerDate(bounds.start) : undefined}
            maxDate={reportPickerDate(today)}
            selected={validDateRange(start, start) ? { from: reportPickerDate(start), ...(validDateRange(end, end) ? { to: reportPickerDate(end) } : {}) } : undefined}
            onSelect={range => { setStart(range ? reportPickerDateKey(range.from) : ""); setEnd(range?.to ? reportPickerDateKey(range.to) : ""); }}
            className="w-full bg-card rounded-xl min-h-12"
          />
          <Text muted size="xs">{bounds ? "Available from " + dateLabel(bounds.start) + ", through today." : "Load your reports to choose a custom range."}</Text>
          {bounds && !rangeValid ? <Text accessibilityRole="alert" size="xs" className="text-destructive">Choose both dates within the available range.</Text> : null}
        </View>
      ) : null}
      <Text muted size="xs">The selected period filters loaded reports by their submission date, including the resolved count.</Text>
    </ReportPage>
  );
}
