import { useUniwind } from "uniwind";
import { consumerTicketStatusColors } from "./status";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Archive, BadgeCheck, CircleCheck, CircleX, ClipboardList, Truck, Wrench } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "./components/report-page";
import { consumerTicketStatusLabel, type ConsumerTicketStatus } from "./data";
import { reportStatusDescription } from "./detail-presentation";

const stages: ConsumerTicketStatus[] = [
  "under_review",
  "verified",
  "dispatched",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
];
const icons = { under_review: ClipboardList, verified: BadgeCheck, dispatched: Truck, in_progress: Wrench, resolved: CircleCheck, closed: Archive, rejected: CircleX };
export default function ReportStatusScreen() {
  const router = useRouter();
  const { id, serviceAccountId } = useLocalSearchParams<{
    id?: string;
    serviceAccountId?: string;
  }>();
  const { theme } = useUniwind();
  const dark = theme === "dark" || theme.endsWith("-dark");
  const viewReport = () => {
    if (router.canGoBack()) router.back();
    else if (id)
      router.replace({
        pathname: "/report/[id]",
        params: { id, ...(serviceAccountId ? { serviceAccountId } : {}) },
      });
    else router.replace("/reports");
  };
  return (
    <ReportPage
      title="Report status"
      onBack={viewReport}
      footer={
        <Button fullWidth onPress={viewReport}>
          {id ? "View report" : "Back to reports"}
        </Button>
      }
    >
      <Text
        weight="semibold"
        style={{ fontSize: 18, lineHeight: 26 }}
        accessibilityRole="header"
      >
        Understand your report status
      </Text>
      {stages.map((status) => {
        const Icon = icons[status];
        return <View
          key={status}
          className="rounded-xl bg-card p-3 gap-2"
          style={{ minHeight: 64 }}
        >
          <View className="flex-row gap-3 items-center">
            <View
              className="rounded-xl items-center justify-center"
              style={{ width: 32, height: 32, backgroundColor: consumerTicketStatusColors(status, dark).background }}
            >
              <Icon size={18} color={consumerTicketStatusColors(status, dark).foreground} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text weight="semibold" size="sm">
                {consumerTicketStatusLabel(status)}
              </Text>
              <Text muted size="xs">
                {reportStatusDescription[status]}
              </Text>
            </View>
          </View>
        </View>;
      })}
      <Text muted size="sm">
        Your ticket shows the stages actually reached. Arrival and restoration times appear only when ALECO confirms them.
      </Text>
    </ReportPage>
  );
}
