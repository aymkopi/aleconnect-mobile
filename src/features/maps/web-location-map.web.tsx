import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Map as MapInstance } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_URL, MAP_LOAD_TIMEOUT_MS } from "./map-runtime";
import type { WebMapHandle, WebLocationMapProps } from "./web-location-map";
export const WebLocationMap = forwardRef<WebMapHandle, WebLocationMapProps>(
  function WebLocationMap(
    {
      latitude,
      longitude,
      zoom = 16,
      interactive = true,
      label = "Location map",
      onChange,
      onReady,
      onError,
    },
    ref,
  ) {
    const container = useRef<HTMLDivElement>(null),
      map = useRef<MapInstance | null>(null);
    const callbacks = useRef({ onChange, onReady, onError });
    callbacks.current = { onChange, onReady, onError };
    const initial = useRef({ latitude, longitude, zoom, interactive });
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
            attributionControl: { compact: true },
          });
          map.current = value;
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
        map.current?.remove();
        map.current = null;
      };
    }, []);
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
