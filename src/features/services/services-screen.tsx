import { useGuestAccess } from "@/context/guest-access-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { ReportPage } from "@/features/reports/components/report-page";
import { SearchField } from "@/components/search-field";
import { Text } from "@/components/panelui/text";
import { openContact } from "@/features/hotlines/contact-card";
import { searchServices, serviceGroups } from "./catalog";
import { ServiceRow } from "./service-row";
export default function ServicesScreen() {
  const router = useRouter();
  const { guest, openFeature } = useGuestAccess();
  const [query, setQuery] = useState("");
  const rows = searchServices(query);
  return (
    <ReportPage
      title="Explore services"
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/home")
      }
    >
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search services"
      />
      {serviceGroups.map((group) => {
        const visible = group.services.filter((s) => rows.some((row) => row.id === s.id));
        return visible.length ? <View key={group.title} className="gap-2">
          <Text weight="semibold" size="sm">{group.title}</Text>
          {visible.map((s) => (
          <ServiceRow
            key={s.id}
            title={s.title}
            description={s.description}
            icon={s.icon}
            onPress={() => s.route.startsWith("https://") ? void openContact(s.route) : openFeature(s.route, true)}
          />
        ))}
      </View> : null; })}
      {guest ? <Text muted size="xs">Preview services as a guest. Sign in to create reports and manage your account.</Text> : null}
      {!rows.length ? (
        <Text muted size="sm">
          No matching services. Try a different search.
        </Text>
      ) : null}
    </ReportPage>
  );
}
