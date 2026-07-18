import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  BottomSheet,
  BottomSheetBackdrop,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetPortal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetRef,
} from "@/components/ui/bottomsheet";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { statusBarHeight } from "@/constants";
import { useAppColors } from "@/hooks/use-app-colors";
import {
  fetchHotlines,
  type HotlineAgency,
  type HotlineCategory,
  type HotlineContact,
} from "@/services/hotlines";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
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
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Linking,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CategoryVisual = {
  icon: LucideIcon;
  color: string;
  soft: string;
};

const fallbackCategories: HotlineCategory[] = [
  {
    id: "electricity",
    name: "Electricity",
    description: "Power interruption, electrical hazards, and ALECO support.",
    agencies: [
      {
        id: "aleco",
        categoryId: "electricity",
        name: "Albay Electric Cooperative Inc.",
        description: "Main Branch",
        address: "Albay",
        logoUrl: null,
        websiteLink: "https://web.alecoinc.com.ph/",
        contacts: [
          { id: "globe", number: "09123456789", label: "Globe", type: "mobile" },
          { id: "smart", number: "09876543210", label: "Smart", type: "mobile" },
        ],
      },
    ],
  },
  { id: "medical", name: "Medical", description: null, agencies: [] },
  { id: "drrmo", name: "DRRMO", description: null, agencies: [] },
  { id: "public-safety", name: "Public Safety", description: null, agencies: [] },
  { id: "fire-rescue", name: "Fire & Rescue", description: null, agencies: [] },
  { id: "water", name: "Water Supply", description: null, agencies: [] },
];

const visuals: [RegExp, CategoryVisual][] = [
  [/electric|power|aleco/i, { icon: Zap, color: "#0ea5e9", soft: "#e0f2fe" }],
  [/medical|health|hospital/i, { icon: Plus, color: "#ef4444", soft: "#fee2e2" }],
  [/fire|rescue/i, { icon: Flame, color: "#f97316", soft: "#ffedd5" }],
  [/water/i, { icon: Droplet, color: "#0284c7", soft: "#e0f2fe" }],
  [/safety|police|public/i, { icon: Shield, color: "#2563eb", soft: "#dbeafe" }],
  [/drrmo|disaster|risk/i, { icon: Building2, color: "#d97706", soft: "#fef3c7" }],
];

function rowsOf<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
      color: "#64748b",
      soft: "#f1f5f9",
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
      agency.contacts.map((contact) => `${contact.number} ${contact.label ?? ""} ${contact.type ?? ""}`).join(" "),
    ].join(" "),
  );
}

function agencyMatches(agency: HotlineAgency, categoryName: string, query: string) {
  const textQuery = normalize(query);
  const digitQuery = digits(query);
  if (!textQuery && !digitQuery) return true;
  return (
    agencySearchText(agency, categoryName).includes(textQuery) ||
    Boolean(digitQuery && agency.contacts.some((contact) => digits(contact.number).includes(digitQuery)))
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
          <Search size={17} color="#737373" />
        </View>
        {value ? (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1"
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
          Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        },
      }),
    [max, x],
  );

  const backgroundColor = x.interpolate({
    inputRange: [0, Math.max(max, 1)],
    outputRange: ["#e5e5e5", "#ef4444"],
  });

  return (
    <Animated.View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      className="h-12 justify-center overflow-hidden rounded-full"
      style={{ backgroundColor }}
    >
      <Text className="self-center text-xs font-bold text-muted-foreground">
        {">>> Slide to call"}
      </Text>
      <Animated.View
        {...panResponder.panHandlers}
        className="absolute left-1 h-10 w-12 items-center justify-center rounded-full bg-white"
        style={{ transform: [{ translateX: x }] }}
      >
        <Phone size={17} color="#111827" />
      </Animated.View>
    </Animated.View>
  );
}

function AgencyCard({ agency }: { agency: HotlineAgency }) {
  const call = (number: string) => Linking.openURL(`tel:${digits(number)}`);
  const copy = (number: string) => Clipboard.setStringAsync(number);

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <View className="flex-row items-start gap-3">
        <Avatar accessibilityLabel={agency.name}>
          {agency.logoUrl ? <AvatarImage source={{ uri: agency.logoUrl }} /> : null}
          {!agency.logoUrl ? (
            <AvatarFallbackText className="font-bold text-primary">
                {initials(agency.name)}
            </AvatarFallbackText>
          ) : null}
        </Avatar>
        <View className="flex-1">
          <Heading size="sm">
            {agency.name}
          </Heading>
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
            onPress={() => Linking.openURL(agency.websiteLink!)}
            accessibilityLabel={`Open ${agency.name} website`}
          >
            <ButtonIcon as={Globe2} height={18} width={18} />
          </Button>
        ) : null}
      </View>

      <View className="mt-4 gap-2">
        {agency.contacts.length ? (
          agency.contacts.map((contact) => (
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
                onPress={() => call(contact.number)}
                accessibilityLabel={`Call ${contact.number}`}
              >
                <ButtonIcon as={Phone} height={15} width={15} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onPress={() => copy(contact.number)}
                accessibilityLabel={`Copy ${contact.number}`}
              >
                <ButtonIcon as={Copy} height={15} width={15} />
              </Button>
            </View>
          ))
        ) : (
          <Text className="text-xs text-muted-foreground">
            No hotline numbers listed.
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
  onPress: () => void;
}) {
  const visual = visualFor(category.name);
  const Icon = visual.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-[86px] flex-1 flex-row items-center gap-3 rounded-lg border border-border bg-card p-4"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-2xl"
        style={{ backgroundColor: visual.soft }}
      >
        <Icon size={20} color={visual.color} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground" numberOfLines={2}>
          {category.name}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">
          {category.agencies.length} {category.agencies.length === 1 ? "agency" : "agencies"}
        </Text>
      </View>
    </Pressable>
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
        matches.map(({ agency }) => <AgencyCard key={agency.id} agency={agency} />)
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
      <Skeleton className="h-28 rounded-[24px]" />
      <Skeleton className="h-44 rounded-[24px]" />
      <View className="flex-row gap-3">
        <Skeleton className="h-24 flex-1 rounded-[22px]" />
        <Skeleton className="h-24 flex-1 rounded-[22px]" />
      </View>
    </View>
  );
}

export default function HotlinesRoute() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const bottomPadding = appScrollableBottomPadding(insets.bottom);
  const [accentColor] = useAppColors(["accent"]);
  const categorySheetRef = useRef<BottomSheetRef>(null);
  const allSheetRef = useRef<BottomSheetRef>(null);
  const [categories, setCategories] = useState<HotlineCategory[]>(fallbackCategories);
  const [query, setQuery] = useState("");
  const [sheetQuery, setSheetQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const loadHotlines = useCallback(async (options?: { force?: boolean }) => {
    if (options?.force) setIsRefreshing(true);
    try {
      const data = await fetchHotlines(options);
      if (data.categories.length) {
        setCategories(data.categories);
        setActiveCategoryId((current) => current ?? data.categories[0]?.id ?? null);
      }
    } catch {
      setCategories((current) => (current.length ? current : fallbackCategories));
      setActiveCategoryId((current) => current ?? fallbackCategories[0]?.id ?? null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHotlines();
    }, [loadHotlines]),
  );

  const aleco =
    categories
      .flatMap((category) => category.agencies)
      .find((agency) => /albay electric|aleco/i.test(agency.name)) ??
    fallbackCategories[0].agencies[0];

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const categoryAgencies = selectedCategory
    ? selectedCategory.agencies.filter((agency) =>
        agencyMatches(agency, selectedCategory.name, sheetQuery),
      )
    : [];
  const activeAgencies = activeCategory
    ? activeCategory.agencies.filter((agency) =>
        agencyMatches(agency, activeCategory.name, sheetQuery),
      )
    : [];
  const categorySnapHeight = Math.min(
    height * 0.86,
    Math.max(360, 190 + Math.min(categoryAgencies.length || 1, 3) * 150),
  );
  const categoryRows = useMemo(() => rowsOf(categories, 2), [categories]);

  const openCategory = (category: HotlineCategory) => {
    setSelectedCategoryId(category.id);
    setSheetQuery("");
    requestAnimationFrame(() => categorySheetRef.current?.open());
  };

  const openAll = () => {
    setActiveCategoryId((current) => current ?? categories[0]?.id ?? null);
    setSheetQuery("");
    requestAnimationFrame(() => allSheetRef.current?.open());
  };

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
          <Heading size="2xl">
            Hotlines
          </Heading>
          <Button size="icon" variant="secondary" accessibilityLabel="Notifications">
            <ButtonIcon as={Bell} height={20} width={20} />
            <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-destructive" />
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
            <View className="rounded-lg border border-border bg-card p-4">
              <View className="flex-row items-center gap-2">
                <Siren size={21} color="#111827" />
                <Heading size="md">
                  Call 911
                </Heading>
              </View>
              <Text className="mt-1 text-xs text-foreground">
                Use for life-threatening situations only.
              </Text>
              <View className="mt-3">
                <EmergencySlider />
              </View>
            </View>

            <AgencyCard agency={aleco} />

            <HotlineResults categories={categories} query={query} />

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="ml-2 text-sm font-semibold text-muted-foreground">
                  Categories
                </Text>
                <Button variant="ghost" size="sm" onPress={openAll}>
                  <ButtonText>View all</ButtonText>
                  <ButtonIcon as={ChevronRight} height={15} width={15} />
                </Button>
              </View>
              {categoryRows.map((row) => (
                <View key={row.map((category) => category.id).join("-")} className="flex-row gap-3">
                  {row.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onPress={() => openCategory(category)}
                    />
                  ))}
                  {row.length === 1 ? <View className="flex-1" /> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomSheet ref={categorySheetRef} onClose={() => setSheetQuery("")}>
        <BottomSheetPortal
          snapPoints={[categorySnapHeight]}
          enableDynamicSizing={false}
          enableOverDrag={false}
          backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
        >
          <BottomSheetContent className="h-full">
            <BottomSheetHeader
              title={selectedCategory?.name ?? "Hotlines"}
              description={selectedCategory?.description ?? "Search contacts in this category."}
              closeAccessibilityLabel="Close hotlines"
            />
            <View>
              <SheetSearchInput
                value={sheetQuery}
                onChangeText={setSheetQuery}
                placeholder="Search this category"
              />
            </View>
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            >
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
          </BottomSheetContent>
        </BottomSheetPortal>
      </BottomSheet>

      <BottomSheet ref={allSheetRef} onClose={() => setSheetQuery("")}>
        <BottomSheetPortal
          snapPoints={["92%"]}
          enableDynamicSizing={false}
          enableOverDrag={false}
          backdropComponent={(props) => <BottomSheetBackdrop {...props} />}
        >
          <BottomSheetContent className="h-full">
            <BottomSheetHeader
              title="All hotlines"
              description="Browse agencies by category."
              closeAccessibilityLabel="Close all hotlines"
            />
            <View className="gap-3">
              <SheetSearchInput
                value={sheetQuery}
                onChangeText={setSheetQuery}
                placeholder="Search all contacts"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8 }}
              >
                {categories.map((category) => {
                  const active = activeCategory?.id === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setActiveCategoryId(category.id)}
                      className={`min-h-10 justify-center rounded-full px-4 ${
                        active ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <Text className={`text-xs font-bold ${active ? "text-primary-foreground" : "text-foreground"}`}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <BottomSheetScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            >
              {activeAgencies.length ? (
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
          </BottomSheetContent>
        </BottomSheetPortal>
      </BottomSheet>
    </View>
  );
}
