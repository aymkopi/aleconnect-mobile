import { View } from "react-native";
import {
  ChevronRight,
  FileText,
  Phone,
  Megaphone,
  Link,
  ShieldCheck,
  Zap,
  CreditCard,
} from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
const icons = {
  report: FileText,
  track: FileText,
  phone: Phone,
  updates: Megaphone,
  account: Link,
  shield: ShieldCheck,
  power: Zap,
  payment: CreditCard,
};
export function ServiceRow({
  title,
  description,
  icon = "report",
  onPress,
}: {
  title: string;
  description?: string;
  icon?: keyof typeof icons;
  onPress: () => void;
}) {
  const [primary] = useAppColors(["primary"]);
  const Icon = icons[icon];
  return (
    <Button
      variant="outline"
      fullWidth
      onPress={onPress}
      className="bg-card rounded-xl justify-start"
      style={{ minHeight: 64, padding: 12, gap: 12 }}
    >
      <View className="h-8 w-8 rounded-xl bg-primary/10 items-center justify-center">
        <Icon size={18} color={primary} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="semibold" style={{ fontSize: 14, lineHeight: 20 }}>
          {title}
        </Text>
        {description ? (
          <Text muted style={{ fontSize: 12, lineHeight: 18 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={primary} />
    </Button>
  );
}
