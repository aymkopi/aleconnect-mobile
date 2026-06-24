import { Button, ListGroup, useThemeColor } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import type { ComponentProps } from "react";
import React from "react";

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
        <Icon size={20} color={accentIconColor} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemDescription className="tracking-wide text-xs uppercase">
          {description}
        </ListGroup.ItemDescription>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      {button ? (
        <ListGroup.ItemSuffix>
          <Button
            feedbackVariant="scale-highlight"
            variant={button.variant}
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
