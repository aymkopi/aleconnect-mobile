import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

export default function HomeRoute() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const surfaceCardShadow = useCSSVariable("--shadow-surface-card");
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ width }}
      className="bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 28,
        gap: 14,
        paddingBottom: bottomPadding,
      }}
    >
      <Text
        selectable
        style={{
          fontSize: 30,
          fontWeight: "800",
        }}
        className="text-foreground"
      >
        Home
      </Text>

      <Text
        selectable
        style={{
          fontSize: 16,
          lineHeight: 24,
        }}
        className="text-muted"
      >
        Welcome to AleConnect. Monitor the latest updates and quick actions from
        one place.
      </Text>

      <View
        className="border-border bg-surface"
        style={{
          marginTop: 8,
          borderRadius: 24,
          borderWidth: 1,
          padding: 20,
          gap: 12,
          boxShadow:
            typeof surfaceCardShadow === "string"
              ? surfaceCardShadow
              : undefined,
        }}
      >
        <Text
          selectable
          style={{
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 0.6,
          }}
          className="text-muted"
        >
          PAGE HIGHLIGHTS
        </Text>

        {["Community feed", "Recent reports", "Recommended actions"].map(
          (highlight) => (
            <View
              key={highlight}
              className="border-border bg-surface-secondary"
              style={{
                borderRadius: 14,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                }}
                className="text-surface-secondary-foreground"
              >
                {highlight}
              </Text>
            </View>
          ),
        )}
      </View>
    </ScrollView>
  );
}
