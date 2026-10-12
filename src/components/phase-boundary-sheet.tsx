import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
export function PhaseBoundarySheet({
  open,
  onOpenChange,
  featureLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureLabel: string;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheet.Content className="rounded-t-3xl">
        <BottomSheet.Header>
          <Text weight="semibold" size="lg">
            {featureLabel}
          </Text>
        </BottomSheet.Header>
        <BottomSheet.Body>
          <Text muted>
            This preview covers the five main pages. This flow will be available
            in the next implementation phase.
          </Text>
        </BottomSheet.Body>
        <BottomSheet.Footer>
          <Button fullWidth onPress={() => onOpenChange(false)}>
            Got it
          </Button>
        </BottomSheet.Footer>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
