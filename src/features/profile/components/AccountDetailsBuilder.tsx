import { Button, ButtonText } from "@/components/ui/button";
import { ListSectionItem } from "@/components/ui/list-section";
import { Text } from "@/components/ui/text";
import { useAppColors } from "@/hooks/use-app-colors";
import type { LucideIcon } from "lucide-react-native";
import type { ComponentProps } from "react";
import React from "react";
import { View } from "react-native";

export type AccountDetailsBuilderProps = {
  icon: LucideIcon;
  description: string;
  title: string;
  button?: {
    variant?: ComponentProps<typeof Button>["variant"];
    name: string;
    onPress: () => void;
  } | null;
  showDivider?: boolean;
};

export function AccountDetailsBuilder({
  icon: Icon,
  description,
  title,
  button = null,
  showDivider = true,
}: AccountDetailsBuilderProps) {
  const [accentIconColor] = useAppColors(["accent"]);
  return (
    <ListSectionItem
      description={<Text className="text-xs text-muted-foreground">{description}</Text>}
      leading={
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
          <Icon size={19} color={accentIconColor} />
        </View>
      }
      showDivider={showDivider}
      title={<Text className="font-semibold text-foreground">{title}</Text>}
      trailing={
        button ? (
          <Button
            variant={button.variant ?? "secondary"}
            size="sm"
            className="min-h-11"
            onPress={button.onPress}
          >
            <ButtonText>{button.name}</ButtonText>
          </Button>
        ) : null
      }
    />
  );
}
