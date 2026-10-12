import { useState } from "react";
import { useUniwind } from "uniwind";
import { consumerTicketStatusColors } from "./status";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
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
export default function ReportStatusScreen() {
  const router = useRouter();
  const { id, serviceAccountId } = useLocalSearchParams<{
    id?: string;
    serviceAccountId?: string;
  }>();
  const [selected, setSelected] = useState<ConsumerTicketStatus | null>(null);
  const [primary] = useAppColors(["primary"]);
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
        From review to closure
      </Text>
      {stages.map((status) => (
        <Pressable
          key={status}
          accessibilityRole="button"
          accessibilityState={{ expanded: selected === status }}
          onPress={() => setSelected(selected === status ? null : status)}
          className="rounded-xl bg-card p-3 gap-2"
          style={{ minHeight: 64 }}
        >
          <View className="flex-row gap-3 items-center">
            <View
              className="rounded-xl items-center justify-center"
              style={{ width: 32, height: 32, backgroundColor: consumerTicketStatusColors(status, dark).background }}
            >
              <FileText size={20} color={consumerTicketStatusColors(status, dark).foreground} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text weight="semibold" size="sm">
                {consumerTicketStatusLabel(status)}
              </Text>
              <Text muted size="xs">
                {reportStatusDescription[status]}
              </Text>
            </View>
            <ChevronRight size={18} color={primary} />
          </View>
          {selected === status ? (
            <Text size="sm">
              This explains the status. Your report’s detail page shows the
              updates ALECO has actually published.
            </Text>
          ) : null}
        </Pressable>
      ))}
      <Text muted size="sm">
        Rejected ends the review branch with a reason. No arrival time is shown
        unless ALECO provides one.
      </Text>
    </ReportPage>
  );
}
