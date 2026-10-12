import { type ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  PortalHost,
  PortalProvider,
  useModalIsolationActive,
} from '@/components/panelui/portal';
import { ToastViewport } from '@/components/panelui/toast';
import { cn } from '@/lib/cn';

// This native app includes keyboard-controller; a stable import keeps its subtree mounted.
export interface PanelUIProviderProps {
  children: ReactNode;
  /**
   * Classes for the themed page surface. Defaults to `bg-background`, which
   * follows the active theme. Pass your own to change the page colour.
   */
  className?: string;
  /**
   * Set to false to render without the themed page background — do this only
   * if you paint the app background yourself.
   */
  background?: boolean;
  /**
   * Tell the keyboard controller that the Android status bar is translucent,
   * so it measures the keyboard against the right window inset.
   *
   * Reach for it only where the app draws under the status bar without being
   * edge-to-edge. Under edge-to-edge — the default from Expo SDK 54 — the
   * controller detects that for itself and this is ignored, so leave it unset
   * there rather than passing `false`: a value it has to ignore is a warning
   * in development.
   *
   * Android only, and inert without `react-native-keyboard-controller`.
   */
  statusBarTranslucent?: boolean;
  /**
   * The same, for a translucent Android navigation bar.
   *
   * Android only, and inert without `react-native-keyboard-controller`.
   */
  navigationBarTranslucent?: boolean;
}

/**
 * Root provider for PanelUI. Owns three things:
 * the gesture handler root, the themed page background, and the portal host
 * used by overlay components (Dialog, BottomSheet, Select).
 *
 * The background lives here because native wrappers like SafeAreaView do not
 * accept `className` — putting `bg-background` on one silently does nothing,
 * leaving the page unthemed while its children follow the theme.
 *
 * Theme switching is handled natively by Uniwind — use the `useTheme()` hook
 * exported from panelui-native.
 */
export function PanelUIProvider({
  children,
  className,
  background = true,
  statusBarTranslucent,
  navigationBarTranslucent,
}: PanelUIProviderProps) {

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Passed through rather than defaulted: the controller warns about a
          value it has to ignore, and under edge-to-edge it ignores both. */}
      <KeyboardProvider
        statusBarTranslucent={statusBarTranslucent}
        navigationBarTranslucent={navigationBarTranslucent}
      >
        <PortalProvider>
          <ProviderSurface
            background={background}
            className={className}
          >
            {children}
          </ProviderSurface>
        </PortalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function ProviderSurface({
  children,
  className,
  background,
}: Required<Pick<PanelUIProviderProps, 'children' | 'background'>> &
  Pick<PanelUIProviderProps, 'className'>) {
  const modalActive = useModalIsolationActive();
  const isolateApp = Platform.OS === 'android' && modalActive;

  return (
    <View className={cn('flex-1', background && 'bg-background', className)}>
      {/* This wrapper is the app accessibility boundary. PortalHost stays its
          sibling, so hiding the background can never hide the active modal. */}
      <View
        collapsable={false}
        style={styles.content}
        importantForAccessibility={isolateApp ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {/* Sits before PortalHost so it can portal into it. */}
      <ToastViewport />
      <PortalHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
