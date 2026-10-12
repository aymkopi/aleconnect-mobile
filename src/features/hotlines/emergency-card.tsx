import { Button } from "@/components/panelui/button";
import { ProgressButton } from "@/components/panelui/progress-button";
import { Text } from "@/components/panelui/text";
import { toast } from "@/components/panelui/toast";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useAppColors } from "@/hooks/use-app-colors";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { Copy, Siren } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { openContact } from "./contact-card";
export function EmergencyCard() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const { publicFixtures: fixtures } = useVisualPreview();
  const [destructive] = useAppColors(["destructive"]);
  return (
    <View className="rounded-xl border overflow-hidden p-3 gap-2 bg-[#FFF0F1] border-[#EAD2D6] dark:bg-[#371D29] dark:border-[#623442]">
      <View className="flex-row items-center gap-2">
        <Siren size={24} color={destructive} />
        <View className="flex-1">
          <Text
            weight="bold"
            style={{ fontSize: 25, lineHeight: 30 }}
            className="text-[#AD2835] dark:text-[#FFA6AE]"
          >
            911
          </Text>
          <Text size="xs" className="text-[#AD2835] dark:text-[#FFA6AE]">
            National emergency
          </Text>
        </View>
        <Button
          variant="outline"
          size="icon"
          accessibilityLabel="Copy emergency number 911"
          onPress={() =>
            void Clipboard.setStringAsync("911")
              .then(() => toast.show({ label: "911 copied" }))
              .catch(() =>
                toast.show({
                  variant: "destructive",
                  label: "Could not copy number",
                }),
              )
          }
        >
          <Copy size={16} color={destructive} />
        </Button>
      </View>
      <ProgressButton
        fullWidth
        variant="destructive"
        holdDuration={1500}
        autoReset
        haptics={true}
        disabled={!focused}
        accessibilityLabel="Hold to open the dialer for 911"
        onComplete={() =>
          fixtures
            ? toast.show({ label: "Dialling disabled in visual fixtures" })
            : void openContact("tel:911")
        }
      >
        <ProgressButton.Label>Hold to call 911</ProgressButton.Label>
        <ProgressButton.Done>
          <Text weight="semibold">Opening dialer</Text>
        </ProgressButton.Done>
      </ProgressButton>
    </View>
  );
}
