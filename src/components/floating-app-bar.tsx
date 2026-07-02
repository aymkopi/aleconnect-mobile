import { PressableFeedback, Typography, useThemeColor } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import { AlertTriangle, Home, Phone, UserRound } from "lucide-react-native";
import type { FC } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "tailwindcss";

/**
 * Constants
 */
const APP_BAR_HEIGHT = 65;
const APP_BAR_OUTER_PADDING = 15;
const TAB_MIN_HIT_AREA = 44;
const CONTENT_FADE_STEPS = [0, 0.04, 0.08, 0.14, 0.22, 0.34] as const;

/**
 * Types
 */
interface AppBarItem {
  readonly title: string;
  readonly icon: LucideIcon;
}

interface FloatingAppBarProps {
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
}

/**
 * App bar items configuration
 */
const APP_BAR_ITEMS: readonly AppBarItem[] = [
  { title: "Home", icon: Home },
  { title: "Complaints", icon: AlertTriangle },
  { title: "Hotlines", icon: Phone },
  { title: "Profile", icon: UserRound },
] as const;

/**
 * Compute bottom padding for scrollable content to account for the floating app bar
 */
export function appScrollableBottomPadding(insetBottom: number): number {
  return APP_BAR_HEIGHT + APP_BAR_OUTER_PADDING * 2 + Math.max(insetBottom, 8);
}

/**
 * Individual tab item component
 */
interface TabItemProps {
  readonly title: string;
  readonly Icon: LucideIcon;
  readonly isActive: boolean;
  readonly onPress: () => void;
}

const TabItem: FC<TabItemProps> = ({
  title,
  Icon,
  isActive,
  onPress,
}) => {
  const [activeIconColor, inactiveIconColor] = useThemeColor([
    "foreground",
    "muted",
  ]);
  const iconColor = isActive ? activeIconColor : inactiveIconColor;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={title}
      className={`flex-1 items-center justify-center gap-0.5 rounded-full ${
        isActive ? "bg-accent/20" : ""
      }`}
      style={{ minHeight: TAB_MIN_HIT_AREA }}
    >
      <Icon size={20} strokeWidth={2.2} color={iconColor} />
      <Typography
        type="body-xs"
        weight={isActive ? "bold" : "semibold"}
        className={`text-xs ${
          isActive ? "text-foreground" : "text-muted"
        }`}
      >
        {title}
      </Typography>
    </PressableFeedback>
  );
};

/**
 * Floating app bar navigation component
 *
 * A floating bottom navigation bar with rounded corners, semi-transparent background,
 * and smooth tabbing between four main sections (Home, Complaints, Hotlines, Profile).
 *
 * Features:
 * - Positions absolutely at the bottom of the screen
 * - Semi-transparent frosted glass appearance
 * - Adapts to safe area insets (notches, home indicators)
 * - 4-tab navigation with icons and labels
 * - Accessible with proper ARIA roles and labels
 *
 * @param currentIndex - Currently selected tab index (0-3)
 * @param onSelect - Callback fired when user selects a different tab
 *
 * @example
 * ```tsx
 * const [currentIndex, setCurrentIndex] = useState(0);
 * return <FloatingAppBar currentIndex={currentIndex} onSelect={setCurrentIndex} />;
 * ```
 */
export const FloatingAppBar: FC<FloatingAppBarProps> = ({
  currentIndex,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const [surfaceColor] = useThemeColor(["surface"]);

  // Memoize bottom inset to prevent unnecessary recalculations
  const bottomInset = useMemo(
    () => Math.max(insets.bottom, 8),
    [insets.bottom],
  );

  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0">
      <View pointerEvents="none" className="px-5">
        {CONTENT_FADE_STEPS.map((opacity, index) => (
          <View
            key={`${opacity}-${index}`}
            className="h-3 bg-background"
            style={{
              opacity,
              marginBottom: index === CONTENT_FADE_STEPS.length - 1 ? -2 : 0,
            }}
          />
        ))}
      </View>
      {/* Outer padding container */}
      <View className="px-3.75" style={{ paddingBottom: bottomInset }}>
        {/* Bar background container */}
        <View
          accessibilityRole="tablist"
          className="relative flex-row items-center justify-around overflow-hidden rounded-full border-[0.5px] border-border px-2"
          style={{
            height: APP_BAR_HEIGHT,
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.16,
            shadowRadius: 24,
            backgroundColor: "transparent",
          }}
        >
          <View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: surfaceColor, opacity: 0.96 }}
          />

          {/* Tab items */}
          {APP_BAR_ITEMS.map(({ title, icon: Icon }, index) => (
            <TabItem
              key={title}
              title={title}
              Icon={Icon}
              isActive={index === currentIndex}
              onPress={() => onSelect(index)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

FloatingAppBar.displayName = "FloatingAppBar";
