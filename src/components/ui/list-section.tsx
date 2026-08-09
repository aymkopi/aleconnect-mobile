import type { ReactNode } from "react";
import { View } from "react-native";

import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export function ListSection({
  children,
  title,
}: {
  children: ReactNode;
  title?: ReactNode;
}) {
  return (
    <VStack className="gap-2">
      {typeof title === "string" ? (
        <Heading className="px-1" size="sm">
          {title}
        </Heading>
      ) : (
        title
      )}
      <VStack className="overflow-hidden rounded-lg border border-border bg-card">
        {children}
      </VStack>
    </VStack>
  );
}

export function ListSectionItem({
  accessibilityLabel,
  description,
  leading,
  onPress,
  showDivider = true,
  title,
  trailing,
}: {
  accessibilityLabel?: string;
  description?: ReactNode;
  leading?: ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  title: ReactNode;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {leading}
      <VStack className="flex-1 gap-0.5">
        {typeof title === "string" ? (
          <Text className="font-semibold text-foreground">{title}</Text>
        ) : (
          title
        )}
        {typeof description === "string" ? (
          <Text className="text-muted-foreground" size="sm">
            {description}
          </Text>
        ) : (
          description
        )}
      </VStack>
      {trailing}
    </>
  );

  return (
    <>
      {onPress ? (
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          className="min-h-14 flex-row items-center gap-3 px-4 py-3"
          onPress={onPress}
        >
          {content}
        </Pressable>
      ) : (
        <View className="min-h-14 flex-row items-center gap-3 px-4 py-3">
          {content}
        </View>
      )}
      {showDivider ? <Divider className="ml-4" /> : null}
    </>
  );
}
