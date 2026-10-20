import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, BackHandler, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { useUniwind } from "uniwind";
import { onboardingArtwork } from "@/assets/aleconnect/onboarding-artwork";
import { Button } from "@/components/panelui/button";
import { Carousel } from "@/components/panelui/carousel";
import { Spinner } from "@/components/panelui/spinner";
import { Text } from "@/components/panelui/text";
import { signedInDestination, signInIntent } from "@/features/auth/auth-state";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { welcomeSeenKey, welcomeSlides } from "./welcome-state";
import { pendingWelcomeKey } from "./guidance-state";

export default function WelcomeScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();
  const { theme } = useUniwind();
  const [primary, border] = useAppColors(["primary", "border"]);
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(height - insets.top - insets.bottom - 242);
  const [messageHeights, setMessageHeights] = useState([156 * fontScale, 156 * fontScale, 156 * fontScale]);
  const leaving = useRef(false);
  const mounted = useRef(true);
  const principal = useRef(session);
  const [exiting, setExiting] = useState<"account" | "guest" | null>(null);
  const dark = theme === "dark" || theme.endsWith("-dark");
  const artWidth = Math.min(370, width - 32);
  const artHeight = Math.max(96, Math.min(344, artWidth * 344 / 370, bodyHeight - Math.max(...messageHeights) - 24));
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    principal.current = session;
    if (!isLoading && !session) {
      AccessibilityInfo.announceForAccessibility(`Page ${index + 1} of 3. ${welcomeSlides[index].title.replace(/\n/g, " ")}`);
    }
  }, [index, isLoading, session]);

  useFocusEffect(useCallback(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (leaving.current) return true;
      if (index === 0) return false;
      setIndex((current) => current - 1);
      return true;
    });
    return () => back.remove();
  }, [index]));

  async function finish(guest = false) {
    if (leaving.current) return;
    leaving.current = true;
    setExiting(guest ? "guest" : "account");
    await AsyncStorage.multiSet([[welcomeSeenKey, "1"], [pendingWelcomeKey, guest ? "guest" : "account"]]).catch(() => undefined);
    if (!mounted.current || principal.current) return;
    if (guest) router.replace("/home");
    else router.replace({ pathname: "/sign-in", params: { context: "new" } });
  }

  if (isLoading) return <View className="flex-1 items-center justify-center bg-background"><Spinner label="Opening ALEConnect" /></View>;
  if (session) return <Redirect href={signedInDestination(signInIntent({}), session)} />;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 8 }}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.headerSlot}>
            {index > 0 && <Button disabled={!!exiting} variant="ghost" labelClassName="text-primary text-[16px] leading-[22px]" style={styles.headerAction} onPress={() => setIndex((current) => Math.max(0, current - 1))}>Back</Button>}
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.brand}>ALEConnect</Text>
          <View style={styles.headerSlot}>
            {index < 2 && <Button disabled={!!exiting} variant="ghost" labelClassName="text-primary text-[16px] leading-[22px]" style={styles.headerAction} onPress={() => setIndex(2)}>Skip</Button>}
          </View>
        </View>

        <Carousel index={index} onIndexChange={setIndex} style={styles.carousel}>
          <Carousel.Content style={styles.content} onLayout={(event) => setBodyHeight(event.nativeEvent.layout.height)}>
            {welcomeSlides.map((slide, slideIndex) => (
              <Carousel.Item key={slide.title} aria-hidden={slideIndex !== index} {...(Platform.OS === "ios" ? { accessibilityElementsHidden: slideIndex !== index } : {})} importantForAccessibility={slideIndex === index ? "auto" : "no-hide-descendants"}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slide}>
                  <View accessible={false} aria-hidden {...(Platform.OS === "ios" ? { accessibilityElementsHidden: true } : {})} importantForAccessibility="no-hide-descendants" style={{ width: artWidth, height: artHeight, alignSelf: "center" }}>
                    <SvgXml xml={onboardingArtwork[slideIndex][dark ? "dark" : "light"]} width="100%" height="100%" />
                  </View>
                  <View style={styles.message} onLayout={(event) => {
                    const messageHeight = event.nativeEvent.layout.height;
                    setMessageHeights((current) => current[slideIndex] === messageHeight ? current : current.map((value, i) => i === slideIndex ? messageHeight : value));
                  }}>
                    <Text accessibilityRole="header" style={styles.title}>{slide.title}</Text>
                    <Text muted style={styles.description}>{slide.description}</Text>
                  </View>
                </ScrollView>
              </Carousel.Item>
            ))}
          </Carousel.Content>

          <View accessible={false} aria-hidden {...(Platform.OS === "ios" ? { accessibilityElementsHidden: true } : {})} importantForAccessibility="no-hide-descendants" style={styles.progress}>
            {welcomeSlides.map((slide, page) => <View key={slide.title} style={{ height: 8, width: page === index ? 24 : 8, borderRadius: 4, backgroundColor: page === index ? primary : border }} />)}
          </View>
          <View style={styles.actions}>
            <Button fullWidth disabled={!!exiting} loading={index === 2 && exiting === "account"} style={styles.button} labelClassName="text-[16px] leading-[22px]" onPress={() => index < 2 ? setIndex((current) => Math.min(2, current + 1)) : void finish()}>{index < 2 ? "Next" : "Sign in"}</Button>
            <Button fullWidth disabled={!!exiting} loading={exiting === (index < 2 ? "account" : "guest")} variant={index < 2 ? "ghost" : "social"} style={styles.button} labelClassName="text-primary text-[16px] leading-[22px]" onPress={() => void finish(index === 2)}>{index < 2 ? "Sign in" : "Explore as a guest"}</Button>
          </View>
        </Carousel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, width: "100%", maxWidth: 512, alignSelf: "center", paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, minHeight: 48 },
  headerSlot: { minWidth: 64 },
  headerAction: { minHeight: 48, minWidth: 64, paddingHorizontal: 0, paddingVertical: 12 },
  brand: { flex: 1, textAlign: "center", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 20, lineHeight: 28 },
  carousel: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  slide: { flexGrow: 1, justifyContent: "center", paddingVertical: 8 },
  message: { gap: 12, marginTop: 24 },
  title: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 28, lineHeight: 36, letterSpacing: -0.42 },
  description: { fontSize: 16, lineHeight: 24 },
  progress: { flexDirection: "row", gap: 8, marginTop: 30, marginBottom: 30 },
  actions: { gap: 8 },
  button: { minHeight: 48, borderRadius: 16, paddingVertical: 12 },
});
