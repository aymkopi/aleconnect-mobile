import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { useCallback, useEffect, useRef } from "react";
import { Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PushNotificationsReceiver } from "@/components/push-notifications-receiver";
import { AuthSessionProvider } from "@/context/auth-session-context";
import "../../global.css";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Satoshi_400Regular: require("../../assets/fonts/Satoshi-Regular.ttf"),
    Satoshi_500Medium: require("../../assets/fonts/Satoshi-Medium.ttf"),
    Satoshi_700Bold: require("../../assets/fonts/Satoshi-Bold.ttf"),
    Satoshi_900Black: require("../../assets/fonts/Satoshi-Black.ttf"),
  });
  const didApplyDefaultFonts = useRef(false);
  const handlePushTokenReceived = useCallback((token: string) => {
    console.log("ExponentPushToken", token);
  }, []);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    if (!didApplyDefaultFonts.current) {
      const TextHost = Text as unknown as {
        defaultProps?: { style?: unknown };
      };
      const TextInputHost = TextInput as unknown as {
        defaultProps?: { style?: unknown };
      };

      TextHost.defaultProps = TextHost.defaultProps ?? {};
      TextHost.defaultProps.style = [
        TextHost.defaultProps.style,
        { fontFamily: "Satoshi_400Regular" },
      ];

      TextInputHost.defaultProps = TextInputHost.defaultProps ?? {};
      TextInputHost.defaultProps.style = [
        TextInputHost.defaultProps.style,
        { fontFamily: "Satoshi_400Regular" },
      ];

      didApplyDefaultFonts.current = true;
    }

    void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <AuthSessionProvider>
          <PushNotificationsReceiver
            onPushTokenReceived={handlePushTokenReceived}
          />
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="sign-in"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </AuthSessionProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
