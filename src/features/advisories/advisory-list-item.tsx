import { Badge, BadgeText } from "@/components/ui/badge";
import { ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/hooks/use-app-colors";
import type { MobileAdvisory } from "@/services/advisories";
import { ChevronRight, Megaphone } from "lucide-react-native";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdvisoryListItem({
  advisory,
  onPress,
  showDivider = true,
}: {
  readonly advisory: MobileAdvisory;
  readonly onPress: () => void;
  readonly showDivider?: boolean;
}) {
  const [accentColor, mutedColor] = useAppColors(["accent", "muted"]);
  const effective = formatDate(advisory.effectiveAt ?? advisory.publishedAt);
  const expires = formatDate(advisory.expiresAt);

  return (
    <ListSectionItem
      accessibilityLabel={`Open advisory: ${advisory.title}`}
      description={
        <VStack className="gap-1.5">
          <Text className="text-sm text-muted-foreground" numberOfLines={2}>
            {advisory.content}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {expires ? `${effective} to ${expires}` : effective}
          </Text>
        </VStack>
      }
      leading={<Megaphone size={20} color={accentColor} />}
      onPress={onPress}
      showDivider={showDivider}
      title={
        <VStack className="gap-1.5">
          <Badge
            className="self-start rounded-full"
            variant={
              /critical|high/i.test(advisory.severity)
                ? "destructive"
                : "secondary"
            }
          >
            <BadgeText>{advisory.severity || "Info"}</BadgeText>
          </Badge>
          <Text className="font-semibold text-foreground" numberOfLines={2}>
            {advisory.title}
          </Text>
        </VStack>
      }
      trailing={<ChevronRight size={18} color={mutedColor} />}
    />
  );
}
