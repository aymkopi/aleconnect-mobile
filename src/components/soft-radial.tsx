import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useUniwind } from "uniwind";
export function SoftRadial() {
  const { theme } = useUniwind();
  const dark = theme === "dark" || theme.endsWith("-dark");
  const color = dark ? "#b8bdff" : "#3F91CA";
  const id = useId().replaceAll(":", "");
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="100%" cy="100%" rx="85%" ry="100%">
            <Stop
              offset="0"
              stopColor={color}
              stopOpacity={dark ? 0.08 : 0.18}
            />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={"url(#" + id + ")"} />
      </Svg>
    </View>
  );
}
