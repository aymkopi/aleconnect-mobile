import { Text } from "@/components/panelui/text";
import { useVisualPreview } from "@/context/visual-preview-context";
export function PreviewLabel() {
  const { publicFixtures: fixtures } = useVisualPreview();
  return fixtures ? (
    <Text
      className="text-primary text-center"
      size="xs"
      accessibilityRole="alert"
    >
      Visual fixture. Sample content; no live data.
    </Text>
  ) : null;
}
