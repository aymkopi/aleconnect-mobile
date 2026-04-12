import type { PropsWithChildren } from "react";
import { createContext, createElement, useContext } from "react";

import {
  useConsumerProfile,
  type UseConsumerProfileState,
} from "@/hooks/use-consumer-profile";

const ConsumerProfileContext = createContext<UseConsumerProfileState | null>(
  null,
);

export function ConsumerProfileProvider({ children }: PropsWithChildren) {
  const value = useConsumerProfile();

  return createElement(
    ConsumerProfileContext.Provider,
    { value },
    children,
  );
}

export function useConsumerProfileContext(): UseConsumerProfileState {
  const value = useContext(ConsumerProfileContext);

  if (!value) {
    throw new Error(
      "useConsumerProfileContext must be used within ConsumerProfileProvider",
    );
  }

  return value;
}