import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/panelui/button";
import { InputGroup } from "@/components/panelui/input-group";
import { Text } from "@/components/panelui/text";
import { ContentSkeleton, type ContentSkeletonLayout } from "@/components/content-skeleton";
import { Select } from "@/components/panelui/select";
import { Spinner } from "@/components/panelui/spinner";
import { toast } from "@/components/panelui/toast";
import { LockKeyhole, Eye } from "lucide-react-native";
import { PhaseBoundarySheet } from "@/components/phase-boundary-sheet";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  seedEmulatorRetentionFixture,
  readEmulatorRetentionSnapshot,
} from "@/features/preview-retention";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useRouter } from "expo-router";
import BoundaryScreen from "@/components/boundary-screen";
export default function Gallery() {
  const { setGuestFixtures } = useVisualPreview();
  const router = useRouter();
  const [loadingLayout, setLoadingLayout] = useState<ContentSkeletonLayout>("report");
  const [open, setOpen] = useState(false);
  const [retention, setRetention] = useState(""),
    [checking, setChecking] = useState(false);
  const [muted] = useAppColors(["muted-foreground"]);
  async function checkRetention(seed: boolean) {
    setChecking(true);
    try {
      setRetention(
        await (seed
          ? seedEmulatorRetentionFixture()
          : readEmulatorRetentionSnapshot()),
      );
    } catch (error) {
      setRetention(error instanceof Error ? error.message : "Check failed.");
    } finally {
      setChecking(false);
    }
  }
  if (!__DEV__ && !PANELUI_PREVIEW) return <BoundaryScreen />;
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 16 }}
    >
      <Text weight="bold">Development component gallery</Text>
      <Button onPress={() => { setGuestFixtures(true); router.replace("/home"); }}>Open labelled guest fixtures</Button>
      <InputGroup>
        <InputGroup.Prefix isDecorative>
          <LockKeyhole size={18} color={muted} />
        </InputGroup.Prefix>
        <InputGroup.Input
          accessibilityLabel="Gallery password"
          placeholder="Password"
        />
        <InputGroup.Suffix isDecorative>
          <Eye size={18} color={muted} />
        </InputGroup.Suffix>
      </InputGroup>
      <View className="flex-row gap-2 items-center">
        <Spinner />
        <Text>Loading</Text>
      </View>
      <Text size="sm" weight="semibold">Structured content loading</Text>
      <Select value={loadingLayout} onValueChange={(value) => setLoadingLayout(value as ContentSkeletonLayout)}>
        {(["report", "advisory", "contact", "notification", "profile", "identity", "selection", "settings", "form", "detail"] as const).map((layout) => <Select.Item key={layout} value={layout} label={layout} />)}
      </Select>
      <ContentSkeleton layout={loadingLayout} count={2} label={"Loading " + loadingLayout + " preview"} />
      <Button onPress={() => setOpen(true)}>Open sheet</Button>
      <Button
        onPress={() =>
          toast.show({
            label: "PanelUI ready",
            description: "One portal and toast host.",
          })
        }
      >
        Show toast
      </Button>
      <Text weight="semibold">Emulator retained-data check</Text>
      <Text muted size="sm">
        Synthetic queue, pending receipt and evidence. Existing data is never
        overwritten; physical-device seeding is blocked.
      </Text>
      <Button disabled={checking} onPress={() => void checkRetention(true)}>
        Seed emulator retention fixture
      </Button>
      <Button
        disabled={checking}
        variant="outline"
        onPress={() => void checkRetention(false)}
      >
        Check retained data
      </Button>
      {retention ? (
        <Text
          selectable
          size="xs"
          accessibilityLabel={"Retention snapshot " + retention}
        >
          {retention}
        </Text>
      ) : null}
      <PhaseBoundarySheet
        open={open}
        onOpenChange={setOpen}
        featureLabel="Gallery overlay"
      />
    </ScrollView>
  );
}
