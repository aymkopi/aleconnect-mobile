import { ChildAppBar } from "@/components/child-app-bar";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { ListSection, ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import { useReportQueue } from "@/context/report-queue-context";
import { useAppColors } from "@/hooks/use-app-colors";
import type { ReportQueueItem } from "@/services/report-queue";
import { useFocusEffect, useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudOff,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { useCallback } from "react";
import { BackHandler, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function queueStatus(item: ReportQueueItem) {
  if (item.status === "submitted") {
    return {
      label: item.ticketNumber ? `Ticket ${item.ticketNumber}` : "Submitted",
      Icon: CheckCircle2,
      color: "success" as const,
    };
  }
  if (item.status === "submitting") {
    return { label: "Sending now", Icon: RefreshCw, color: "accent" as const };
  }
  if (item.status === "failed") {
    return { label: "Needs attention", Icon: CloudOff, color: "danger" as const };
  }
  return { label: "Waiting for connection", Icon: Clock3, color: "muted" as const };
}

export default function ReportQueueRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, isSyncing, pendingCount, refresh, retry, remove, sync } =
    useReportQueue();
  const [accent, muted, danger, success] = useAppColors([
    "accent",
    "muted",
    "danger",
    "success",
  ]);
  const colors = { accent, muted, danger, success };

  const handleBack = useCallback(() => {
    router.replace("/reports");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack, refresh]),
  );

  return (
    <View className="flex-1 bg-background">
      <ChildAppBar
        title="Queued reports"
        description={
          pendingCount > 0
            ? `${pendingCount} waiting to submit`
            : "Everything has been sent"
        }
        onBack={handleBack}
        backAccessibilityLabel="Back to reports"
        rightActions={
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          accessibilityLabel="Retry queued reports"
          isDisabled={isSyncing || pendingCount === 0}
          onPress={() => void sync()}
        >
          <ButtonIcon as={RefreshCw} height={19} width={19} />
        </Button>
        }
      />
      <ScrollView
        className="bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          gap: 18,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 20,
        }}
      >

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 py-16">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-accent/15">
            <CheckCircle2 size={26} color={success} />
          </View>
          <Heading className="mt-4 text-center" size="lg">
            No queued reports
          </Heading>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Reports saved without a connection will appear here and send
            automatically when the app reconnects.
          </Text>
          <Button className="mt-5" onPress={() => router.replace("/reports/new")}>
            <ButtonText>Create report</ButtonText>
          </Button>
        </View>
      ) : (
        <ListSection title="Submission activity">
          {items.map((item, index) => {
            const status = queueStatus(item);
            const StatusIcon = status.Icon;
            const canOpen = item.status === "submitted" && item.ticketId;
            return (
              <ListSectionItem
                key={item.id}
                showDivider={index < items.length - 1}
                title={item.title}
                description={
                  <View className="mt-1 gap-1">
                    <View className="flex-row items-center gap-1.5">
                      <StatusIcon size={14} color={colors[status.color]} />
                      <Text className="text-xs text-muted-foreground">
                        {status.label}
                      </Text>
                    </View>
                    {item.lastError ? (
                      <Text className="text-xs text-danger">
                        {item.lastError}
                      </Text>
                    ) : null}
                  </View>
                }
                leading={
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <StatusIcon size={18} color={colors[status.color]} />
                  </View>
                }
                trailing={
                  <View className="flex-row items-center gap-1">
                    {item.status === "failed" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        accessibilityLabel="Retry report"
                        onPress={() => void retry(item.id)}
                      >
                        <ButtonIcon as={RefreshCw} height={17} width={17} />
                      </Button>
                    ) : null}
                    {item.status !== "submitting" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        accessibilityLabel="Remove from queue"
                        onPress={() => void remove(item.id)}
                      >
                        <ButtonIcon as={Trash2} height={17} width={17} />
                      </Button>
                    ) : null}
                    {canOpen ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        accessibilityLabel="View submitted report"
                        onPress={() =>
                          router.push({
                            pathname: "/report/[id]",
                            params: { id: item.ticketId! },
                          })
                        }
                      >
                        <ButtonIcon as={ChevronRight} height={18} width={18} />
                      </Button>
                    ) : null}
                  </View>
                }
              />
            );
          })}
        </ListSection>
      )}
      </ScrollView>
    </View>
  );
}
