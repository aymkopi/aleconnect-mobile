import { MapPin } from "lucide-react-native";
import { View } from "react-native";
import { useAppColors } from "@/hooks/use-app-colors";

export function LocationPin() {
  const [primary] = useAppColors(["primary"]);
  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <MapPin
        size={46}
        color={primary}
        fill={primary}
        strokeWidth={1}
        // Lucide's tip is inset from its SVG bounds; place it at the map center.
        style={{ transform: [{ translateY: -20 }] }}
      />
    </View>
  );
}
