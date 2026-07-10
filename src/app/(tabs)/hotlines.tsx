import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { statusBarHeight } from "@/constants";
import {
  fetchHotlines,
  type HotlineAgency,
  type HotlineCategory,
  type HotlineContact,
} from "@/services/hotlines";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import {
  Avatar,
  BottomSheet,
  Button,
  Input,
  Label,
  Skeleton,
  Surface,
  TextField,
  Typography,
  useBottomSheetAwareHandlers,
  useThemeColor,
} from "heroui-native";
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
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <TextField>
      <View className="flex-row items-center">
        <Input
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          variant="secondary"
          className="flex-1 px-10"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <View className="absolute left-3" pointerEvents="none">
          <Search size={17} color="#737373" />
        </View>
        {value ? (
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="absolute right-1"
            onPress={() => onChangeText("")}
            accessibilityLabel="Clear search"
          >
            <X size={16} color="#737373" />
          </Button>
        ) : null}
      </View>
    </TextField>
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
      <Typography type="body-xs" weight="bold" className="self-center text-muted">
        {">>> Slide to call"}
      </Typography>
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
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);

  const call = (number: string) => Linking.openURL(`tel:${digits(number)}`);
  const copy = (number: string) => Clipboard.setStringAsync(number);

  return (
    <Surface className="rounded-[24px] p-4">
      <View className="flex-row items-start gap-3">
        <Avatar size="md" alt={agency.name}>
          {agency.logoUrl ? <Avatar.Image source={{ uri: agency.logoUrl }} /> : null}
          {!agency.logoUrl ? (
            <Avatar.Fallback>
              <Typography type="body-xs" weight="bold" className="text-accent">
                {initials(agency.name)}
              </Typography>
            </Avatar.Fallback>
          ) : null}
        </Avatar>
        <View className="flex-1">
          <Typography.Heading type="h6" weight="bold">
            {agency.name}
          </Typography.Heading>
          {agency.description || agency.address ? (
            <Typography.Paragraph type="body-xs" color="muted" className="mt-0.5">
              {agency.description || agency.address}
            </Typography.Paragraph>
          ) : null}
        </View>
        {agency.websiteLink ? (
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => Linking.openURL(agency.websiteLink!)}
            accessibilityLabel={`Open ${agency.name} website`}
          >
            <Globe2 size={18} color={mutedColor} />
          </Button>
        ) : null}
      </View>

      <View className="mt-4 gap-2">
        {agency.contacts.length ? (
          agency.contacts.map((contact) => (
            <View
              key={contact.id}
              className="min-h-12 flex-row items-center gap-2 rounded-full bg-surface-secondary px-3"
            >
              <Typography type="body-xs" weight="bold">
                {contactLabel(contact)}:
              </Typography>
              <Typography type="body-xs" className="flex-1">
                {contact.number}
              </Typography>
              <Button
                isIconOnly
                size="sm"
                variant="primary"
                onPress={() => call(contact.number)}
                accessibilityLabel={`Call ${contact.number}`}
              >
                <Phone size={15} color="white" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="secondary"
                onPress={() => copy(contact.number)}
                accessibilityLabel={`Copy ${contact.number}`}
              >
                <Copy size={15} color={accentColor} />
              </Button>
            </View>
          ))
        ) : (
          <Typography.Paragraph type="body-xs" color="muted">
            No hotline numbers listed.
          </Typography.Paragraph>
        )}
      </View>
    </Surface>
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
      className="min-h-[86px] flex-1 flex-row items-center gap-3 rounded-[22px] border border-border bg-surface p-4"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-2xl"
        style={{ backgroundColor: visual.soft }}
      >
        <Icon size={20} color={visual.color} />
      </View>
      <View className="flex-1">
        <Typography type="body-sm" weight="bold" numberOfLines={2}>
          {category.name}
        </Typography>
        <Typography type="body-xs" color="muted" className="mt-0.5">
          {category.agencies.length} {category.agencies.length === 1 ? "agency" : "agencies"}
        </Typography>
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
      <Label className="ml-2 text-sm font-semibold text-muted">
        Matches
      </Label>
      {matches.length ? (
        matches.map(({ agency }) => <AgencyCard key={agency.id} agency={agency} />)
      ) : (
        <Surface className="rounded-[22px] p-5">
          <Typography.Paragraph type="body-sm" color="muted">
            No contacts match your search.
          </Typography.Paragraph>
        </Surface>
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
  const [accentColor, foregroundColor] = useThemeColor(["accent", "foreground"]);
  const [categories, setCategories] = useState<HotlineCategory[]>(fallbackCategories);
  const [query, setQuery] = useState("");
  const [sheetQuery, setSheetQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isAllSheetOpen, setIsAllSheetOpen] = useState(false);
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
    setIsCategorySheetOpen(true);
  };

  const openAll = () => {
    setActiveCategoryId((current) => current ?? categories[0]?.id ?? null);
    setSheetQuery("");
    setIsAllSheetOpen(true);
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
          <Typography.Heading type="h1" weight="bold">
            Hotlines
          </Typography.Heading>
          <Button isIconOnly variant="secondary" accessibilityLabel="Notifications">
            <Bell size={20} color={foregroundColor} />
            <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger" />
          </Button>
        </View>

        <TextField>
          <View className="flex-row items-center">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search number, agency, category"
              variant="secondary"
              className="flex-1 px-10"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View className="absolute left-3" pointerEvents="none">
              <Search size={17} color="#737373" />
            </View>
            {query ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="absolute right-1"
                onPress={() => setQuery("")}
                accessibilityLabel="Clear search"
              >
                <X size={16} color="#737373" />
              </Button>
            ) : null}
          </View>
        </TextField>

        {isLoading ? <HotlineSkeleton /> : null}

        {!isLoading ? (
          <>
            <Surface className="rounded-[24px] p-4">
              <View className="flex-row items-center gap-2">
                <Siren size={21} color="#111827" />
                <Typography.Heading type="h5" weight="bold">
                  Call 911
                </Typography.Heading>
              </View>
              <Typography.Paragraph type="body-xs" className="mt-1">
                Use for life-threatening situations only.
              </Typography.Paragraph>
              <View className="mt-3">
                <EmergencySlider />
              </View>
            </Surface>

            <AgencyCard agency={aleco} />

            <HotlineResults categories={categories} query={query} />

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Label className="ml-2 text-sm font-semibold text-muted">
                  Categories
                </Label>
                <Button variant="ghost" size="sm" onPress={openAll}>
                  <Button.Label>View all</Button.Label>
                  <ChevronRight size={15} color={accentColor} />
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

      <BottomSheet isOpen={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={[categorySnapHeight]}
            enableDynamicSizing={false}
            enableOverDrag={false}
            contentContainerClassName="h-full"
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <BottomSheet.Title>{selectedCategory?.name ?? "Hotlines"}</BottomSheet.Title>
                <BottomSheet.Description>
                  {selectedCategory?.description ?? "Search contacts in this category."}
                </BottomSheet.Description>
              </View>
              <Button
                isIconOnly
                size="sm"
                variant="secondary"
                onPress={() => setIsCategorySheetOpen(false)}
                accessibilityLabel="Close hotlines"
              >
                <X size={16} color="#737373" />
              </Button>
            </View>
            <View className="mt-4">
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
                <Surface className="rounded-[22px] p-5">
                  <Typography.Paragraph type="body-sm" color="muted">
                    No hotline contacts found.
                  </Typography.Paragraph>
                </Surface>
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      <BottomSheet isOpen={isAllSheetOpen} onOpenChange={setIsAllSheetOpen}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={["92%"]}
            enableDynamicSizing={false}
            enableOverDrag={false}
            contentContainerClassName="h-full"
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <BottomSheet.Title>All hotlines</BottomSheet.Title>
                <BottomSheet.Description>
                  Browse agencies by category.
                </BottomSheet.Description>
              </View>
              <Button
                isIconOnly
                size="sm"
                variant="secondary"
                onPress={() => setIsAllSheetOpen(false)}
                accessibilityLabel="Close all hotlines"
              >
                <X size={16} color="#737373" />
              </Button>
            </View>
            <View className="mt-4 gap-3">
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
                        active ? "bg-accent" : "bg-surface-secondary"
                      }`}
                    >
                      <Typography
                        type="body-xs"
                        weight="bold"
                        className={active ? "text-white" : "text-foreground"}
                      >
                        {category.name}
                      </Typography>
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
                <Surface className="rounded-[22px] p-5">
                  <Typography.Paragraph type="body-sm" color="muted">
                    No hotline contacts found.
                  </Typography.Paragraph>
                </Surface>
              )}
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
