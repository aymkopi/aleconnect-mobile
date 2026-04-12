import { BlurView } from "expo-blur";
import { PressableFeedback, useThemeColor } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import { AlertTriangle, Home, Phone, UserRound } from "lucide-react-native";
import type { FC, RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "tailwindcss";
import { useCSSVariable } from "uniwind";

/**
 * Constants
 */
const APP_BAR_HEIGHT = 65;
const APP_BAR_OUTER_PADDING = 15;
const TAB_MIN_HIT_AREA = 44;
const ACTIVE_PILL_VERTICAL_INSET = 4;
const ACTIVE_PILL_ANIMATION_MS = 280;

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
  readonly blurTarget: RefObject<View | null>;
}

interface TabFrame {
  readonly x: number;
  readonly width: number;
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
  readonly onLayout: (frame: TabFrame) => void;
}

const TabItem: FC<TabItemProps> = ({
  title,
  Icon,
  isActive,
  onPress,
  onLayout,
}) => {
  const [activeIconColor, inactiveIconColor] = useThemeColor([
    "foreground",
    "muted",
  ]);
  const iconColor = isActive ? activeIconColor : inactiveIconColor;

  return (
    <PressableFeedback
      onPress={onPress}
      onLayout={(event) => {
        onLayout({
          x: event.nativeEvent.layout.x,
          width: event.nativeEvent.layout.width,
        });
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={title}
      className="flex-1 items-center justify-center gap-0.5 rounded-lg"
      style={{ minHeight: TAB_MIN_HIT_AREA }}
    >
      <Icon size={20} strokeWidth={2.2} color={iconColor} />
      <Text
        className={`text-xs ${
          isActive ? "font-bold text-foreground" : "font-semibold text-muted"
        }`}
      >
        {title}
      </Text>
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
  blurTarget,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const floatingBarShadow = useCSSVariable("--shadow-floating-bar");
  const [surfaceColor] = useThemeColor(["surface"]);
  const [tabFrames, setTabFrames] = useState<Partial<Record<number, TabFrame>>>(
    {},
  );
  const pillLeft = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  // Memoize bottom inset to prevent unnecessary recalculations
  const bottomInset = useMemo(
    () => Math.max(insets.bottom, 8),
    [insets.bottom],
  );

  useEffect(() => {
    const frame = tabFrames[currentIndex];

    if (!frame) {
      return;
    }

    pillLeft.value = withTiming(frame.x, {
      duration: ACTIVE_PILL_ANIMATION_MS,
    });
    pillWidth.value = withTiming(frame.width, {
      duration: ACTIVE_PILL_ANIMATION_MS,
    });
  }, [currentIndex, pillLeft, pillWidth, tabFrames]);

  const activePillStyle = useAnimatedStyle(() => {
    if (pillWidth.value <= 0) {
      return { opacity: 0 };
    }

    return {
      opacity: 1,
      left: pillLeft.value,
      width: pillWidth.value,
    };
  }, []);

  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0">
      {/* Outer padding container */}
      <View className="px-3.75" style={{ paddingBottom: bottomInset }}>
        {/* Bar background container */}
        <View
          accessibilityRole="tablist"
          className="relative flex-row items-center justify-around overflow-hidden rounded-full border-[0.5px] border-border px-2"
          style={{
            height: APP_BAR_HEIGHT,
            boxShadow:
              typeof floatingBarShadow === "string"
                ? floatingBarShadow
                : undefined,
            backgroundColor: "transparent",
          }}
        >
          <BlurView
            pointerEvents="none"
            tint="systemMaterial"
            intensity={90}
            blurTarget={blurTarget}
            blurMethod="dimezisBlurViewSdk31Plus"
            className="absolute inset-0"
          />

          <View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: surfaceColor, opacity: 0.72 }}
          />

          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full bg-accent/20"
            style={[
              {
                top: ACTIVE_PILL_VERTICAL_INSET,
                bottom: ACTIVE_PILL_VERTICAL_INSET,
              },
              activePillStyle,
            ]}
          />

          {/* Tab items */}
          {APP_BAR_ITEMS.map(({ title, icon: Icon }, index) => (
            <TabItem
              key={title}
              title={title}
              Icon={Icon}
              isActive={index === currentIndex}
              onPress={() => onSelect(index)}
              onLayout={(frame) => {
                setTabFrames((currentFrames) => ({
                  ...currentFrames,
                  [index]: frame,
                }));
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

FloatingAppBar.displayName = "FloatingAppBar";
