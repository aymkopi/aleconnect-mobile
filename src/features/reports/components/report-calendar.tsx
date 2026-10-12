import { useState } from "react";
import { View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import { calendarDays, manilaDateKey, validDateRange } from "../browse-filter";
export function ReportCalendar({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const [month, setMonth] = useState(
    (validDateRange(value, value) ? value : manilaDateKey(new Date())).slice(
      0,
      7,
    ),
  );
  const [primary, foreground] = useAppColors(["primary", "foreground"]);
  function move(offset: number) {
    const date = new Date(month + "-01T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + offset);
    setMonth(date.toISOString().slice(0, 7));
  }
  const title = new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(month + "-01T00:00:00Z"));
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Previous month"
          onPress={() => move(-1)}
        >
          <ChevronLeft color={primary} size={20} />
        </Button>
        <Text weight="semibold">{title}</Text>
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel="Next month"
          onPress={() => move(1)}
        >
          <ChevronRight color={primary} size={20} />
        </Button>
      </View>
      <View className="flex-row">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <View key={i} className="flex-1 items-center">
            <Text muted size="xs">
              {day}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {calendarDays(month).map((day, i) => (
          <View key={day || i} style={{ width: "14.2857%" }}>
            {day ? (
              <Button
                size="sm"
                variant={day === value ? "primary" : "ghost"}
                accessibilityLabel={day}
                accessibilityState={{ selected: day === value }}
                style={{ minHeight: 44, paddingHorizontal: 0 }}
                onPress={() => onSelect(day)}
              >
                <Text style={{ color: day === value ? undefined : foreground }}>
                  {Number(day.slice(-2))}
                </Text>
              </Button>
            ) : (
              <View style={{ height: 44 }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
