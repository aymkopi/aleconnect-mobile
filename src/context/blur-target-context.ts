import type { PropsWithChildren, RefObject } from "react";
import { createContext, createElement, useContext } from "react";
import type { View } from "react-native";

type BlurTargetRef = RefObject<View | null>;

const BlurTargetContext = createContext<BlurTargetRef | null>(null);

export function BlurTargetProvider({
  children,
  value,
}: PropsWithChildren<{ value: BlurTargetRef }>) {
  return createElement(BlurTargetContext.Provider, { value }, children);
}

export function useBlurTargetRef() {
  return useContext(BlurTargetContext);
}
