import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Alert, AlertText } from "@/components/ui/alert";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetPortal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetRef,
} from "@/components/ui/bottomsheet";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import {
  fetchHotlines,
  type HotlineAgency,
  type HotlineCategory,
  type HotlineContact,
} from "@/services/hotlines";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  Bell,
  Building2,
  ChevronRight,
  Copy,
  Droplet,
  Flame,
  Globe2,
  Phone,
  Plus,
  Search,
  Shield,
  Siren,
  X,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Linking,
  PanResponder,
  RefreshControl,
  ScrollView,
  View,
  findNodeHandle,
  useWindowDimensions,
} from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CategoryVisual = {
  icon: LucideIcon;
  tone: "accent" | "danger" | "foreground" | "success" | "warning";
  softClassName: string;
};

const visuals: [RegExp, CategoryVisual][] = [
  [
    /electric|power|aleco/i,
    { icon: Zap, tone: "accent", softClassName: "bg-accent/10" },
  ],
  [
    /medical|health|hospital/i,
    { icon: Plus, tone: "danger", softClassName: "bg-danger/10" },
  ],
  [
    /fire|rescue/i,
    { icon: Flame, tone: "warning", softClassName: "bg-warning/10" },
  ],
  [
    /water/i,
    { icon: Droplet, tone: "success", softClassName: "bg-success/10" },
  ],
  [
    /safety|police|public/i,
    { icon: Shield, tone: "foreground", softClassName: "bg-muted/20" },
  ],
  [
    /drrmo|disaster|risk/i,
    { icon: Building2, tone: "warning", softClassName: "bg-warning/10" },
  ],
];

function rowsOf<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function digits(value: string) {
  return value.replace(/\D+/g, "");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function visualFor(name: string): CategoryVisual {
  return (
    visuals.find(([pattern]) => pattern.test(name))?.[1] ?? {
      icon: Building2,
      tone: "foreground",
      softClassName: "bg-muted/20",
    }
  );
}

function contactLabel(contact: HotlineContact) {
  return contact.label || contact.type || "Hotline";
}

function agencySearchText(agency: HotlineAgency, categoryName: string) {
  return normalize(
    [
      agency.name,
      agency.description,
      agency.address,
      categoryName,
      agency.contacts
        .map(
          (contact) =>
            `${contact.number} ${contact.label ?? ""} ${contact.type ?? ""}`,
        )
        .join(" "),
    ].join(" "),
  );
}

function agencyMatches(
  agency: HotlineAgency,
  categoryName: string,
  query: string,
) {
  const textQuery = normalize(query);
  const digitQuery = digits(query);
  if (!textQuery && !digitQuery) return true;
  return (
    agencySearchText(agency, categoryName).includes(textQuery) ||
    Boolean(
      digitQuery &&
      agency.contacts.some((contact) =>
        digits(contact.number).includes(digitQuery),
      ),
    )
  );
}

function SheetSearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const [mutedColor] = useAppColors(["muted-foreground"]);

  return (
    <View className="flex-row items-center">
      <BottomSheetTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className="h-12 flex-1 rounded-xl px-10"
        autoCorrect={false}
        autoCapitalize="none"
      />
      <View className="absolute left-3" style={{ pointerEvents: "none" }}>
        <Search size={17} color={mutedColor} />
      </View>
      {value ? (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1 min-h-11 min-w-11 rounded-full"
          onPress={() => onChangeText("")}
          accessibilityLabel="Clear search"
        >
          <ButtonIcon as={X} height={16} width={16} />
        </Button>
      ) : null}
    </View>
  );
}

function EmergencySlider() {
  const x = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const [mutedColor, dangerColor, foregroundColor, surfaceColor] = useAppColors(
    ["muted", "destructive", "foreground", "background"],
  );
  const max = Math.max(trackWidth - 54, 0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          x.setValue(Math.max(0, Math.min(max, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          const next = Math.max(0, Math.min(max, gesture.dx));
          if (max > 0 && next > max * 0.86) {
            void Linking.openURL("tel:911");
          }
          const resetAnimation = reducedMotion
            ? Animated.timing(x, {
                toValue: 0,
                duration: 0,
                useNativeDriver: false,
              })
            : Animated.spring(x, {
                toValue: 0,
                useNativeDriver: false,
              });
          resetAnimation.start();
        },
      }),
    [max, reducedMotion, x],
  );

  const trackBackgroundColor = x.interpolate({
    inputRange: [0, Math.max(max, 1)],
    outputRange: [mutedColor, dangerColor],
  });

  return (
    <Animated.View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      className="h-12 justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: trackBackgroundColor }}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Slide to call 911"
      accessibilityHint="Swipe the phone control to the right, or activate to call"
      accessibilityActions={[{ name: "activate", label: "Call 911" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") {
          void Linking.openURL("tel:911");
        }
      }}
    >
      <Text className="self-center text-xs font-bold text-foreground">
        {">>> Slide to call"}
      </Text>
      <Animated.View
        {...panResponder.panHandlers}
        className="absolute left-1 h-10 w-12 items-center justify-center rounded-full"
        style={{
          backgroundColor: surfaceColor,
          transform: [{ translateX: x }],
        }}
      >
        <Phone size={17} color={foregroundColor} />
      </Animated.View>
    </Animated.View>
  );
}

function AgencyCard({ agency }: { agency: HotlineAgency }) {
  const call = (number: string) => Linking.openURL(`tel:${digits(number)}`);
  const copy = (number: string) => Clipboard.setStringAsync(number);
  const contactGroups = [
    "Hotline/Emergency",
    "Other service contacts",
  ] as const;

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-start gap-3">
        <Avatar accessibilityLabel={agency.name}>
          {agency.logoUrl ? (
            <AvatarImage source={{ uri: agency.logoUrl }} />
          ) : null}
          {!agency.logoUrl ? (
            <AvatarFallbackText className="font-bold text-primary">
              {initials(agency.name)}
            </AvatarFallbackText>
          ) : null}
        </Avatar>
        <View className="flex-1">
          <Heading size="sm">{agency.name}</Heading>
          {agency.description || agency.address ? (
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {agency.description || agency.address}
            </Text>
          ) : null}
        </View>
        {agency.websiteLink ? (
          <Button
            size="icon"
            variant="ghost"
            className="min-h-11 min-w-11 rounded-full"
            onPress={() => Linking.openURL(agency.websiteLink!)}
            accessibilityLabel={`Open ${agency.name} website`}
          >
            <ButtonIcon as={Globe2} height={18} width={18} />
          </Button>
        ) : null}
      </View>

      <View className="mt-4 gap-2">
        {agency.contacts.length ? (
          contactGroups.map((group) => {
            const contacts = agency.contacts.filter(
              (contact) => contact.group === group,
            );
            if (!contacts.length) return null;
            return (
              <View key={group} className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {group}
                </Text>
                {contacts.map((contact) => (
                  <View
                    key={contact.id}
                    className="min-h-12 flex-row items-center gap-2 rounded-full bg-secondary px-3"
                  >
                    <Text className="text-xs font-bold text-foreground">
                      {contactLabel(contact)}:
                    </Text>
                    <Text className="flex-1 text-xs text-foreground">
                      {contact.number}
                    </Text>
                    <Button
                      size="icon"
                      className="min-h-11 min-w-11 rounded-full"
                      onPress={() => call(contact.number)}
                      accessibilityLabel={`Call ${contact.number}`}
                    >
                      <ButtonIcon as={Phone} height={15} width={15} />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="min-h-11 min-w-11 rounded-full"
                      onPress={() => copy(contact.number)}
                      accessibilityLabel={`Copy ${contact.number}`}
                    >
                      <ButtonIcon as={Copy} height={15} width={15} />
                    </Button>
                  </View>
                ))}
              </View>
            );
          })
        ) : (
          <Text className="text-xs text-muted-foreground">
            No active public contact numbers listed.
          </Text>
        )}
      </View>
    </View>
  );
}

function CategoryCard({
  category,
  onPress,
}: {
  category: HotlineCategory;
  onPress: (trigger: View) => void;
}) {
  const triggerRef = useRef<View>(null);
  const visual = visualFor(category.name);
  const Icon = visual.icon;
  const [
    accentColor,
    dangerColor,
    foregroundColor,
    successColor,
    warningColor,
  ] = useAppColors(["accent", "danger", "foreground", "success", "warning"]);
  const iconColor = {
    accent: accentColor,
    danger: dangerColor,
    foreground: foregroundColor,
    success: successColor,
    warning: warningColor,
  }[visual.tone];

  return (
    <View ref={triggerRef} collapsable={false} className="flex-1">
      <Pressable
        onPress={() => {
          if (triggerRef.current) onPress(triggerRef.current);
        }}
        accessibilityRole="button"
        className="min-h-[116px] flex-1 gap-3 rounded-lg border border-border bg-card p-4"
      >
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${visual.softClassName}`}
        >
          <Icon size={20} color={iconColor} />
        </View>
        <View className="flex-1 justify-end">
          <Text className="text-sm font-bold text-foreground" numberOfLines={3}>
            {category.name}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {category.agencies.length}{" "}
            {category.agencies.length === 1 ? "agency" : "agencies"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function HotlineResults({
  categories,
  query,
}: {
  categories: HotlineCategory[];
  query: string;
}) {
  const matches = categories.flatMap((category) =>
    category.agencies
      .filter((agency) => agencyMatches(agency, category.name, query))
      .map((agency) => ({ agency, category })),
  );

  if (!query) return null;

  return (
    <View className="gap-2">
      <Text className="ml-2 text-sm font-semibold text-muted-foreground">
        Matches
      </Text>
      {matches.length ? (
        matches.map(({ agency }) => (
          <AgencyCard key={agency.id} agency={agency} />
        ))
      ) : (
        <View className="rounded-lg border border-border bg-card p-5">
          <Text className="text-sm text-muted-foreground">
            No contacts match your search.
          </Text>
        </View>
      )}
    </View>
  );
}

function HotlineSkeleton() {
  return (
    <View className="gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-44 rounded-xl" />
      <View className="flex-row gap-3">
        <Skeleton className="h-24 flex-1 rounded-xl" />
        <Skeleton className="h-24 flex-1 rounded-xl" />
      </View>
    </View>
  );
}
function HotlineSheetHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <View className="flex-row items-start gap-3 border-b border-border/80 pb-4">
      <View className="min-w-0 flex-1 gap-1">
        <Heading size="lg">{title}</Heading>

        <Text className="text-sm leading-5 text-muted-foreground">
          {description}
        </Text>
      </View>

      <Button
        size="icon"
        variant="ghost"
        className="min-h-11 min-w-11 shrink-0 rounded-full"
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Close ${title.toLowerCase()}`}
      >
        <ButtonIcon as={X} height={18} width={18} />
      </Button>
    </View>
  );
}
export default function HotlinesRoute() {
  const router = useRouter();
  const { session } = useAuthSession();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor, destructiveColor] = useAppColors([
    "accent",
    "destructive",
  ]);
  const unreadCount = useUnreadNotificationCount();
  const categorySheetRef = useRef<BottomSheetRef>(null);
  const allSheetRef = useRef<BottomSheetRef>(null);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isAllSheetOpen, setIsAllSheetOpen] = useState(false);
  const categoryTriggerRef = useRef<View | null>(null);
  const [categories, setCategories] = useState<HotlineCategory[]>([]);
  const [query, setQuery] = useState("");
  const [sheetQuery, setSheetQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUsingSavedData, setIsUsingSavedData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const loadHotlines = useCallback(async (options?: { force?: boolean }) => {
    if (options?.force) setIsRefreshing(true);
    try {
      const data = await fetchHotlines(options);
      setCategories(data.categories);
      setIsUsingSavedData(data.isStale === true);
      setActiveCategoryId((current) =>
        data.categories.some((category) => category.id === current)
          ? current
          : (data.categories[0]?.id ?? null),
      );
      setLoadError(null);
    } catch {
      setLoadError(
        "Hotline contacts could not be loaded. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHotlines({ force: true });
    }, [loadHotlines]),
  );

  const aleco = categories
    .flatMap((category) => category.agencies)
    .find((agency) => /albay electric|aleco/i.test(agency.name));

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? null;
  const activeCategory = activeCategoryId
    ? (categories.find((category) => category.id === activeCategoryId) ?? null)
    : null;
  const categoryAgencies = selectedCategory
    ? selectedCategory.agencies.filter((agency) =>
        agencyMatches(agency, selectedCategory.name, sheetQuery),
      )
    : [];
  const isAllCategories = activeCategoryId === null;
  const activeAgencies = activeCategory
    ? activeCategory.agencies.filter((agency) =>
        agencyMatches(agency, activeCategory.name, sheetQuery),
      )
    : [];
  const filteredCategoryGroups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          agencies: category.agencies.filter((agency) =>
            agencyMatches(agency, category.name, sheetQuery),
          ),
        }))
        .filter(({ agencies }) => agencies.length > 0),
    [categories, sheetQuery],
  );
  const categoryRows = useMemo(() => rowsOf(categories, 2), [categories]);

  const openCategory = (category: HotlineCategory, trigger: View) => {
    categoryTriggerRef.current = trigger;
    setSelectedCategoryId(category.id);
    setSheetQuery("");
    setIsCategorySheetOpen(true);
  };

  const openAll = () => {
    setActiveCategoryId(null);
    setSheetQuery("");
    setIsAllSheetOpen(true);
  };
  useEffect(() => {
    if (!isCategorySheetOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      categorySheetRef.current?.open();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isCategorySheetOpen]);

  useEffect(() => {
    if (!isAllSheetOpen) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      allSheetRef.current?.open();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isAllSheetOpen]);

  const handleCategorySheetClosed = useCallback(() => {
    setIsCategorySheetOpen(false);
    setSheetQuery("");

    const trigger = findNodeHandle(categoryTriggerRef.current);

    if (trigger != null) {
      requestAnimationFrame(() => {
        AccessibilityInfo.setAccessibilityFocus(trigger);
      });
    }
  }, []);
  const closeCategorySheet = useCallback(() => {
    handleCategorySheetClosed();
  }, [handleCategorySheetClosed]);

  const closeAllSheet = useCallback(() => {
    setIsAllSheetOpen(false);
    setSheetQuery("");
  }, []);

  return (
    <View className="flex-1 bg-background" style={{ width }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: statusBarHeight + 22,
          gap: 16,
          paddingBottom: bottomPadding,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadHotlines({ force: true })}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        <View className="flex-row items-start justify-between">
          <Heading size="2xl">Hotlines</Heading>
          <Button
            size="icon"
            variant="secondary"
            className="min-h-11 min-w-11 rounded-full"
            accessibilityLabel="Notifications"
            onPress={() => router.push(session ? "/notifications" : "/sign-in")}
          >
            <ButtonIcon as={Bell} height={20} width={20} />
            {unreadCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1">
                <Text className="text-xs font-bold text-danger-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Button>
        </View>

        <SearchField
          accessibilityLabel="Search hotlines"
          onChangeText={setQuery}
          onClear={() => setQuery("")}
          placeholder="Search number, agency, category"
          value={query}
        />

        {isLoading ? <HotlineSkeleton /> : null}

        {!isLoading ? (
          <>
            {!query ? (
              <View className="rounded-lg border border-border bg-card p-4">
                <View className="flex-row items-center gap-2">
                  <Siren size={21} color={destructiveColor} />
                  <Heading size="md">Call 911</Heading>
                </View>
                <Text className="mt-1 text-xs text-foreground">
                  Use for life-threatening situations only.
                </Text>
                <View className="mt-3">
                  <EmergencySlider />
                </View>
              </View>
            ) : null}

            {loadError ? (
              <Alert variant="destructive" className="items-center p-4">
                <View className="flex-1 gap-1">
                  <AlertText className="font-bold">
                    Directory unavailable
                  </AlertText>
                  <AlertText>{loadError}</AlertText>
                </View>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => void loadHotlines({ force: true })}
                >
                  <ButtonText>Retry</ButtonText>
                </Button>
              </Alert>
            ) : null}

            {isUsingSavedData ? (
              <Alert className="p-4">
                <View className="gap-1">
                  <AlertText className="font-bold">
                    Showing saved hotline data
                  </AlertText>
                  <AlertText>
                    Pull down to check for newer contacts when online.
                  </AlertText>
                </View>
              </Alert>
            ) : null}

            {!query && aleco ? <AgencyCard agency={aleco} /> : null}

            <HotlineResults categories={categories} query={query} />

            {!query && categories.length ? (
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="ml-2 text-sm font-semibold text-muted-foreground">
                    Categories
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11"
                    onPress={openAll}
                  >
                    <ButtonText>View all</ButtonText>
                    <ButtonIcon as={ChevronRight} height={15} width={15} />
                  </Button>
                </View>
                {categoryRows.map((row) => (
                  <View
                    key={row.map((category) => category.id).join("-")}
                    className="flex-row gap-3"
                  >
                    {row.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onPress={(trigger) => openCategory(category, trigger)}
                      />
                    ))}
                    {row.length === 1 ? <View className="flex-1" /> : null}
                  </View>
                ))}
              </View>
            ) : !query && !loadError ? (
              <Alert className="p-4">
                <AlertText>
                  No hotline contacts are available right now.
                </AlertText>
              </Alert>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {isCategorySheetOpen ? (
        <BottomSheet ref={categorySheetRef} onClose={handleCategorySheetClosed}>
          <BottomSheetPortal
            enableDynamicSizing
            maxDynamicContentSize={height * 0.75}
            enablePanDownToClose={false}
            keyboardBehavior="interactive"
            backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              <HotlineSheetHeader
                title={selectedCategory?.name ?? "Hotlines"}
                description={
                  selectedCategory?.description ??
                  "Search contacts in this category."
                }
                onClose={closeCategorySheet}
              />

              <SheetSearchInput
                value={sheetQuery}
                onChangeText={setSheetQuery}
                placeholder="Search this category"
              />

              {categoryAgencies.length ? (
                categoryAgencies.map((agency) => (
                  <AgencyCard key={agency.id} agency={agency} />
                ))
              ) : (
                <View className="rounded-lg border border-border bg-card p-5">
                  <Text className="text-sm text-muted-foreground">
                    No hotline contacts found.
                  </Text>
                </View>
              )}
            </BottomSheetScrollView>
          </BottomSheetPortal>
        </BottomSheet>
      ) : null}

      {isAllSheetOpen ? (
        <BottomSheet ref={allSheetRef} onClose={closeAllSheet}>
          <BottomSheetPortal
            enableDynamicSizing
            enablePanDownToClose={false}
            keyboardBehavior="interactive"
            backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
          >
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={{
                gap: 16,
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 20),
              }}
            >
              <HotlineSheetHeader
                title="All hotlines"
                description="Find the right hotline for your concern."
                onClose={closeAllSheet}
              />

              <View className="gap-3">
                <SheetSearchInput
                  value={sheetQuery}
                  onChangeText={setSheetQuery}
                  placeholder="Search all contacts"
                />

                <GestureScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 8 }}
                >
                  <Pressable
                    onPress={() => setActiveCategoryId(null)}
                    className={`min-h-11 justify-center rounded-full px-4 ${
                      isAllCategories ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isAllCategories
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                    >
                      All
                    </Text>
                  </Pressable>

                  {categories.map((category) => {
                    const active = activeCategoryId === category.id;

                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => setActiveCategoryId(category.id)}
                        className={`min-h-11 justify-center rounded-full px-4 ${
                          active ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            active
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {category.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </GestureScrollView>
              </View>

              {isAllCategories ? (
                filteredCategoryGroups.length ? (
                  filteredCategoryGroups.map(
                    ({ category, agencies }, index) => (
                      <View key={category.id} className="gap-3">
                        {index > 0 ? <Divider className="my-1" /> : null}

                        <View className="gap-0.5">
                          <Text className="text-sm font-bold text-foreground">
                            {category.name}
                          </Text>

                          {category.description ? (
                            <Text className="text-xs leading-5 text-muted-foreground">
                              {category.description}
                            </Text>
                          ) : null}
                        </View>

                        <View className="gap-3">
                          {agencies.map((agency) => (
                            <AgencyCard key={agency.id} agency={agency} />
                          ))}
                        </View>
                      </View>
                    ),
                  )
                ) : (
                  <View className="rounded-lg border border-border bg-card p-5">
                    <Text className="text-sm text-muted-foreground">
                      No hotline contacts found.
                    </Text>
                  </View>
                )
              ) : activeAgencies.length ? (
                activeAgencies.map((agency) => (
                  <AgencyCard key={agency.id} agency={agency} />
                ))
              ) : (
                <View className="rounded-lg border border-border bg-card p-5">
                  <Text className="text-sm text-muted-foreground">
                    No hotline contacts found.
                  </Text>
                </View>
              )}
            </BottomSheetScrollView>
          </BottomSheetPortal>
        </BottomSheet>
      ) : null}
    </View>
  );
}
