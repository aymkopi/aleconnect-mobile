import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
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
import { useCallback, useEffect, useState } from "react";
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
export default function AdvisoryDetailsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const [accentColor] = useAppColors(["accent"]);
  const [advisory, setAdvisory] = useState<MobileAdvisory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationFocus, setNotificationFocus] = useState(false);

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
      if (!session || !id) return;
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        setAdvisory(await fetchActiveAdvisory(id, session.user.id));
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load this advisory.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, session],
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
        ) : error || !advisory ? (
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
                    /critical|high/i.test(advisory.severity)
                      ? "destructive"
                      : "secondary"
                  }
                >
                  <BadgeText>{advisory.severity || "Info"}</BadgeText>
                </Badge>
              </View>
              <Heading size="xl">{advisory.title}</Heading>
              {advisory.controlNumber ? (
                <Text className="text-sm text-muted-foreground">
                  Reference {advisory.controlNumber}
                </Text>
              ) : null}
              <Text className="leading-6 text-foreground">
                {advisory.content}
              </Text>
            </VStack>

            <VStack className="gap-3 rounded-xl border border-border bg-card p-5">
              <View className="flex-row items-center gap-2">
                <CalendarDays size={19} color={accentColor} />
                <Heading size="sm">Schedule</Heading>
              </View>
              <Text className="text-sm text-muted-foreground">
                Published: {formatDate(advisory.publishedAt)}
              </Text>

              {advisory.expiresAt ? (
                <Text className="text-sm text-muted-foreground">
                  Available until: {formatDate(advisory.expiresAt)}
                </Text>
              ) : null}

              {advisory.scheduledStartAt || advisory.scheduledEndAt ? (
                <VStack className="gap-2 border-t border-border pt-3">
                  <Text className="text-sm font-semibold text-foreground">
                    Interruption
                  </Text>

                  {advisory.scheduledStartAt ? (
                    <Text className="text-sm text-muted-foreground">
                      Starts: {formatDate(advisory.scheduledStartAt)}
                    </Text>
                  ) : null}

                  {advisory.scheduledEndAt ? (
                    <Text className="text-sm text-muted-foreground">
                      Ends: {formatDate(advisory.scheduledEndAt)}
                    </Text>
                  ) : null}
                </VStack>
              ) : null}
            </VStack>
          </>
        )}
      </ScrollView>
    </View>
  );
}
