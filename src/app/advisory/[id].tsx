import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import {
  advisoryScopeKey,
  fetchActiveAdvisory,
  type MobileAdvisory,
} from "@/services/advisories";
import {
  Redirect,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { CalendarDays, Megaphone } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function advisoryType(value: string | null) {
  return value?.trim().toLowerCase() || null;
}

function displaysInterruption(type: string | null) {
  return type !== "general" && type !== "weather_advisory";
}

export default function AdvisoryDetailsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const { accountContext } = useConsumerAccount();
  const [accentColor] = useAppColors(["accent"]);
  const [advisory, setAdvisory] = useState<MobileAdvisory | null>(null);
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationFocus, setNotificationFocus] = useState(false);
  const scope = useMemo(
    () => session
      ? { userId: session.user.id, identityUserId: accountContext?.identityUserId, accessRevision: accountContext?.accessRevision }
      : null,
    [accountContext?.accessRevision, accountContext?.identityUserId, session],
  );
  const scopeKey = scope ? advisoryScopeKey(scope) : null;
  const activeScopeKeyRef = useRef(scopeKey);
  activeScopeKeyRef.current = scopeKey;
  const visibleAdvisory = loadedScopeKey === scopeKey ? advisory : null;

  useEffect(() => {
    if (focus !== "notification") return;
    setNotificationFocus(true);
    const timeout = setTimeout(() => {
      setNotificationFocus(false);
      router.setParams({ focus: undefined });
    }, 2500);
    return () => clearTimeout(timeout);
  }, [focus, router]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/advisories");
  }, [router]);

  const load = useCallback(
    async (refresh = false) => {
      if (!scope || !scopeKey || !id) return;
      const requestedScopeKey = scopeKey;
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const nextAdvisory = await fetchActiveAdvisory(id, scope);
        if (activeScopeKeyRef.current !== requestedScopeKey) return;
        setAdvisory(nextAdvisory);
        setLoadedScopeKey(requestedScopeKey);
        setError(null);
      } catch (nextError) {
        if (activeScopeKeyRef.current !== requestedScopeKey) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load this advisory.",
        );
      } finally {
        if (activeScopeKeyRef.current === requestedScopeKey) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [id, scope, scopeKey],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack, load]),
  );

  if (isSessionLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <View className="flex-1 bg-background">
      <ChildAppBar
        title="Advisory details"
        description="Official ALECO service notice"
        onBack={handleBack}
        backAccessibilityLabel="Back to advisories"
      />
      <ScrollView
        contentContainerStyle={{
          gap: 16,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 16) + 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(true)}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        {isLoading ? (
          <>
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : error || !visibleAdvisory ? (
          <Alert variant="destructive">
            <AlertText>{error ?? "Advisory not found."}</AlertText>
          </Alert>
        ) : (
          <>
            <VStack
              className={`gap-4 rounded-xl border border-border bg-card p-5 ${notificationFocus ? "ring-2 ring-primary/60" : ""}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/15">
                  <Megaphone size={21} color={accentColor} />
                </View>
                <Badge
                  className="rounded-full"
                  variant={
                    /critical|high/i.test(visibleAdvisory.severity)
                      ? "destructive"
                      : "secondary"
                  }
                >
                  <BadgeText>{visibleAdvisory.severity || "Info"}</BadgeText>
                </Badge>
              </View>
              <Heading size="xl">{visibleAdvisory.title}</Heading>
              {visibleAdvisory.controlNumber ? (
                <Text className="text-sm text-muted-foreground">
                  Reference {visibleAdvisory.controlNumber}
                </Text>
              ) : null}
              <Text className="leading-6 text-foreground">
                {visibleAdvisory.content}
              </Text>
            </VStack>

            <VStack className="gap-3 rounded-xl border border-border bg-card p-5">
              {(() => {
                const type = advisoryType(visibleAdvisory.type);
                const showInterruption = displaysInterruption(type);
                const isRestoration = type === "restoration";
                return (
                  <>
                    <View className="flex-row items-center gap-2">
                      <CalendarDays size={19} color={accentColor} />
                      <Heading size="sm">Schedule</Heading>
                    </View>
                    <Text className="text-sm text-muted-foreground">
                      Published: {formatDate(visibleAdvisory.publishedAt)}
                    </Text>

                    {visibleAdvisory.expiresAt ? (
                      <Text className="text-sm text-muted-foreground">
                        Available until: {formatDate(visibleAdvisory.expiresAt)}
                      </Text>
                    ) : null}

                    {showInterruption && isRestoration ? (
                      <VStack className="gap-2 border-t border-border pt-3">
                        <Text className="text-sm font-semibold text-foreground">
                          Restored at
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {visibleAdvisory.scheduledEndAt
                            ? formatDate(visibleAdvisory.scheduledEndAt)
                            : "To be confirmed"}
                        </Text>
                      </VStack>
                    ) : showInterruption && (visibleAdvisory.scheduledStartAt || visibleAdvisory.scheduledEndAt) ? (
                      <VStack className="gap-2 border-t border-border pt-3">
                        <Text className="text-sm font-semibold text-foreground">
                          Interruption
                        </Text>

                        {visibleAdvisory.scheduledStartAt ? (
                          <Text className="text-sm text-muted-foreground">
                            Starts: {formatDate(visibleAdvisory.scheduledStartAt)}
                          </Text>
                        ) : null}

                        {visibleAdvisory.scheduledEndAt ? (
                          <Text className="text-sm text-muted-foreground">
                            Ends: {formatDate(visibleAdvisory.scheduledEndAt)}
                          </Text>
                        ) : null}
                      </VStack>
                    ) : null}
                  </>
                );
              })()}
            </VStack>
          </>
        )}
      </ScrollView>
    </View>
  );
}
