import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, Check, ClipboardCheck, MapPin } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { ReportStatusBadge } from "./report-status-badge";
import { PreviewLabel } from "@/components/preview-label";
import { useAppColors } from "@/hooks/use-app-colors";

export function ReportReceipt({
  ticketNumber,
  title,
  issue,
  account,
  address,
  photoCount,
  fixture,
  onTrack,
  onHome,
}: {
  ticketNumber: string;
  title: string;
  issue: string;
  account: string;
  address: string;
  photoCount: number;
  fixture: boolean;
  onTrack: () => void;
  onHome: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [primary, muted, success] = useAppColors([
    "primary",
    "muted-foreground",
    "success",
  ]);
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
      >
        <PreviewLabel />
        <View className="rounded-3xl border border-border bg-muted p-1">
          <View className="flex-row items-center justify-center gap-2 py-2">
            <ReportStatusBadge status="under_review" />
          </View>
          <View className="rounded-[20px] bg-card border border-border p-4 gap-3">
            <View className="items-center gap-2">
              <View className="h-10 w-10 rounded-full bg-success/10 items-center justify-center">
                <Check size={20} color={success} />
              </View>
              <Text
                accessibilityRole="header"
                className="text-center"
                style={{
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  fontSize: 20,
                  lineHeight: 28,
                }}
              >
                We’ve received your report.
              </Text>
              <Text
                weight="semibold"
                className="rounded-xl bg-primary/5 text-primary px-3 py-2"
              >
                {ticketNumber}
              </Text>
            </View>
            <View className="rounded-xl bg-background p-3 gap-3">
              <View className="flex-row gap-3 items-center">
                <View className="h-8 w-8 rounded-full bg-primary/5 items-center justify-center">
                  <ClipboardCheck size={18} color={primary} />
                </View>
                <View className="flex-1 gap-1">
                  <Text size="sm" weight="semibold">
                    {title}
                  </Text>
                  <Text size="xs" muted>
                    {issue}
                  </Text>
                </View>
              </View>
              <View className="border-t border-border pt-3 gap-2">
                <View className="flex-row gap-2 items-center">
                  <Building2 size={16} color={muted} />
                  <Text size="xs" className="flex-1">
                    {account}
                  </Text>
                </View>
                <View className="flex-row gap-2 items-start">
                  <MapPin size={16} color={muted} />
                  <Text size="xs" muted className="flex-1">
                    {address}
                  </Text>
                </View>
                <Text size="xs" muted>
                  {photoCount} photos attached ·{" "}
                  {fixture ? "Sample receipt" : "Received just now"}
                </Text>
              </View>
            </View>
            {fixture ? (
              <Text size="xs" muted>
                Simulated confirmation · no report was sent.
              </Text>
            ) : null}
            <View className="gap-1">
              <Text size="sm" weight="semibold">
                What happens next
              </Text>
              <Text size="xs" muted>
                ALECO will review your report. Follow its progress in Reports;
                alerts arrive when enabled.
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Button variant="ghost" className="flex-1" onPress={onHome}>
                Back to Home
              </Button>
              <Button className="flex-1 rounded-2xl" onPress={onTrack}>
                Track report
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
