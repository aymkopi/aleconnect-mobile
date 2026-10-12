import { useUniwind } from "uniwind";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { useId } from "react";
import { View, StyleSheet } from "react-native";
export function SoftRadial() {
  const { theme } = useUniwind();
  const dark = theme === "dark" || theme.endsWith("-dark");
  const color = dark ? "#FFFFFF" : "#3F91CA";
  const id = useId().replaceAll(":", "");
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="100%" cy="100%" rx="85%" ry="100%">
          <Stop offset="0" stopColor={color} stopOpacity={dark ? 0.035 : 0.18} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={"url(#" + id + ")"} />
    </Svg>
    </View>
  );
}
