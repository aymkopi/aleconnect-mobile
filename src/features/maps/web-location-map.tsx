import type { Ref } from "react";
export type WebMapHandle = {
  flyTo: (options: {
    center: [number, number];
    zoom?: number;
    duration?: number;
  }) => void;
  zoomTo: (zoom: number) => void;
};
export type WebLocationMapProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactive?: boolean;
  label?: string;
  onChange?: (point: { latitude: number; longitude: number }) => void;
  onReady?: () => void;
  onError?: () => void;
  ref?: Ref<WebMapHandle>;
};
export function WebLocationMap(_props: WebLocationMapProps) {
  return null;
}
