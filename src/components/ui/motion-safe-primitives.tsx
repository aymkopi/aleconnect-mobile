import React from 'react';
import {
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
} from 'react-native';

type LegacyMotionProps = {
  animate?: unknown;
  exit?: unknown;
  initial?: unknown;
  transition?: unknown;
};

export const MotionSafeView = React.forwardRef<
  React.ComponentRef<typeof View>,
  ViewProps & LegacyMotionProps
>(function MotionSafeView(
  {
    animate: _animate,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    ...props
  },
  ref,
) {
  return <View ref={ref} {...props} />;
});

export const MotionSafePressable = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  PressableProps & LegacyMotionProps
>(function MotionSafePressable(
  {
    animate: _animate,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    ...props
  },
  ref,
) {
  return <Pressable ref={ref} {...props} />;
});
