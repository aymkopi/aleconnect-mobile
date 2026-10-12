import { useLayoutEffect, useRef, useState } from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Spinner } from "@/components/panelui/spinner";
import { useAppColors } from "@/hooks/use-app-colors";
import { ReportPage } from "./report-page";
import {
  clampEvidenceIndex,
  isViewableEvidenceUri,
} from "./evidence-photo-state";

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
  context?: "report" | "update";
};

export function EvidencePhotoViewer(props: EvidencePhotoViewerProps) {
  return props.open ? (
    <EvidencePhotoContent key={props.initialIndex ?? 0} {...props} />
  ) : null;
}

function EvidencePhotoContent({
  photos,
  initialIndex = 0,
  open,
  onClose,
  context = "report",
}: EvidencePhotoViewerProps) {
  const isUpdate = context === "update";
  const { width } = useWindowDimensions();
  const [foreground] = useAppColors(["foreground"]);
  const [index, setIndex] = useState(initialIndex);
  const [attempt, setAttempt] = useState(0);
  const [imageState, setImageState] = useState<{
    key: string;
    phase: "loaded" | "error";
  } | null>(null);
  const scale = useSharedValue(1),
    savedScale = useSharedValue(1);
  const x = useSharedValue(0),
    y = useSharedValue(0);
  const savedX = useSharedValue(0),
    savedY = useSharedValue(0);
  const selected = clampEvidenceIndex(index, photos.length);
  const photo = photos[selected];
  const photoKey = `${photo?.id}:${photo?.uri}:${attempt}`;
  const currentPhoto = useRef(photoKey);
  useLayoutEffect(() => {
    currentPhoto.current = photoKey;
  }, [photoKey]);
  const unavailable =
    !photo || photo.status === "failed" || !isViewableEvidenceUri(photo.uri);
  const failed = imageState?.key === photoKey && imageState.phase === "error";
  const loading =
    photo?.status === "processing" || imageState?.key !== photoKey;
  const resetZoom = () => {
    scale.value = savedScale.value = 1;
    x.value = savedX.value = y.value = savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(4, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value === 1)
        x.value = y.value = savedX.value = savedY.value = 0;
    });
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      const maxX = Math.max(0, ((width - 32) * (scale.value - 1)) / 2);
      const maxY = (310 * (scale.value - 1)) / 2;
      x.value = Math.min(
        maxX,
        Math.max(-maxX, savedX.value + event.translationX),
      );
      y.value = Math.min(
        maxY,
        Math.max(-maxY, savedY.value + event.translationY),
      );
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });
  const fit = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = savedScale.value = 1;
      x.value = savedX.value = y.value = savedY.value = 0;
    });
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));
  useLayoutEffect(() => {
    scale.set(1);
    savedScale.set(1);
    x.set(0);
    savedX.set(0);
    y.set(0);
    savedY.set(0);
  }, [photoKey, scale, savedScale, x, y, savedX, savedY]);

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ReportPage
          title={
            photo
              ? `Photo ${selected + 1} of ${photos.length}`
              : isUpdate
                ? "ALECO photos"
                : "Report evidence"
          }
          onBack={onClose}
          footer={
            <>
              {failed && !unavailable ? (
                <Button fullWidth onPress={() => setAttempt((a) => a + 1)}>
                  Retry photo
                </Button>
              ) : null}
              {photos.length > 1 ? (
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    disabled={selected === 0}
                    accessibilityLabel={
                      isUpdate
                        ? "Previous ALECO photo"
                        : "Previous evidence photo"
                    }
                    onPress={() => setIndex(selected - 1)}
                  >
                    <ChevronLeft size={18} color={foreground} />
                    <Text size="sm">Previous photo</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={selected === photos.length - 1}
                    accessibilityLabel={
                      isUpdate ? "Next ALECO photo" : "Next evidence photo"
                    }
                    onPress={() => setIndex(selected + 1)}
                  >
                    <Text size="sm" className="text-primary-foreground">
                      Next photo
                    </Text>
                    <ChevronRight size={18} color="white" />
                  </Button>
                </View>
              ) : null}
              <Button fullWidth variant="outline" onPress={onClose}>
                {isUpdate ? "Back to update" : "Back to report"}
              </Button>
            </>
          }
        >
          <Text
            weight="semibold"
            style={{ fontSize: 20, lineHeight: 28 }}
            accessibilityRole="header"
          >
            {unavailable
              ? "This photo is unavailable"
              : failed
                ? "This photo couldn’t load"
                : isUpdate
                  ? "ALECO photos"
                  : "Report evidence"}
          </Text>
          {unavailable || failed ? (
            <View className="rounded-xl bg-card p-3 gap-1">
              <Text size="sm" weight="semibold">
                {isUpdate
                  ? "The update is still available"
                  : "The report is still available"}
              </Text>
              <Text size="sm">
                {isUpdate
                  ? "Try loading this photo again when connected. Return to the update and refresh if the image is still unavailable."
                  : unavailable
                    ? "This evidence is not available to view. Return to the report to refresh its evidence or check the photo’s processing status."
                    : "Try loading this photo again when you are connected. If access has expired, return to the report and refresh its evidence."}
              </Text>
            </View>
          ) : photo?.status === "processing" ? (
            <View className="items-center py-12 gap-3">
              <Spinner label="Processing evidence photo" />
              <Text muted size="sm">
                This photo is still processing.
              </Text>
            </View>
          ) : (
            <>
              <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, fit)}>
                <View
                  className="rounded-xl overflow-hidden bg-muted"
                  style={{ height: 310 }}
                >
                  <Animated.View
                    style={[{ width: "100%", height: "100%" }, imageStyle]}
                  >
                    <Image
                      key={photoKey}
                      source={{ uri: photo!.uri }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      style={{ width: "100%", height: "100%" }}
                      accessibilityLabel={`${isUpdate ? "ALECO photo" : "Evidence photo"} ${selected + 1}`}
                      onLoad={() => {
                        if (currentPhoto.current === photoKey)
                          setImageState({ key: photoKey, phase: "loaded" });
                      }}
                      onError={() => {
                        if (currentPhoto.current === photoKey)
                          setImageState({ key: photoKey, phase: "error" });
                      }}
                    />
                  </Animated.View>
                  {loading ? (
                    <View className="absolute inset-0 items-center justify-center">
                      <Spinner
                        label={
                          isUpdate
                            ? "Loading ALECO photo"
                            : "Loading evidence photo"
                        }
                      />
                    </View>
                  ) : null}
                </View>
              </GestureDetector>
              <View className="flex-row items-center gap-2">
                <Text muted size="sm" className="flex-1">
                  Pinch to zoom · Double tap to fit
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={resetZoom}
                  accessibilityLabel={
                    isUpdate ? "Fit ALECO photo" : "Fit evidence photo"
                  }
                >
                  Fit
                </Button>
              </View>
              <View className="rounded-xl bg-card p-3 gap-1">
                <Text weight="semibold" size="sm">
                  Photo {selected + 1} of {photos.length}
                </Text>
                <Text muted size="xs">
                  {isUpdate
                    ? "Photo published by ALECO"
                    : "Original report evidence"}
                </Text>
              </View>
            </>
          )}
        </ReportPage>
      </GestureHandlerRootView>
    </Modal>
  );
}
