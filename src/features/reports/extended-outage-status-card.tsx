import { CalendarClock, Clock3 } from "lucide-react-native";
import { View } from "react-native";

import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import type { IncidentPublicUpdate } from "@/features/reports/data";
import { formatReportDate, formatStatus } from "@/features/reports/data";
import { useAppColors } from "@/hooks/use-app-colors";

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

export function ExtendedOutageStatusCard({
  updates,
}: {
  updates: IncidentPublicUpdate[];
}) {
  const [accentColor] = useAppColors(["accent"]);
  if (!updates.length) return null;
  const latest = updates[updates.length - 1];
  const extended = latest.classification === "extended_outage";
  const estimate = latest.estimateStartAt && latest.estimateEndAt
    ? `${formatReportDate(latest.estimateStartAt)} to ${formatReportDate(latest.estimateEndAt)}`
    : latest.estimateUnavailableReason || "Awaiting field assessment";

  return (
    <View className="gap-4 rounded-lg border border-border bg-card p-5">
      <View className="flex-row items-center gap-2">
        <Clock3 size={18} color={accentColor} />
        <Heading size="sm">
          {extended ? "Extended outage — Restoration in progress" : "Restoration update"}
        </Heading>
      </View>
      <View className="gap-1 rounded-lg bg-accent/10 p-4">
        <Text className="text-xs font-bold uppercase text-muted-foreground">
          {formatStatus(latest.phase)}
        </Text>
        <Text className="text-sm font-semibold text-foreground">{latest.publicNote}</Text>
        <Text className="mt-1 text-xs text-muted-foreground">Estimate: {estimate}</Text>
        <Text className="text-xs text-muted-foreground">
          Next update by {formatReportDate(latest.nextUpdateDueAt)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          Updated {relativeTime(latest.publishedAt)}
        </Text>
      </View>
      <View>
        <View className="mb-3 flex-row items-center gap-2">
          <CalendarClock size={16} color={accentColor} />
          <Text className="text-sm font-bold text-foreground">Public update history</Text>
        </View>
        {updates.map((update, index) => (
          <View
            key={update.id}
            className={index ? "border-border border-t pt-3" : ""}
            style={{ marginTop: index ? 12 : 0 }}
          >
            <Text className="text-xs font-bold text-muted-foreground">
              {formatStatus(update.phase)} · {formatReportDate(update.publishedAt)}
            </Text>
            <Text className="mt-1 text-sm text-foreground">{update.publicNote}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
