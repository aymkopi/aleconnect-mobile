import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useRouter } from "expo-router";
import { Button, ListGroup, Surface, useThemeColor } from "heroui-native";
import {
  Bell,
  ChevronRight,
  FileText,
  Phone,
  UserRound,
  Zap,
} from "lucide-react-native";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useAuthSession();
  const [accentColor, foregroundColor, mutedColor] = useThemeColor([
    "accent",
    "foreground",
    "muted",
  ]);
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const quickActions = [
    {
      title: "Report an issue",
      description: "File a complaint or service request.",
      icon: FileText,
      onPress: () => router.push("/complaints/new"),
    },
    {
      title: "Call support",
      description: "Open ALECO hotline contacts.",
      icon: Phone,
      onPress: () => router.push("/hotlines"),
    },
    {
      title: session ? "View account" : "Sign in",
      description: session
        ? "Check account and service details."
        : "Use your account number to unlock services.",
      icon: UserRound,
      onPress: () => router.push(session ? "/profile" : "/sign-in"),
    },
  ];

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
            Home
          </Text>
          <Text className="text-muted mt-1 text-[15px] leading-5">
            Your ALECO account, reports, and support in one place.
          </Text>
        </View>
        <Button isIconOnly variant="secondary" accessibilityLabel="Alerts">
          <Bell size={20} color={foregroundColor} />
        </Button>
      </View>

      <Surface className="rounded-[24px] p-5">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <Zap size={23} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-[17px] font-bold leading-6">
              {session ? "Service dashboard" : "Guest mode"}
            </Text>
            <Text className="text-muted mt-1 text-[14px] leading-5">
              {session
                ? "Track your reports and account updates."
                : "Sign in to see account-specific updates."}
            </Text>
          </View>
        </View>
      </Surface>

      <View className="gap-2">
        <Text className="ml-2 text-sm font-semibold text-muted">
          Quick actions
        </Text>
        <ListGroup>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <ListGroup.Item key={action.title} onPress={action.onPress}>
                <ListGroup.ItemPrefix>
                  <Icon size={20} color={accentColor} />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{action.title}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {action.description}
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ChevronRight size={18} color={mutedColor} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </View>
    </ScrollView>
  );
}
