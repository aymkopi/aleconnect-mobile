import {
  Button,
  Label,
  ListGroup,
  Separator,
  useThemeColor,
} from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import { LucidePhone, LucideUserRound } from "lucide-react-native";
import type { ComponentProps } from "react";
import { ScrollView } from "react-native";

type AccountDetailsBuilderProps = {
  icon: LucideIcon;
  description: string;
  title: string;
  button?: {
    variant: ComponentProps<typeof Button>["variant"];
    size: ComponentProps<typeof Button>["size"];
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
            size={button.size}
            onPress={button.onPress}
          >
            <Button.Label>{button.name}</Button.Label>
          </Button>
        </ListGroup.ItemSuffix>
      ) : null}
    </ListGroup.Item>
  );
}

export default function ProfileDetailsRoute() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        gap: 4,
      }}
    >
      <Label className="text-foreground">Account</Label>
      <ListGroup>
        <AccountDetailsBuilder
          icon={LucideUserRound}
          description="Name"
          title="Justine Lee"
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucidePhone}
          description="Phone"
          title="123-456-7890"
          button={{
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideUserRound}
          description="Email"
          title="justine@example.com"
          button={{
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
      </ListGroup>
    </ScrollView>
  );
}
