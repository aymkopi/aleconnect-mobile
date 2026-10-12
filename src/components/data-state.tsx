import { View } from "react-native";
import { CircleAlert, Info, type LucideIcon } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { EmptyState } from "@/components/panelui/empty-state";
import { ContentSkeleton, type ContentSkeletonLayout } from "@/components/content-skeleton";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";

type DataStateProps = {
  title: string;
  description?: string;
  loading?: boolean;
  loadingLayout?: ContentSkeletonLayout;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  icon?: LucideIcon;
};

export function DataState({ title, description, loading, loadingLayout, actionLabel, onAction, busy, icon: Icon = CircleAlert }: DataStateProps) {
  const [muted] = useAppColors(["muted-foreground"]);
  if (loading) return <ContentSkeleton layout={loadingLayout} label={title} />;
  return <EmptyState size="sm" className="flex-none" style={{ minHeight: 300 }} accessibilityLiveRegion="polite">
    <EmptyState.Header>
      <EmptyState.Media variant="icon"><Icon size={18} color={muted} /></EmptyState.Media>
      <EmptyState.Title accessibilityRole="header" style={{ fontSize: 18, lineHeight: 26 }}>{title}</EmptyState.Title>
      {description ? <EmptyState.Description>{description}</EmptyState.Description> : null}
    </EmptyState.Header>
    {onAction && actionLabel ? <EmptyState.Content><Button variant="outline" fullWidth loading={busy} onPress={onAction}>{actionLabel}</Button></EmptyState.Content> : null}
  </EmptyState>;
}

export function DataNotice({ title, description, actionLabel, onAction, busy }: Omit<DataStateProps, "loading" | "loadingLayout" | "icon">) {
  const [muted] = useAppColors(["muted-foreground"]);
  return <View className="gap-3" accessibilityLiveRegion="polite">
    <View className="rounded-xl bg-card p-3 gap-1">
      <View className="flex-row items-start gap-2"><Info size={18} color={muted} /><Text className="flex-1" size="sm" weight="semibold">{title}</Text></View>
      {description ? <Text size="sm" muted>{description}</Text> : null}
    </View>
    {onAction && actionLabel ? <Button variant="outline" loading={busy} onPress={onAction}>{actionLabel}</Button> : null}
  </View>;
}
