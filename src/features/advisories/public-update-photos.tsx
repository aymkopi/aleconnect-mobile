import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";

import type { MobilePublicPhoto } from "@/services/advisories";

export function PublicUpdatePhotos({ photos }: { readonly photos: readonly MobilePublicPhoto[] }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const visible = photos.filter((photo) => !failed.has(photo.id));
  if (!visible.length) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {visible.map((photo) => (
        <Image
          key={photo.id}
          source={{ uri: photo.url }}
          accessibilityLabel={photo.altText || "Public update photo"}
          contentFit="cover"
          className="aspect-square w-[48%] rounded-lg bg-muted"
          onError={() => setFailed((current) => new Set([...current, photo.id]))}
        />
      ))}
    </View>
  );
}
