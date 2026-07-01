import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import { Button, ListGroup, Surface, useThemeColor } from "heroui-native";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Globe,
  MessageCircle,
  Phone,
} from "lucide-react-native";
import { Linking, ScrollView, Text, View, useWindowDimensions } from "react-native";
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
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

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
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-foreground text-[34px] font-black leading-10">
            Hotlines
          </Text>
          <Text className="text-muted mt-1 text-[15px] leading-5">
            Fast access to safety, support, and official ALECO channels.
          </Text>
        </View>
        <Button isIconOnly variant="secondary" accessibilityLabel="Call">
          <Phone size={20} color={accentColor} />
        </Button>
      </View>

      <Surface className="rounded-[24px] p-5">
        <Text className="text-foreground text-[17px] font-bold leading-6">
          Safety first
        </Text>
        <Text className="text-muted mt-1 text-[14px] leading-5">
          Stay away from downed lines and damaged electrical equipment. Use
          emergency services for immediate danger.
        </Text>
      </Surface>

      <View className="gap-2">
        <Text className="ml-2 text-sm font-semibold text-muted">Contacts</Text>
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
                  <Text className="text-accent mt-1 text-xs font-bold">
                    {group.action}
                  </Text>
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
