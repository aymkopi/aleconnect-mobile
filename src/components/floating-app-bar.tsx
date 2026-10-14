import { useEffect, useRef } from "react";
import { FileText, Home, Megaphone, Phone, UserRound } from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  interpolateColor, ReduceMotion, useAnimatedStyle,
  useReducedMotion, useSharedValue, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/panelui/text";
import { useAppColors } from "@/hooks/use-app-colors";
const APP_BAR_HEIGHT = 64;
export function appScrollableBottomPadding(bottom: number) {
  return APP_BAR_HEIGHT + Math.max(bottom, 8) + 24;
}
const items = [
  { title: "Home", Icon: Home },
  { title: "Reports", Icon: FileText },
  { title: "Advisories", Icon: Megaphone },
  { title: "Hotlines", Icon: Phone },
  { title: "Account", Icon: UserRound },
];
const AnimatedText = Animated.createAnimatedComponent(Text);
function TabContent({ title, Icon, selected, primary, muted, fontSize }: {
  title: string; Icon: typeof items[number]["Icon"]; selected: boolean; primary: string; muted: string; fontSize: number;
}) {
  const progress = useSharedValue(selected ? 1 : 0), reduced = useReducedMotion();
  useEffect(() => {
    progress.set(withTiming(selected ? 1 : 0, { duration: reduced ? 0 : 180, reduceMotion: ReduceMotion.System }));
  }, [selected, progress, reduced]);
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [muted, primary]),
  }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const inactiveIcon = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  return <>
    <View accessible={false} style={{ width: 20, height: 20 }}>
      <Animated.View style={[{ position: "absolute" }, inactiveIcon]}><Icon size={20} strokeWidth={1.8} color={muted} /></Animated.View>
      <Animated.View style={[{ position: "absolute" }, activeIcon]}><Icon size={20} strokeWidth={1.8} color={primary} /></Animated.View>
    </View>
    <AnimatedText numberOfLines={1} style={[{
      fontFamily: "Inter_600SemiBold", fontSize, lineHeight: 14,
    }, textStyle]}>{title}</AnimatedText>
  </>;
}
export function FloatingAppBar({ currentIndex, onSelect }: {
  currentIndex: number; onSelect: (index: number) => void;
}) {
  const { width, fontScale } = useWindowDimensions(), insets = useSafeAreaInsets();
  const [surface, primary, muted] = useAppColors(["card", "primary", "muted-foreground"]);
  const position = useSharedValue(currentIndex), stretch = useSharedValue(1);
  const mounted = useRef(false);
  const reduced = useReducedMotion(), slot = (width - 32 - 12) / items.length;
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (reduced) { position.set(currentIndex); stretch.set(1); return; }
    position.set(withSpring(currentIndex, { damping: 28, stiffness: 280, mass: 0.8, overshootClamping: true, reduceMotion: ReduceMotion.System }));
    stretch.set(withSequence(
      withTiming(1.08, { duration: 100, reduceMotion: ReduceMotion.System }),
      withSpring(1, { damping: 20, stiffness: 240, reduceMotion: ReduceMotion.System }),
    ));
  }, [currentIndex, reduced, position, stretch]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * slot }, { scaleX: stretch.get() }, { scaleY: 1 - (stretch.get() - 1) / 3 }],
  }));
  return <View pointerEvents="box-none" style={{
    position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 8),
  }}>
    <View accessibilityRole="tablist" style={{
      height: APP_BAR_HEIGHT, backgroundColor: surface, borderRadius: 999,
      padding: 6, flexDirection: "row", overflow: "hidden",
    }}>
      <Animated.View pointerEvents="none" accessible={false} style={[{
        position: "absolute", left: 6, top: 6, height: APP_BAR_HEIGHT - 12,
        width: slot, borderRadius: 999, backgroundColor: primary + "12",
      }, pillStyle]} />
      {items.map(({ title, Icon }, i) => <Pressable key={title}
        accessibilityRole="tab" accessibilityLabel={title}
        accessibilityState={{ selected: i === currentIndex }}
        onPress={() => onSelect(i)}
        style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 999 }}>
        <TabContent title={title} Icon={Icon} selected={i === currentIndex} primary={primary} muted={muted}
          fontSize={width < 380 && fontScale > 1.15 ? 9 : 10} />
      </Pressable>)}
    </View>
  </View>;
}
