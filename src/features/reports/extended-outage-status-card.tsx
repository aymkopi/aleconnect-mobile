import { Clock3 } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Text } from "@/components/panelui/text";
import { formatReportDate, type IncidentPublicUpdate } from "./data";
import { useAppColors } from "@/hooks/use-app-colors";
import { parseApiInstant } from "@/utils/manila-time";
import { publishedRestorationEstimate } from "./detail-presentation";

export function operationalPhaseLabel(phase: unknown) {
  if (typeof phase !== "string" || !phase.trim()) return "Service update";
  const label = phase.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ExtendedOutageStatusCard({
  updates,
  onPress,
}: {
  updates: IncidentPublicUpdate[];
  onPress?: () => void;
}) {
  const [primary] = useAppColors(["primary"]);
  const latest = updates[updates.length - 1];
  if (
    !latest ||
    typeof latest.publicNote !== "string" ||
    !latest.publicNote.trim()
  )
    return null;
  const estimate = publishedRestorationEstimate(latest);
  const content = (
    <View className="rounded-xl bg-card p-3 gap-2">
      <View className="flex-row gap-2 items-center">
        <Clock3 size={18} color={primary} />
        <Text weight="semibold" size="sm" className="flex-1">
          {latest.classification === "extended_outage"
            ? "Extended outage — Restoration in progress"
            : "Restoration update"}
        </Text>
      </View>
      {latest.phase ? (
        <Text muted size="xs">
          {operationalPhaseLabel(latest.phase)}
        </Text>
      ) : null}
      <Text size="sm">{latest.publicNote}</Text>
      <Text muted size="xs">
        Estimate: {estimate}
      </Text>
      {parseApiInstant(latest.nextUpdateDueAt) ? (
        <Text muted size="xs">
          Next update by {formatReportDate(latest.nextUpdateDueAt)}
        </Text>
      ) : null}
      {parseApiInstant(latest.publishedAt) ? (
        <Text muted size="xs">
          Published {formatReportDate(latest.publishedAt)}
        </Text>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Read restoration update from ALECO"
      onPress={onPress}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
