import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import {
  Button,
  Label,
  ListGroup,
  Surface,
  Typography,
  useThemeColor,
} from "heroui-native";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Globe,
  MessageCircle,
  Phone,
} from "lucide-react-native";
import { useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const hotlineGroups = [
  {
    title: "Emergency concern",
    description: "For live-wire, fire, or immediate safety risks.",
    icon: AlertTriangle,
    action: "Call nearest emergency office",
  },
  {
    title: "ALECO support",
    description: "Account, billing, and service report assistance.",
    icon: Building2,
    action: "Use official ALECO channels",
  },
  {
    title: "Messenger support",
    description: "Open ALECO Facebook page for current public updates.",
    icon: MessageCircle,
    action: "Open Facebook",
    url: "https://www.facebook.com/albayelectric",
  },
  {
    title: "Website",
    description: "Visit ALECO website for advisories and information.",
    icon: Globe,
    action: "Open website",
    url: "https://web.alecoinc.com.ph/",
  },
];

export default function HotlinesRoute() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const handleRefresh = () => {
    setIsRefreshing(true);
    requestAnimationFrame(() => {
      setIsRefreshing(false);
    });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ width }}
      className="bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: statusBarHeight + 22,
        gap: 16,
        paddingBottom: bottomPadding,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={accentColor}
          colors={[accentColor]}
        />
      }
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Typography.Heading type="h1" weight="bold">
            Hotlines
          </Typography.Heading>
          <Typography.Paragraph type="body-sm" color="muted" className="mt-1">
            Fast access to safety, support, and official ALECO channels.
          </Typography.Paragraph>
        </View>
        <Button isIconOnly variant="secondary" accessibilityLabel="Call">
          <Phone size={20} color={accentColor} />
        </Button>
      </View>

      <Surface className="rounded-[24px] p-5">
        <Typography.Heading type="h6" weight="bold">
          Safety first
        </Typography.Heading>
        <Typography.Paragraph type="body-sm" color="muted" className="mt-1">
          Stay away from downed lines and damaged electrical equipment. Use
          emergency services for immediate danger.
        </Typography.Paragraph>
      </Surface>

      <View className="gap-2">
        <Label className="ml-2 text-sm font-semibold text-muted">Contacts</Label>
        <ListGroup>
          {hotlineGroups.map((group) => {
            const Icon = group.icon;
            return (
              <ListGroup.Item
                key={group.title}
                onPress={
                  group.url
                    ? () => {
                        void Linking.openURL(group.url);
                      }
                    : undefined
                }
              >
                <ListGroup.ItemPrefix>
                  <Icon size={20} color={accentColor} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{group.title}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {group.description}
                  </ListGroup.ItemDescription>
                  <Typography type="body-xs" weight="bold" className="mt-1 text-accent">
                    {group.action}
                  </Typography>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  {group.url ? (
                    <ArrowUpRight size={18} color={mutedColor} />
                  ) : null}
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </View>
    </ScrollView>
  );
}
