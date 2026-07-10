import { Button, ListGroup, useThemeColor } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import type { ComponentProps } from "react";
import React from "react";
import { View } from "react-native";

export type AccountDetailsBuilderProps = {
  icon: LucideIcon;
  description: string;
  title: string;
  button?: {
    variant: ComponentProps<typeof Button>["variant"];
    name: string;
    onPress: () => void;
  } | null;
};

export function AccountDetailsBuilder({
  icon: Icon,
  description,
  title,
  button = null,
}: AccountDetailsBuilderProps) {
  const [accentIconColor] = useThemeColor(["accent"]);
  return (
    <ListGroup.Item>
      <ListGroup.ItemPrefix>
        {/* Icon bubble makes dense account data easier to scan by category. */}
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft">
          <Icon size={19} color={accentIconColor} />
        </View>
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemDescription className="text-xs">
          {description}
        </ListGroup.ItemDescription>
        <ListGroup.ItemTitle className="font-semibold">{title}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      {button ? (
        <ListGroup.ItemSuffix>
          <Button
            feedbackVariant="scale-highlight"
            variant={button.variant === "primary" ? "secondary" : button.variant}
            size="sm"
            onPress={button.onPress}
          >
            <Button.Label>{button.name}</Button.Label>
          </Button>
        </ListGroup.ItemSuffix>
      ) : null}
    </ListGroup.Item>
  );
}
