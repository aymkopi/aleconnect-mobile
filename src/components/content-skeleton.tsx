import { View, useWindowDimensions, type ViewStyle } from "react-native";
import { useIsFocused } from "expo-router/react-navigation";
import { Skeleton } from "@/components/panelui/skeleton";

const layouts = {
  identity: { height: 80, rows: [[64, 64, 260]] },
  selection: { height: 56, rows: [[200, 16, 20], [150, 12]] },
  report: { height: 112, rows: [[92, 14, 60], [276, 20], [194, 14], [300, 14]] },
  advisory: { height: 112, rows: [[112, 14, 60], [276, 20], [240, 14], [286, 14]] },
  contact: { height: 136, rows: [[40, 40, 220], [300, 48]] },
  notification: { height: 96, rows: [[32, 32, 260], [286, 14]] },
  profile: { height: 176, rows: [[190, 20], [270, 14], [310, 48], [260, 14]] },
  settings: { height: 116, rows: [[172, 20, 36], [300, 14], [224, 14]] },
  form: { height: 180, rows: [[124, 14], [346, 48], [124, 14], [346, 48]] },
  detail: { height: 152, rows: [[140, 14, 60], [310, 24], [280, 14], [320, 14], [240, 14]] },
} as const;
export type ContentSkeletonLayout = keyof typeof layouts;

export function ContentSkeleton({
  layout = "report", count = 3, label, style,
}: {
  layout?: ContentSkeletonLayout;
  count?: 1 | 2 | 3;
  label: string;
  style?: ViewStyle;
}) {
  const focused = useIsFocused();
  const { fontScale } = useWindowDimensions();
  const scale = Math.max(1, fontScale);
  const { height, rows } = layouts[layout];
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityState={{ busy: true }} accessibilityLiveRegion="polite"
      className="gap-2" style={style}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className={layout === "identity" ? "py-2" : "rounded-lg bg-card p-3"}
          style={{ minHeight: height * scale }}>
          <Skeleton animated={focused} className="bg-transparent" style={{ minHeight: height * scale - (layout === "identity" ? 16 : 25.5) }}>
            <View className="gap-1.5">
              {rows.map(([width, rowHeight, ...suffix], row) => (
                <View key={row} className="flex-row items-center justify-between gap-2"
                  style={{ minHeight: rowHeight <= 24 ? rowHeight * scale : rowHeight }}>
                  <View className="bg-skeleton" style={{
                    width: layout === "identity" ? 64 : `${width / 346 * 100}%`, height: rowHeight <= 24 ? rowHeight * scale : rowHeight,
                    borderRadius: layout === "identity" ? 32 : rowHeight >= 32 ? 12 : 4,
                  }} />
                  {layout === "identity" ? <View className="gap-1" style={{ width: "70%" }}>{[240, 180, 200].map((width, line) => <View key={line} className="bg-skeleton rounded" style={{ width: `${width / 260 * 100}%`, height: (line === 0 ? 14 : 12) * scale }} />)}</View> : suffix[0] != null ? <View className="bg-skeleton" style={{
                    width: `${suffix[0] / 346 * 100}%`, height: Math.min(20, rowHeight),
                    borderRadius: 4,
                  }} /> : null}
                </View>
              ))}
            </View>
          </Skeleton>
        </View>
      ))}
    </View>
  );
}
