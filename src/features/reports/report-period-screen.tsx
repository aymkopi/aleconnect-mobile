import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { ReportPage } from "./components/report-page";
import { Calendar } from "@/components/panelui/calendar";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { RadioGroup } from "@/components/panelui/radio-group";
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
  const params = useLocalSearchParams<{ period?: string; start?: string; end?: string }>();
  const today = manilaDateKey(new Date()), first = "2026-01-01";
  const bounds = validDateRange(first, today) ? { start: first, end: today } : null;
  const [period, setPeriod] = useState(typeof params.period === "string" && Object.keys(reportPeriodLabels).includes(params.period) ? params.period : "all");
  const initialDate = (value: unknown) => typeof value === "string" && validDateRange(value, value)
    ? value < first ? first : value > today ? today : value : today;
  const [start, setStart] = useState(initialDate(params.start));
  const [end, setEnd] = useState(initialDate(params.end));
  const [open, setOpen] = useState(false);
  const [primary] = useAppColors(["primary"]);
  const rangeValid = dateRangeWithinBounds(start, end, bounds);
  const selected = validDateRange(start, start) ? { from: reportPickerDate(start), ...(validDateRange(end, end) ? { to: reportPickerDate(end) } : {}) } : undefined;
  const selectionLabel = selected ? dateLabel(start) + (end ? " – " + dateLabel(end) : " – choose an end date") : "Choose start and end dates";
  return (
    <ReportPage title="Reporting period" footer={
      <Button fullWidth disabled={period === "custom" && !rangeValid} onPress={() => router.dismissTo({
        pathname: "/reports", params: { period, start: period === "custom" ? start : "", end: period === "custom" ? end : "" },
      })}>Apply period</Button>
    }>
      <Text muted size="sm">Choose the period for your report summary.</Text>
      <Text size="xs" weight="medium" accessibilityLiveRegion="polite">Selected: {reportPeriodLabels[period as keyof typeof reportPeriodLabels]}</Text>
      <RadioGroup variant="card" value={period} onValueChange={setPeriod} accessibilityLabel="Reporting period">
        {Object.entries(reportPeriodLabels).map(([value, label]) => {
          const range = reportPeriodRange(value);
          return <RadioGroup.Item key={value} value={value} label={label}
            description={value !== "all" && value !== "custom" ? dateLabel(range.start) + " – " + dateLabel(range.end) : undefined} />;
        })}
      </RadioGroup>
      {period === "custom" ? <View className="gap-1">
        <Label isRequired>Date range</Label>
        <Button variant="secondary" className="justify-start" disabled={!bounds}
          startContent={<CalendarDays size={18} color={primary} />} onPress={() => setOpen(true)}>
          {selectionLabel}
        </Button>
        <Text muted size="xs">Available from {dateLabel(first)} through today.</Text>
        {!rangeValid ? <Text accessibilityRole="alert" size="xs" className="text-destructive">Choose both dates within the available range.</Text> : null}
      </View> : null}
      <Text muted size="xs">The selected period filters loaded reports by their submission date, including the resolved count.</Text>
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheet.Content size="auto">
          <BottomSheet.Header><Text size="lg" weight="semibold">Custom date range</Text></BottomSheet.Header>
          <BottomSheet.Body className="gap-3">
            <Text size="sm" weight="medium" accessibilityLiveRegion="polite">Selected: {selectionLabel}</Text>
            <Calendar key={String(open)} mode="range" bordered={false} locale="en-PH" captionLayout="dropdown"
              defaultMonth={reportPickerDate(today)} selectOutsideDays weekStartsOn="auto"
              minDate={bounds ? reportPickerDate(first) : undefined} maxDate={reportPickerDate(today)}
              selected={selected} onSelect={range => {
                setStart(range ? reportPickerDateKey(range.from) : "");
                setEnd(range?.to ? reportPickerDateKey(range.to) : "");
              }} />
            {!rangeValid ? <Text size="xs" className="text-destructive">Select a start date, then an end date.</Text> : null}
          </BottomSheet.Body>
          <BottomSheet.Footer><Button fullWidth disabled={!rangeValid} onPress={() => setOpen(false)}>Use selected dates</Button></BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
    </ReportPage>
  );
}
