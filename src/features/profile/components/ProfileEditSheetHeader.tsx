import { Button, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { X } from "lucide-react-native";
import { View } from "react-native";

type Props = {
  title: string;
  description: string;
  onClose: () => void;
};

export function ProfileEditSheetHeader({ title, description, onClose }: Props) {
  return (
    <View className="flex-row items-start gap-3 border-b border-border/80 pb-4">
      <View className="min-w-0 flex-1 gap-1">
        <Heading size="lg">{title}</Heading>

        <Text className="text-sm leading-5 text-muted-foreground">
          {description}
        </Text>
      </View>

      <Button
        size="icon"
        variant="ghost"
        className="min-h-11 min-w-11 shrink-0 rounded-full"
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title.toLowerCase()}`}
      >
        <ButtonIcon as={X} height={18} width={18} />
      </Button>
    </View>
  );
}
