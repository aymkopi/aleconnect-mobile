import { Stack, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import documents from "./legal-documents.json";

export function LegalDocumentScreen({
  kind,
  returnToReport = false,
}: {
  kind: "privacy" | "terms";
  returnToReport?: boolean;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const closing = useRef(false);
  const [selected, setSelected] = useState(kind);
  const document = documents[selected];
  const other = selected === "privacy" ? "terms" : "privacy";

  const close = useCallback(() => {
    // Route blur also closes sheets; it must not pop a second screen.
    if (closing.current || !navigation.isFocused()) return;
    closing.current = true;
    if (router.canGoBack()) router.back();
    else router.replace(returnToReport ? "/reports" : "/profile");
  }, [navigation, returnToReport, router]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <>
      {/* Native modal windows would cover the app's root sheet portal. */}
      <Stack.Screen options={{ presentation: Platform.OS === "web" ? "transparentModal" : "card", contentStyle: { backgroundColor: "transparent" } }} />
      <BottomSheet defaultOpen onOpenChange={(open) => { if (!open) close(); }}>
        <BottomSheet.Content size="full" className="w-full max-w-2xl self-center">
          <BottomSheet.Header title={<Text size="lg" weight="semibold" accessibilityRole="header">{document.title}</Text>} />
          <BottomSheet.Body key={selected} showsVerticalScrollIndicator contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
            {document.blocks.map((block, index) => (
              <Text
                key={index}
                selectable
                accessibilityRole={block.type === "heading" || block.type === "subheading" ? "header" : undefined}
                weight={block.type === "heading" || block.type === "subheading" ? "semibold" : "normal"}
                className={block.type === "heading" ? "mt-3 leading-6" : "leading-6"}
              >
                {block.type === "bullet" ? `• ${block.text}` : block.text}
              </Text>
            ))}
          </BottomSheet.Body>
          <BottomSheet.Footer>
            <Button variant="ghost" fullWidth onPress={() => setSelected(other)}>{documents[other].title}</Button>
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
    </>
  );
}
