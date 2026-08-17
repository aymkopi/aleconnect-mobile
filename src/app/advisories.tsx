import { ChildAppBar } from "@/components/child-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import { Button, ButtonText } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { AdvisoryListItem } from "@/features/advisories/advisory-list-item";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  fetchActiveAdvisories,
  type MobileAdvisory,
} from "@/services/advisories";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdvisoriesRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const [accentColor] = useAppColors(["accent"]);
  const [items, setItems] = useState<MobileAdvisory[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const activeUserIdRef = useRef(session?.user.id);
  activeUserIdRef.current = session?.user.id;
  const visibleItems = loadedUserId === session?.user.id ? items : [];

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }, [router]);

  const load = useCallback(
    async (force = false) => {
      if (!session) return;
      const userId = session.user.id;
      if (force) setIsRefreshing(true);
      else if (!hasLoadedRef.current) setIsLoading(true);

      try {
        const response = await fetchActiveAdvisories({
          userId,
          force,
        });
        if (activeUserIdRef.current !== userId) return;
        setItems(response.advisories);
        setLoadedUserId(userId);
        setNextCursor(response.nextCursor);
        setError(
          response.isStale
            ? "Showing saved advisories while the network is unavailable."
            : null,
        );
      } catch (nextError) {
        if (activeUserIdRef.current !== userId) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load advisories.",
        );
      } finally {
        if (activeUserIdRef.current !== userId) return;
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [session],
  );

  const loadMore = useCallback(async () => {
    if (!session || !nextCursor || isLoadingMore) return;
    const userId = session.user.id;
    setIsLoadingMore(true);
    try {
      const response = await fetchActiveAdvisories({
        userId,
        cursor: nextCursor,
      });
      if (activeUserIdRef.current !== userId) return;
      setItems((current) => [
        ...current,
        ...response.advisories.filter(
          (next) => !current.some((item) => item.id === next.id),
        ),
      ]);
      setLoadedUserId(userId);
      setNextCursor(response.nextCursor);
    } catch (nextError) {
      if (activeUserIdRef.current !== userId) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load more advisories.",
      );
    } finally {
      if (activeUserIdRef.current === userId) setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor, session]);

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
        title="Advisories"
        description="Active service notices for your area"
        onBack={handleBack}
        backAccessibilityLabel="Back to home"
      />
      {isLoading ? (
        <View className="gap-2 px-5 pt-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <View
              key={index}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <View className="gap-2">
                <View className="flex-row items-center justify-between gap-3">
                  <Skeleton className="h-3 w-24 rounded-sm" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </View>

                <Skeleton className="h-5 w-4/5 rounded-sm" />

                <View className="gap-1">
                  <Skeleton className="h-3 w-36 rounded-sm" />
                  <Skeleton className="h-3 w-4/5 rounded-sm" />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 16) + 20,
          }}
          data={visibleItems}
          keyExtractor={(item) => item.id}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void load(true)}
              tintColor={accentColor}
              colors={[accentColor]}
            />
          }
          ListHeaderComponent={
            error ? (
              <Alert className="mb-3">
                <AlertText>{error}</AlertText>
              </Alert>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center gap-3 px-8 py-20">
              <Text className="text-center font-semibold text-foreground">
                No active advisories
              </Text>
              <Text className="text-center text-sm text-muted-foreground">
                New service notices for your account and area will appear here.
              </Text>
              <Button
                variant="secondary"
                onPress={() => router.replace("/home")}
              >
                <ButtonText>Back to home</ButtonText>
              </Button>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator className="my-5" color={accentColor} />
            ) : null
          }
          renderItem={({ item }) => (
            <AdvisoryListItem
              advisory={item}
              onPress={() =>
                router.push({
                  pathname: "/advisory/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
        />
      )}
    </View>
  );
}
