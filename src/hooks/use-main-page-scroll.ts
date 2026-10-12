import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect, useNavigation } from "expo-router";
import type { BottomTabNavigationProp } from "expo-router/js-tabs";
import type { ParamListBase } from "expo-router/react-navigation";
type MainScroll = { scrollTo?: (options: { y: number; animated: boolean }) => void; scrollToOffset?: (options: { offset: number; animated: boolean }) => void };
export function useMainPageScroll<T extends MainScroll>(onReturn?: () => void) {
  const scrollRef = useRef<T>(null);
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  const visited = useRef(false);
  const reset = useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);
  useFocusEffect(useCallback(() => {
    reset();
    if (visited.current) onReturn?.();
    visited.current = true;
  }, [onReturn, reset]));
  useEffect(() => {
    const tabs = navigation.getState()?.type === "tab" ? navigation : navigation.getParent<BottomTabNavigationProp<ParamListBase>>() ?? navigation;
    return tabs.addListener("tabPress", () => { if (navigation.isFocused()) reset(); });
  }, [navigation, reset]);
  return scrollRef;
}
