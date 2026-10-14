import { View } from "react-native";
import { Bell } from "lucide-react-native";
import { Badge } from "@/components/panelui/badge";
import { Button } from "@/components/panelui/button";
import { useGuestAccess } from "@/context/guest-access-context";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import { useAppColors } from "@/hooks/use-app-colors";

export function NotificationButton({ overImage = false }: { overImage?: boolean }) {
  const count = useUnreadNotificationCount();
  const { openFeature } = useGuestAccess();
  const [foreground] = useAppColors(["foreground"]);
  return (
    <View>
      <Button variant="ghost" size="icon"
        className={overImage ? "rounded-full bg-white/20" : "rounded-full bg-card"}
        style={{ width: overImage ? 44 : 48, height: overImage ? 44 : 48 }}
        accessibilityLabel={count ? `Notifications, ${count} unread` : "Notifications"}
        onPress={() => openFeature("/notifications")}>
        <Bell size={20} color={overImage ? "#FFFFFF" : foreground} />
      </Button>
      {count > 0 ? <Badge pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" count={count} size="xs" variant="destructive"
        style={{ position: "absolute", right: -3, top: -2 }} /> : null}
    </View>
  );
}
