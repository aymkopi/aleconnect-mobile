import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Map as MapInstance } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAppColors } from "@/hooks/use-app-colors";
import { MAP_STYLE_URL, MAP_LOAD_TIMEOUT_MS } from "./map-runtime";
import type { WebMapHandle, WebLocationMapProps } from "./web-location-map";
export const WebLocationMap = forwardRef<WebMapHandle, WebLocationMapProps>(
  function WebLocationMap(
    {
      latitude,
      longitude,
      zoom = 16,
      interactive = true,
      maxBounds,
      minZoom,
      maxZoom,
      userLocation,
      label = "Location map",
      onChange,
      onReady,
      onError,
    },
    ref,
  ) {
    const container = useRef<HTMLDivElement>(null),
      map = useRef<MapInstance | null>(null);
    const [primary] = useAppColors(["primary"]);
    const callbacks = useRef({ onChange, onReady, onError, userLocation, primary });
    callbacks.current = { onChange, onReady, onError, userLocation, primary };
    const initial = useRef({ latitude, longitude, zoom, interactive, maxBounds, minZoom, maxZoom });
    const puck = useRef<import("maplibre-gl").Marker | null>(null);
    const markerClass = useRef<typeof import("maplibre-gl").Marker | null>(null);
    const updatePuck = useCallback(() => {
      const { userLocation: point, primary: color } = callbacks.current;
      if (!point || !map.current || !markerClass.current) { puck.current?.remove(); puck.current = null; return; }
      if (!puck.current) {
        const dot = document.createElement("div");
        dot.setAttribute("aria-label", "Your current location");
        Object.assign(dot.style, { width: "16px", height: "16px", borderRadius: "50%", background: color, boxShadow: `0 0 0 6px color-mix(in srgb, ${color} 20%, transparent)`, pointerEvents: "none" });
        puck.current = new markerClass.current({ element: dot }).setLngLat([point.longitude, point.latitude]).addTo(map.current);
      } else {
        puck.current.setLngLat([point.longitude, point.latitude]);
        puck.current.getElement().style.background = color;
      }
    }, []);
    useEffect(updatePuck, [userLocation, primary, updatePuck]);
    useImperativeHandle(
      ref,
      () => ({
        flyTo: (options) =>
          map.current?.flyTo({
            ...options,
            duration: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? 0
              : options.duration,
          }),
        zoomTo: (next) =>
          map.current?.zoomTo(next, {
            duration: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? 0
              : 250,
          }),
      }),
      [],
    );
    useEffect(() => {
      let active = true,
        loaded = false,
        resize: ResizeObserver | undefined;
      const timeout = setTimeout(() => {
        if (active && !loaded) callbacks.current.onError?.();
      }, MAP_LOAD_TIMEOUT_MS);
      void import("maplibre-gl")
        .then((gl) => {
          if (!active || !container.current) return;
          gl.setWorkerUrl(`/maplibre/maplibre-gl-worker.mjs?v=${gl.getVersion()}`);
          const value = new gl.Map({
            container: container.current,
            style: MAP_STYLE_URL,
            center: [initial.current.longitude, initial.current.latitude],
            zoom: initial.current.zoom,
            interactive: initial.current.interactive,
            maxBounds: initial.current.maxBounds,
            minZoom: initial.current.minZoom,
            maxZoom: initial.current.maxZoom,
            attributionControl: { compact: true },
          });
          map.current = value;
          markerClass.current = gl.Marker;
          updatePuck();
          value.once("load", () => {
            loaded = true;
            clearTimeout(timeout);
            if (active) callbacks.current.onReady?.();
          });
          value.on("error", () => {
            if (active && !loaded) callbacks.current.onError?.();
          });
          value.on("moveend", () => {
            if (active && initial.current.interactive) {
              const p = value.getCenter();
              callbacks.current.onChange?.({
                latitude: p.lat,
                longitude: p.lng,
              });
            }
          });
          resize = new ResizeObserver(() => value.resize());
          resize.observe(container.current);
        })
        .catch(() => {
          if (active) callbacks.current.onError?.();
        });
      return () => {
        active = false;
        clearTimeout(timeout);
        resize?.disconnect();
        puck.current?.remove();
        puck.current = null;
        map.current?.remove();
        map.current = null;
      };
    }, [updatePuck]);
    return (
      <div
        ref={container}
        role="img"
        aria-label={label}
        style={{ width: "100%", height: "100%", minHeight: 100 }}
      />
    );
  },
);
