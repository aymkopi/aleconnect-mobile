import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { View, useWindowDimensions, type ViewProps } from "react-native";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Tour } from "@/components/panelui/tour";
import { useGuestAccess } from "@/context/guest-access-context";
import { appGuides, guideOfferKey, pendingWelcomeKey, pendingWelcomeOffer, isInteractiveSignIn, type GuideId, type GuideStepDefinition, type WelcomeOffer } from "@/features/onboarding/guidance-state";
import { useAuthSession } from "@/hooks/use-auth-session";

type Guide = (typeof appGuides)[number];
type ContextValue = {
  guide: Guide | null;
  guest: boolean;
  startGuide: (id: GuideId) => void;
  stopGuide: () => void;
  registerActivation: (target: string, action: () => void) => () => void;
};
const Context = createContext<ContextValue | null>(null);

export function AppGuideProvider({ children }: PropsWithChildren) {
  const router = useRouter(), pathname = usePathname();
  const { width, height, fontScale } = useWindowDimensions();
  const { session, isLoading } = useAuthSession();
  const { guest, gateOpen, requestSignIn } = useGuestAccess();
  const scope = session ? "account:" + session.user.id : guest ? "guest" : "fixture";
  const [request, setRequest] = useState<{ scope: string; id: GuideId; arrived: boolean } | null>(null);
  const [step, setStep] = useState(0);
  const [offer, setOffer] = useState<{ scope: string; kind: WelcomeOffer; open: boolean } | null>(null);
  const previousAuth = useRef<{ isLoading: boolean; userId: string | null }>({ isLoading: true, userId: null });
  const [interactivePrincipal, setInteractivePrincipal] = useState<string | null>(null);
  const activations = useRef(new Map<string, () => void>());
  const requested = request?.scope === scope ? appGuides.find((guide) => guide.id === request.id) : null;
  const guide = requested && requested.route === pathname && !isLoading && !session?.user.mustChangePassword && !gateOpen ? requested : null;
  const visibleOffer = offer?.open && offer.scope === scope && pathname === "/home" && !isLoading && !gateOpen && !session?.user.mustChangePassword ? offer.kind : null;
  const offerKind = offer?.kind ?? "guest";
  const stopGuide = useCallback(() => setRequest(null), []);
  const dismissOffer = useCallback(() => setOffer((current) => current?.open ? { ...current, open: false } : current), []);

  useEffect(() => {
    const next = { isLoading, userId: session?.user.id ?? null };
    if (isInteractiveSignIn(previousAuth.current, next)) setInteractivePrincipal(next.userId);
    if (!next.userId) setInteractivePrincipal(null);
    previousAuth.current = next;
  }, [isLoading, session?.user.id]);

  useEffect(() => {
    if (request && (request.scope !== scope || gateOpen || (request.arrived && pathname !== requested?.route))) {
      setRequest(null);
    } else if (request && !request.arrived && pathname === requested?.route) {
      setRequest({ ...request, arrived: true });
    }
    if (pathname !== "/home" || gateOpen || offer?.scope !== scope) dismissOffer();
  }, [pathname, scope, gateOpen, request, requested?.route, offer?.scope, dismissOffer]);

  useEffect(() => {
    if (pathname !== "/home" || isLoading || gateOpen || session?.user.mustChangePassword) return;
    let active = true;
    const key = guideOfferKey(session?.user.id ?? null);
    void AsyncStorage.multiGet([pendingWelcomeKey, key]).then(async (values) => {
      if (!active) return;
      const pending = session && interactivePrincipal === session.user.id ? "account" : values[0][1];
      const kind = pendingWelcomeOffer(pending, { isLoading, hasSession: !!session, mustChangePassword: !!session?.user.mustChangePassword, alreadyOffered: values[1][1] === "1", interactiveSignIn: !!session && interactivePrincipal === session.user.id });
      if (!kind) return;
      setOffer({ scope, kind, open: true });
      // These are optional UI hints, never authentication or authorization records.
      await AsyncStorage.setItem(key, "1").catch(() => undefined);
      if (active) await AsyncStorage.removeItem(pendingWelcomeKey).catch(() => undefined);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [pathname, scope, isLoading, gateOpen, session, interactivePrincipal]);

  const registerActivation = useCallback((target: string, action: () => void) => {
    activations.current.set(target, action);
    return () => { if (activations.current.get(target) === action) activations.current.delete(target); };
  }, []);
  useEffect(() => {
    const target = guide?.steps[step]?.target;
    if (target) activations.current.get(target)?.();
  }, [guide, step, width, height, fontScale]);

  function startGuide(id: GuideId) {
    const next = appGuides.find((item) => item.id === id);
    if (!next) return;
    if (guest && !next.public) { requestSignIn(next.route); return; }
    dismissOffer();
    setStep(0);
    setRequest({ scope, id, arrived: false });
    router.navigate(next.route);
  }

  function openSetupOrGuides(setup: boolean) {
    dismissOffer();
    // Choosing a chapter on the next page keeps the closing sheet and Tour separate.
    router.push(setup ? "/profile/setup" : "/guide");
  }

  return (
    <Context.Provider value={{ guide, guest, startGuide, stopGuide, registerActivation }}>
      <Tour open={!!guide} step={step} onOpenChange={(open) => { if (!open) stopGuide(); }}
        onStepChange={setStep} cardClassName="bg-card shadow-none">
        {children}
      </Tour>
      <BottomSheet open={!!visibleOffer} onOpenChange={(open) => { if (!open) dismissOffer(); }}>
        <BottomSheet.Content detached={false} size="auto" showGrabber={false}>
          <BottomSheet.Header title={<Text accessibilityRole="header" style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 20, lineHeight: 28 }}>{offerKind === "account" ? "Get started your way" : "Take a quick look around"}</Text>} />
          <BottomSheet.Body contentContainerStyle={{ gap: 16 }}>
            <Text style={{ fontSize: 16, lineHeight: 24 }} muted>{offerKind === "account" ? "Review your account or learn your way around. You can return from Help & support." : "See where to find public updates and hotlines. You can explore without an account."}</Text>
            <View className="gap-2">
              <Button fullWidth style={{ minHeight: 48 }} onPress={() => openSetupOrGuides(offerKind === "account")}>{offerKind === "account" ? "Review my account" : "Take a quick tour"}</Button>
              <Button fullWidth variant={offerKind === "account" ? "social" : "ghost"} style={{ minHeight: 48 }} labelClassName="text-primary" onPress={() => offerKind === "account" ? openSetupOrGuides(false) : dismissOffer()}>{offerKind === "account" ? "Take a quick tour" : "Explore on my own"}</Button>
            </View>
          </BottomSheet.Body>
        </BottomSheet.Content>
      </BottomSheet>
    </Context.Provider>
  );
}

export function useAppGuide() {
  const value = useContext(Context);
  if (!value) throw new Error("AppGuideProvider is required");
  return value;
}

export function GuideStep({ chapter, target, title, description, onActivate, children, ...props }: PropsWithChildren<ViewProps & { className?: string; chapter: GuideId; target: string; title?: string; description?: string; onActivate?: () => void }>) {
  const { guide, guest, registerActivation } = useAppGuide();
  const steps: readonly GuideStepDefinition[] = guide?.steps ?? [];
  const order = guide?.id === chapter ? steps.findIndex((step) => step.target === target) : -1;
  const definition = steps[order];
  useEffect(() => {
    if (order < 0 || !onActivate) return;
    return registerActivation(target, onActivate);
  }, [order, target, onActivate, registerActivation]);
  if (!definition) return <View {...props}>{children}</View>;
  return <Tour.Step {...props} order={order} title={title ?? definition.title} description={description ?? (guest && definition.guestDescription ? definition.guestDescription : definition.description)}>{children}</Tour.Step>;
}
