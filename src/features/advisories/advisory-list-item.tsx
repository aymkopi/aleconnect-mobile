import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import type { MobileAdvisory } from "@/services/advisories";
import {
  formatManilaAdvisoryInterruptionRange,
  formatManilaReportListDateTime,
} from "@/utils/manila-time";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

function formatAdvisoryLabel(
  value: string | null | undefined,
  fallback: string,
) {
  const normalized = value?.trim();

  if (!normalized) {
    return fallback;
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function AdvisorySeverityBadge({ severity }: { severity: string }) {
  const normalized = severity
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const tone =
    normalized === "critical" || normalized === "high"
      ? "bg-danger text-danger-foreground"
      : normalized === "medium"
        ? "bg-warning text-warning-foreground"
        : normalized === "low"
          ? "bg-secondary text-secondary-foreground"
          : normalized === "info"
            ? "bg-accent/10 text-accent"
            : "bg-secondary text-secondary-foreground";

  const [backgroundClass, textClass] = tone.split(" ");

  return (
    <View className={`shrink-0 rounded-md px-2 py-1 ${backgroundClass}`}>
      <Text className={`text-[11px] font-semibold leading-4 ${textClass}`}>
        {formatAdvisoryLabel(severity, "Info")}
      </Text>
    </View>
  );
}

export function AdvisoryListItem({
  advisory,
  onPress,
}: {
  readonly advisory: MobileAdvisory;
  readonly onPress: () => void;
}) {
  const [mutedForegroundColor] = useAppColors(["muted-foreground"]);

  const controlNumber = advisory.controlNumber?.trim() || null;

  const typeLabel = formatAdvisoryLabel(advisory.type, "Advisory");

  const interruptionRange = formatManilaAdvisoryInterruptionRange(
    advisory.scheduledStartAt,
    advisory.scheduledEndAt,
  );

  const audience = advisory.audience?.trim() || null;

  const primaryText = interruptionRange
    ? `${typeLabel} · ${interruptionRange}`
    : typeLabel;

  return (
    <Pressable
      accessibilityLabel={`Open advisory ${controlNumber ?? typeLabel}`}
      accessibilityRole="button"
      className="rounded-lg border border-border bg-card px-4 py-3 active:bg-secondary"
      onPress={onPress}
    >
      <View className="gap-2">
        {/* Control number + severity */}
        <View className="flex-row items-center justify-between gap-3">
          {controlNumber ? (
            <Text
              className="min-w-0 flex-1 text-xs font-medium text-muted-foreground"
              numberOfLines={1}
            >
              {controlNumber}
            </Text>
          ) : (
            <View className="flex-1" />
          )}

          <AdvisorySeverityBadge severity={advisory.severity || "info"} />
        </View>

        {/* Advisory type + interruption */}
        <Text
          className="text-base font-semibold leading-5 text-foreground"
          numberOfLines={2}
        >
          {primaryText}
        </Text>

        {/* Publication + audience */}
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 gap-0.5">
            <Text
              className="text-xs leading-4 text-foreground"
              numberOfLines={1}
            >
              Published: {formatManilaReportListDateTime(advisory.publishedAt)}
            </Text>

            {audience ? (
              <Text
                className="text-xs leading-4 text-muted-foreground"
                numberOfLines={1}
              >
                {audience}
              </Text>
            ) : null}
          </View>

          <ChevronRight
            size={18}
            color={mutedForegroundColor}
            strokeWidth={2}
          />
        </View>
      </View>
    </Pressable>
  );
}
