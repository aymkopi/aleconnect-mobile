import { Button, ButtonIcon } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type EvidencePhoto = {
  id: string;
  uri: string;
  status: "processing" | "ready" | "failed";
};

export type EvidencePhotoViewerProps = {
  photos: readonly EvidencePhoto[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
};

export function EvidencePhotoViewer({
  photos,
  initialIndex = 0,
  open,
  onClose,
}: EvidencePhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(initialIndex, 0), photos.length - 1));
  }, [initialIndex, open, photos.length]);

  const photo = photos[index];
  if (!open || !photo) return null;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/90"
        onPress={onClose}
        accessibilityLabel="Dismiss evidence viewer"
      >
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: Math.max(insets.top, 16) }}
        >
          <Text className="font-semibold text-white" selectable>
            Photo {index + 1} of {photos.length}
          </Text>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full"
            onPress={onClose}
            accessibilityLabel="Close evidence viewer"
          >
            <ButtonIcon as={X} height={20} width={20} />
          </Button>
        </View>

        <Pressable
          className="flex-1 items-center justify-center px-4 py-6"
          onPress={(event) => event.stopPropagation()}
        >
          <Image
            source={{ uri: photo.uri }}
            cachePolicy="memory-disk"
            contentFit="contain"
            style={{ width: "100%", height: "100%" }}
            accessibilityLabel={`Evidence photo ${index + 1}`}
          />
        </Pressable>

        {photos.length > 1 ? (
          <View
            className="flex-row justify-center gap-4 px-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onPress={() => setIndex((current) => Math.max(0, current - 1))}
              isDisabled={index === 0}
              accessibilityLabel="Previous evidence photo"
            >
              <ButtonIcon as={ChevronLeft} height={20} width={20} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full"
              onPress={() =>
                setIndex((current) => Math.min(photos.length - 1, current + 1))
              }
              isDisabled={index === photos.length - 1}
              accessibilityLabel="Next evidence photo"
            >
              <ButtonIcon as={ChevronRight} height={20} width={20} />
            </Button>
          </View>
        ) : (
          <View style={{ paddingBottom: Math.max(insets.bottom, 16) }} />
        )}
      </Pressable>
    </Modal>
  );
}
