import { useAppReducedMotion } from "@/hooks/use-app-reduced-motion";
// PanelUI ProgressButton 0.108.0; completion requires an uninterrupted JS-clock hold.

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  Platform,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { tv, type VariantProps } from "tailwind-variants";
import { useCSSVariable } from "uniwind";
import { CheckIcon, IconColorProvider } from "@/components/panelui/icons";
import { Text, textChildren } from "@/components/panelui/text";
import { impactKnock, selectionTick } from "@/lib/haptics";
import {
  DEFAULT_AUTO_RESET_DELAY,
  createHoldAttempt,
  releaseDuration,
  resolveHoldDuration,
} from "@/components/panelui/progress-button-hold";

const REDUCED_STEPS = 5;

const DONE_SPRING = { damping: 14, stiffness: 220, mass: 0.6 } as const;

const DONE_EXIT = 140;

const DONE_TINT = {
  primary: "--color-primary-foreground",
  secondary: "--color-background",
  destructive: "--color-destructive-solid-foreground",
  success: "--color-success-solid-foreground",
} as const;

const progressButtonVariants = tv({
  slots: {
    root: "relative overflow-hidden bg-secondary",

    content: "flex-row items-center justify-center gap-2",
    label: "min-w-0 shrink text-center font-medium",

    fill: "",
    fillLabel: "min-w-0 shrink text-center font-medium",
  },
  variants: {
    variant: {
      primary: {
        label: "text-primary",
        fill: "bg-primary",
        fillLabel: "text-primary-foreground",
      },
      secondary: {
        label: "text-secondary-foreground",
        fill: "bg-foreground",
        fillLabel: "text-background",
      },
      destructive: {
        label: "text-destructive",
        fill: "bg-destructive",
        fillLabel: "text-destructive-solid-foreground",
      },
      success: {
        label: "text-success",
        fill: "bg-success",
        fillLabel: "text-success-solid-foreground",
      },
    },
    size: {
      // Matched to Button's boxes, and `min-h-*` for the same reason: the
      // label's glyphs grow with the system text size and the box has to grow
      // with them. The side padding is `shape`'s to decide, below.
      sm: {
        root: "min-h-9",
        content: "min-h-9 gap-1.5 py-2",
        label: "text-[14px]",
        fillLabel: "text-[14px]",
      },
      md: {
        root: "min-h-11",
        content: "min-h-11 py-2.5",
        label: "text-[16px]",
        fillLabel: "text-[16px]",
      },
      lg: {
        root: "min-h-12",
        content: "min-h-12 py-2.5",
        label: "text-[18px]",
        fillLabel: "text-[18px]",
      },
    },

    shape: {
      // The radius is only on the root. It has `overflow-hidden`, so it is what
      // clips the fill — and the fill's own leading edge has to stay straight:
      // rounding it would round the wipe's front as well as the button's
      // corner, which is a bar with a domed end travelling across the button.
      pill: { root: "rounded-full" },
      rounded: { root: "rounded-lg" },
    },
    fullWidth: {
      true: { root: "w-full" },
    },
    disabled: {
      true: { root: "opacity-[0.64]" },
    },
  },
  compoundVariants: [
    // A pill is wider than the equivalent Button at every size, because the
    // corner is a half-circle rather than a small radius: the curve eats into
    // the side padding, and at Button's values the first and last glyphs sit
    // against it. `rounded` has Button's corner, so it takes Button's padding.
    { shape: "pill", size: "sm", class: { content: "px-3.5" } },
    { shape: "pill", size: "md", class: { content: "px-5" } },
    { shape: "pill", size: "lg", class: { content: "px-7" } },
    {
      shape: "rounded",
      size: "sm",
      class: { root: "min-w-9", content: "px-2.5" },
    },
    {
      shape: "rounded",
      size: "md",
      class: { root: "min-w-11", content: "px-4" },
    },
    { shape: "rounded", size: "lg", class: { content: "px-6" } },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
    shape: "pill",
  },
});

type ProgressButtonVariantProps = VariantProps<typeof progressButtonVariants>;

export type ProgressButtonVariant = NonNullable<
  ProgressButtonVariantProps["variant"]
>;

export type ProgressButtonSize = NonNullable<
  ProgressButtonVariantProps["size"]
>;

export type ProgressButtonShape = NonNullable<
  ProgressButtonVariantProps["shape"]
>;

interface ProgressButtonContextValue {
  progress: SharedValue<number>;

  done: SharedValue<number>;

  width: number;
  completed: boolean;
  variant: ProgressButtonVariant;
  size: ProgressButtonSize;
  slots: ReturnType<typeof progressButtonVariants>;
}

const ProgressButtonContext = createContext<ProgressButtonContextValue | null>(
  null,
);

function useProgressButtonContext(
  component: string,
): ProgressButtonContextValue {
  const context = useContext(ProgressButtonContext);
  if (!context)
    throw new Error(`${component} must be used within a <ProgressButton>`);
  return context;
}

export function useProgressButton() {
  const { progress, completed } = useProgressButtonContext("useProgressButton");
  return { progress, completed };
}

export interface ProgressButtonProps
  extends Omit<PressableProps, "children" | "disabled">,
    Omit<ProgressButtonVariantProps, "disabled"> {
  className?: string;

  holdDuration?: number;

  onComplete?: () => void;

  onCompletedChange?: (completed: boolean) => void;

  completed?: boolean;

  autoReset?: boolean;

  autoResetDelay?: number;

  disabled?: boolean;

  haptics?: boolean;

  shape?: ProgressButtonShape;
  children?: ReactNode;
}

const ProgressButtonRoot = forwardRef<View, ProgressButtonProps>(
  function ProgressButtonRoot(
    {
      className,
      variant = "primary",
      size = "md",
      shape = "pill",
      fullWidth,
      holdDuration,
      onComplete,
      onCompletedChange,
      completed: completedProp,
      autoReset = false,
      autoResetDelay = DEFAULT_AUTO_RESET_DELAY,
      disabled = false,
      haptics = false,
      accessibilityState,
      children,
      ...props
    },
    ref,
  ) {
    const slots = progressButtonVariants({
      variant,
      size,
      shape,
      fullWidth,
      disabled,
    });
    const duration = resolveHoldDuration(holdDuration);
    const reducedMotion = useAppReducedMotion();
    const [screenReader, setScreenReader] = useState(false);
    const nativeReader = Platform.OS !== "web" && screenReader;
    const accessibleAttempt = useRef(false);
    useEffect(() => {
      if (Platform.OS === "web") return; // RN web reports a reader unconditionally.
      let active = true;
      void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
        if (active) setScreenReader(value);
      });
      const subscription = AccessibilityInfo.addEventListener(
        "screenReaderChanged",
        setScreenReader,
      );
      return () => {
        active = false;
        subscription.remove();
      };
    }, []);

    const progress = useSharedValue(0);
    const done = useSharedValue(0);
    const [width, setWidth] = useState(0);
    const [internalCompleted, setInternalCompleted] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isControlled = completedProp !== undefined;
    const completed = isControlled ? completedProp : internalCompleted;

    const completedRef = useRef(completed);
    useLayoutEffect(() => {
      completedRef.current = completed;
    }, [completed]);
    const hold = useMemo(() => createHoldAttempt(duration), [duration]);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const enabled = useRef(!disabled);
    useLayoutEffect(() => {
      enabled.current = !disabled;
    }, [disabled]);
    const mounted = useRef(true);
    const appActive = useRef(AppState.currentState === "active");
    const clearHold = useCallback(() => {
      hold.cancel();
      accessibleAttempt.current = false;
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = null;
      cancelAnimation(progress);
      if (!completedRef.current)
        progress.set(
          withTiming(0, {
            duration: releaseDuration(progress.value, duration),
            easing: reducedMotion
              ? Easing.steps(REDUCED_STEPS, true)
              : Easing.linear,
            reduceMotion: ReduceMotion.Never,
          }),
        );
    }, [hold, progress, duration, reducedMotion]);
    const finish = useCallback(
      (token: number) => {
        if (
          !mounted.current ||
          !enabled.current ||
          !appActive.current ||
          completedRef.current ||
          !hold.complete(token, performance.now())
        )
          return;
        completedRef.current = true;
        accessibleAttempt.current = false;
        if (!isControlled) setInternalCompleted(true);
        onCompletedChange?.(true);
        onComplete?.();
        if (haptics) impactKnock();
      },
      [hold, isControlled, onComplete, onCompletedChange, haptics],
    );
    const begin = useCallback(() => {
      if (disabled || completedRef.current || !appActive.current) return;
      clearHold();
      const token = hold.begin(performance.now());
      if (haptics) selectionTick();
      progress.set(0);
      progress.set(
        withTiming(1, {
          duration,
          easing: reducedMotion
            ? Easing.steps(REDUCED_STEPS, true)
            : Easing.linear,
          // The duration is business meaning; reduced motion must not shorten it.
          reduceMotion: ReduceMotion.Never,
        }),
      );
      holdTimer.current = setTimeout(() => finish(token), duration);
    }, [
      disabled,
      clearHold,
      hold,
      haptics,
      progress,
      reducedMotion,
      duration,
      finish,
    ]);
    const abandon = useCallback(() => {
      if (!completedRef.current) clearHold();
    }, [clearHold]);
    const reset = useCallback(() => {
      completedRef.current = false;
      clearHold();
      if (!isControlled) setInternalCompleted(false);
      onCompletedChange?.(false);
    }, [clearHold, isControlled, onCompletedChange]);
    useEffect(() => {
      if (disabled) clearHold();
    }, [disabled, clearHold]);
    useEffect(() => {
      clearHold();
    }, [screenReader, clearHold]);
    useEffect(() => {
      const subscription = AppState.addEventListener("change", (state) => {
        appActive.current = state === "active";
        if (!appActive.current) clearHold();
      });
      return () => subscription.remove();
    }, [clearHold]);
    useEffect(() => {
      if (!completed || !autoReset) return;
      resetTimer.current = setTimeout(reset, autoResetDelay);
      return () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = null;
      };
    }, [completed, autoReset, autoResetDelay, reset]);
    useEffect(() => {
      if (completed) {
        clearHold();
        progress.set(1);
      } else clearHold();
    }, [completed, progress, clearHold]);
    useEffect(() => {
      done.value = reducedMotion
        ? completed
          ? 1
          : 0
        : completed
          ? withSpring(1, DONE_SPRING)
          : withTiming(0, { duration: DONE_EXIT });
    }, [completed, done, reducedMotion]);
    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        hold.cancel();
        cancelAnimation(progress);
        cancelAnimation(done);
        if (holdTimer.current) clearTimeout(holdTimer.current);
        if (resetTimer.current) clearTimeout(resetTimer.current);
      };
    }, [hold, progress, done]);

    // Screen-reader activation has no press-in/out; retain a cancellable full-duration confirmation.
    const activateAccessible = (explicit = false) => {
      if ((!nativeReader && !explicit) || disabled || completedRef.current)
        return;
      if (accessibleAttempt.current) {
        clearHold();
        AccessibilityInfo.announceForAccessibility("Cancelled");
      } else {
        begin();
        accessibleAttempt.current = true;
        AccessibilityInfo.announceForAccessibility(
          `Confirmation starts in ${duration / 1000} seconds. Activate again to cancel.`,
        );
      }
    };
    const onLayout = (event: LayoutChangeEvent) => {
      const next = Math.round(event.nativeEvent.layout.width);
      setWidth((current) => (current === next ? current : next));
      props.onLayout?.(event);
    };

    const context = useMemo<ProgressButtonContextValue>(
      () => ({ progress, done, width, completed, variant, size, slots }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [progress, done, width, completed, variant, size],
    );

    const written = Children.toArray(children);
    const hasDone = written.some(
      (child) => isValidElement(child) && child.type === ProgressButtonDone,
    );
    const body = (
      <>
        {written.length > 0 ? (
          written
        ) : (
          <ProgressButtonLabel>Hold to confirm</ProgressButtonLabel>
        )}
        {hasDone ? null : <ProgressButtonDone />}
      </>
    );

    return (
      <ProgressButtonContext.Provider value={context}>
        <Pressable
          ref={ref}
          accessibilityRole="button"
          accessibilityHint={
            nativeReader
              ? `Activate to start a ${duration / 1000} second confirmation. Activate again to cancel.`
              : `Press and hold continuously for ${duration / 1000} seconds to confirm`
          }
          accessibilityState={{
            ...accessibilityState,
            disabled,
            checked: completed,
          }}
          disabled={disabled}
          {...props}
          onPressIn={
            nativeReader
              ? undefined
              : (event) => {
                  if (Platform.OS !== "web" || !("key" in (event.nativeEvent ?? event)))
                    begin();
                }
          }
          onPressOut={
            nativeReader
              ? undefined
              : (event) => {
                  if (Platform.OS !== "web" || !("key" in (event.nativeEvent ?? event)))
                    abandon();
                }
          }
          onPress={(event) => {
            const nonPointer =
              Platform.OS === "web" &&
              "detail" in event.nativeEvent &&
              event.nativeEvent.detail === 0;
            activateAccessible(nonPointer);
          }}
          accessibilityActions={[
            { name: "activate", label: "Start or cancel confirmation" },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === "activate") activateAccessible(true);
          }}
          // A few points of drift should not abandon a hold the reader is
          // still making. Fingers move.
          pressRetentionOffset={16}
          onLayout={onLayout}
          className={slots.root({ className })}
        >
          {body}
        </Pressable>
      </ProgressButtonContext.Provider>
    );
  },
);

export interface ProgressButtonLabelProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

function ProgressButtonLabel({
  className,
  children,
  ...props
}: ProgressButtonLabelProps) {
  const { progress, width, slots } = useProgressButtonContext(
    "ProgressButton.Label",
  );

  const fillStyle = useAnimatedStyle(() => ({ width: width * progress.value }));

  return (
    <View {...props} className={slots.content({ className })}>
      {textChildren(children, (text) => (
        <Text className={slots.label()}>{text}</Text>
      ))}

      {}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            overflow: "hidden",
          },
          fillStyle,
        ]}
        className={slots.fill()}
      >
        <View style={{ width }} className={slots.content()}>
          {textChildren(children, (text) => (
            <Text className={slots.fillLabel()}>{text}</Text>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
ProgressButtonLabel.displayName = "ProgressButton.Label";

export interface ProgressButtonDoneProps extends ViewProps {
  className?: string;

  children?: ReactNode;
}

function ProgressButtonDone({
  className,
  children,
  ...props
}: ProgressButtonDoneProps) {
  const { done, completed, variant, slots } = useProgressButtonContext(
    "ProgressButton.Done",
  );
  const tint = useCSSVariable(DONE_TINT[variant]);

  const style = useAnimatedStyle(() => ({ opacity: done.value }));
  // The tick arrives from slightly under full size. The ground it lands on
  // does not: a background box that grows reads as the button resizing.
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + done.value * 0.3 }],
  }));

  return (
    <Animated.View
      {...props}
      // Never takes the press: the button underneath still owns it, which is
      // what lets a completed button be reset and held again.
      pointerEvents="none"
      accessibilityElementsHidden={!completed}
      importantForAccessibility={completed ? "auto" : "no-hide-descendants"}
      style={[
        { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
        style,
      ]}
      className={slots.fill({ className: slots.content({ className }) })}
    >
      <Animated.View style={markStyle} className={slots.content()}>
        <IconColorProvider color={typeof tint === "string" ? tint : undefined}>
          {children ?? <CheckIcon size={18} />}
        </IconColorProvider>
      </Animated.View>
    </Animated.View>
  );
}
ProgressButtonDone.displayName = "ProgressButton.Done";

ProgressButtonRoot.displayName = "ProgressButton";

export const ProgressButton = Object.assign(ProgressButtonRoot, {
  Label: ProgressButtonLabel,
  Done: ProgressButtonDone,
});

export {
  DEFAULT_AUTO_RESET_DELAY,
  DEFAULT_HOLD_DURATION,
  DEFAULT_RELEASE_DURATION,
  fillDuration,
  isComplete,
  releaseDuration,
  resolveHoldDuration,
} from "@/components/panelui/progress-button-hold";
