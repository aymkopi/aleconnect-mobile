import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import {
  Avatar,
  Button,
  ListGroup,
  Separator,
  Surface,
  useThemeColor,
} from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import {
  LucideBookUser,
  LucideGauge,
  LucideMail,
  LucideMapPin,
  LucidePhone,
  LucideUserRound
} from "lucide-react-native";
import type { ComponentProps } from "react";
import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const bottomPadding = appScrollableBottomPadding(insets.bottom);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        gap: 6,
        paddingBottom: bottomPadding,
      }}
    >
      <Surface className="items-center justify-center py-10">
        <Avatar size="lg" alt="Profile picture" />
        <Text className="text-lg font-bold text-foreground mt-4">
          Justine Lee
        </Text>
      </Surface>

      <Text className="text-sm mt-3 text-muted">User Details</Text>
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
          icon={LucideMail}
          description="Email"
          title="justine@example.com"
          button={{
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideMapPin}
          description="Address"
          title="123 Main Street, Anytown, USA"
          button={{
            variant: "tertiary",
            size: "sm",
            name: "Update",
            onPress: () => {},
          }}
        />
      </ListGroup>
      <Text className="text-sm mt-3 text-muted">Account Details</Text>

      <ListGroup>
        <AccountDetailsBuilder
          icon={LucideBookUser}
          description="Account Number"
          title="123456789"
        ></AccountDetailsBuilder>
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideGauge}
          description="Meter S/N"
          title="123456789"
        ></AccountDetailsBuilder>
        <Separator className="mx-4" />
        <AccountDetailsBuilder
          icon={LucideGauge}
          description="Service Type"
          title="Residential"
        ></AccountDetailsBuilder>
      </ListGroup>
    </ScrollView>
  );
}
