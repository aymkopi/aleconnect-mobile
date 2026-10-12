import { useState, type ReactNode } from "react";
import { RefreshControl, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, X } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { PreviewLabel } from "@/components/preview-label";
import { useAppColors } from "@/hooks/use-app-colors";

export function ReportPage({
  title,
  children,
  footer,
  onBack,
  onClose,
  step,
  subtitle,
  headerAction,
  scroll = true,
  refreshing = false,
  onRefresh,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  step?: { current: number; total: number; label: string };
  subtitle?: string;
  headerAction?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const router = useRouter();
  const [foreground] = useAppColors(["foreground"]);
  const leave =
    onClose ??
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace("/reports");
    });
  const Icon = onClose ? X : ArrowLeft;
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center gap-2 px-4"
        style={{ minHeight: 56 }}
      >
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={onClose ? "Close report" : "Back"}
          onPress={leave}
        >
          <Icon size={20} color={foreground} />
        </Button>
        <Text
          accessibilityRole="header"
          className="flex-1 text-center"
          style={{
            fontFamily: "PlusJakartaSans_600SemiBold",
            fontSize: 18,
            lineHeight: 26,
          }}
        >
          {title}
        </Text>
        {headerAction ?? <View style={{ width: 44 }} />}
      </View>
      {step ? (
        <View className="gap-1 px-4 pb-1">
          <View
            className="h-1 rounded-full bg-muted overflow-hidden"
            accessibilityRole="progressbar"
            accessibilityLabel={step.label}
            accessibilityValue={{ min: 1, max: step.total, now: step.current }}
          >
            <View
              className="h-full bg-primary rounded-full"
              style={{
                width: `${Math.min(1, Math.max(0, step.current / step.total)) * 100}%`,
              }}
            />
          </View>
          <Text size="xs" muted className="text-right">
            Step {step.current} of {step.total} · {step.label}
          </Text>
        </View>
      ) : null}
      {subtitle ? (
        <Text muted size="sm" className="px-4 pb-2">
          {subtitle}
        </Text>
      ) : null}
      {scroll ? (

        <KeyboardAwareScrollView
          className="flex-1"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bottomOffset={footerHeight + 16}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            gap: 12,
            paddingBottom: footer ? 16 : Math.max(insets.bottom, 16),
          }}
        >
          <PreviewLabel />
          {children}
        </KeyboardAwareScrollView>

      ) : (
        <View className="flex-1 px-4 pt-3 gap-3">
          <PreviewLabel />
          {children}
        </View>
      )}
      {footer ? (
        <KeyboardStickyView>
          <View
            onLayout={(event) =>
              setFooterHeight(event.nativeEvent.layout.height)
            }
            className="border-t border-border bg-background px-4 pt-3 gap-2"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            {footer}
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
