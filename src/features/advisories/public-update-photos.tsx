import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/panelui/text";
import { Skeleton } from "@/components/panelui/skeleton";
import { Button } from "@/components/panelui/button";
import { EvidencePhotoViewer } from "@/features/reports/components/evidence-photo-viewer";
import type { MobilePublicPhoto } from "@/services/advisories";
import { safePublicUrl } from "./presentation";
export function PublicUpdatePhotos({
  photos,
  fixtures,
  hero = false,
}: {
  photos: readonly MobilePublicPhoto[];
  fixtures: boolean;
  hero?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const viewable = photos.map((photo) => ({
    id: photo.id,
    uri: fixtures || safePublicUrl(photo.url) ? photo.url : "",
    status: "ready" as const,
  }));
  const first = photos[0];
  if (!first) return null;
  return (
    <View className="gap-2">
      {hero ? (
        <PhotoTile
          key={first.url}
          photo={first}
          uri={viewable[0].uri}
          hero
          onPress={() => setSelected(0)}
        />
      ) : null}
      {!hero || photos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {photos.map((photo, index) => (
            <PhotoTile
              key={photo.id + photo.url}
              photo={photo}
              uri={viewable[index].uri}
              onPress={() => setSelected(index)}
            />
          ))}
        </ScrollView>
      ) : null}
      <Text muted size="xs">
        Tap a photo to view full size
        {photos.length > 1 ? " (" + photos.length + " photos)" : ""}
      </Text>
      <EvidencePhotoViewer
        photos={viewable}
        initialIndex={selected ?? 0}
        open={selected !== null}
        onClose={() => setSelected(null)}
        context="update"
      />
    </View>
  );
}
function PhotoTile({
  photo,
  uri,
  hero = false,
  onPress,
}: {
  photo: MobilePublicPhoto;
  uri: string;
  hero?: boolean;
  onPress: () => void;
}) {
  const focused = useIsFocused();
  const [state, setState] = useState("loading"),
    [attempt, setAttempt] = useState(0);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={"View photo: " + (photo.altText || "ALECO photo")}
      className="rounded-xl overflow-hidden bg-muted"
      style={{ width: hero ? "100%" : 104, height: hero ? 238 : 88 }}
    >
      {uri && state !== "error" ? (
        <Image
          key={uri + attempt}
          source={{ uri }}
          contentFit="cover"
          style={{ width: "100%", height: "100%" }}
          accessibilityLabel={photo.altText || "ALECO photo"}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-2 gap-1">
          <Text size="xs">Photo unavailable</Text>
          {uri ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setState("loading");
                setAttempt((a) => a + 1);
              }}
            >
              Retry
            </Button>
          ) : null}
        </View>
      )}
      {uri && state === "loading" ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <Skeleton animated={focused} className="absolute inset-0 rounded-lg" label="Loading ALECO photo" />
        </View>
      ) : null}
    </Pressable>
  );
}
