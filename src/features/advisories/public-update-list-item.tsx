import { Linking, View } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AdvisoryListItem } from "@/features/advisories/advisory-list-item";
import { PublicUpdatePhotos } from "@/features/advisories/public-update-photos";
import type { MobilePublicUpdate } from "@/services/public-updates";
import { formatManilaReportListDateTime } from "@/utils/manila-time";

export function PublicUpdateListItem({ item, onAdvisoryPress }: {
  readonly item: MobilePublicUpdate;
  readonly onAdvisoryPress: (id: string) => void;
}) {
  if (item.kind === "advisory") return <AdvisoryListItem advisory={item} onPress={() => onAdvisoryPress(item.id)} />;
  return (
    <View className="gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <View className="gap-1">
        <Text className="text-xs font-medium text-muted-foreground">{item.pageName ?? "ALECO Facebook"}</Text>
        <Text className="text-xs text-muted-foreground">Published: {formatManilaReportListDateTime(item.publishedAt)}</Text>
      </View>
      {item.message ? <Text className="leading-6 text-foreground">{item.message}</Text> : null}
      <PublicUpdatePhotos photos={item.photos} />
      {item.permalink ? (
        <Button variant="secondary" accessibilityLabel="View this post on Facebook" onPress={() => void Linking.openURL(item.permalink!)}>
          <ButtonText>View on Facebook</ButtonText>
        </Button>
      ) : null}
    </View>
  );
}
