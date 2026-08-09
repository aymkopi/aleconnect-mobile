import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChildAppBarProps = {
  title: string;
  description: string;
  onBack: () => void;
  backAccessibilityLabel?: string;
  rightActions?: ReactNode;
  showBackButton?: boolean;
};

export function ChildAppBar({
  title,
  description,
  onBack,
  backAccessibilityLabel = "Go back",
  rightActions,
  showBackButton = true,
}: ChildAppBarProps) {
  const insets = useSafeAreaInsets();
  const [foregroundColor] = useAppColors(["foreground"]);

  return (
    <View
      className="flex-row items-center px-5 pb-3"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <View className="w-10 items-start">
        {showBackButton ? (
          <Button
            size="icon"
            variant="ghost"
            accessibilityLabel={backAccessibilityLabel}
            onPress={onBack}
          >
            <ButtonIcon
              as={ChevronLeft}
              color={foregroundColor}
              height={22}
              width={22}
            />
          </Button>
        ) : null}
      </View>
      <View className="min-w-0 flex-1 px-3">
        <Heading className="text-center" numberOfLines={1} size="xl">
          {title}
        </Heading>
        <Text
          className="mt-1 text-center text-xs text-muted-foreground"
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
      <View className="w-10 items-end">{rightActions}</View>
    </View>
  );
}
