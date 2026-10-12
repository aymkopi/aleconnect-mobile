import { Linking, View, Image } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  Phone,
  Smartphone,
  Copy,
  Globe,
  ChevronRight,
} from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { toast } from "@/components/panelui/toast";
import { useAppColors } from "@/hooks/use-app-colors";
import { phoneUrl, websiteUrl } from "./contact-actions";
import type { HotlineAgency } from "@/services/hotlines";
export async function openContact(url: string | null) {
  if (!url) {
    toast.show({ variant: "destructive", label: "Contact unavailable" });
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    toast.show({
      variant: "destructive",
      label: "Could not open",
      description: "Try copying the contact number instead.",
    });
  }
}
export function ContactCard({
  agency,
  disableActions = false,
  onViewContacts,
}: {
  agency: HotlineAgency;
  disableActions?: boolean;
  onViewContacts?: () => void;
}) {
  const [primary, muted, buttonForeground] = useAppColors([
      "primary",
      "muted-foreground",
      "primary-foreground",
    ]),
    website = websiteUrl(agency.websiteLink);
  return (
    <View className="rounded-xl border border-border bg-card p-3 gap-2">
      <View className="flex-row gap-2 items-center">
        {agency.logoUrl ? (
          <Image
            source={{ uri: agency.logoUrl }}
            accessibilityLabel={agency.name + " logo"}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        ) : (
          <View
            className="bg-secondary rounded-full items-center justify-center"
            style={{ width: 40, height: 40 }}
          >
            <Text weight="semibold" className="text-primary">
              {agency.name[0] ?? "A"}
            </Text>
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text weight="semibold" size="base">
            {agency.name}
          </Text>
          {agency.description || agency.address ? (
            <Text muted size="xs" numberOfLines={2}>
              {agency.description ?? agency.address}
            </Text>
          ) : null}
        </View>
        {website ? (
          <Button
            size="icon"
            variant="ghost"
            style={{ width: 48, height: 48 }}
            accessibilityLabel={"Website for " + agency.name}
            disabled={disableActions}
            onPress={() => void openContact(website)}
          >
            <Globe size={18} color={primary} />
          </Button>
        ) : null}
      </View>
      {agency.contacts.map((contact) => {
        const mobile = /mobile|smart|globe/i.test(contact.type ?? ""),
          Icon = mobile ? Smartphone : Phone,
          url = phoneUrl(contact.number);
        return (
          <View
            key={contact.id}
            className="bg-secondary rounded-full flex-row items-center pl-3 pr-1 gap-2"
            style={{ minHeight: 56 }}
          >
            <Icon size={16} color={muted} />
            <View className="flex-1 py-1">
              <Text weight="medium" size="sm">
                {contact.number}
              </Text>
              <Text muted style={{ fontSize: 10, lineHeight: 14 }}>
                {[contact.label, contact.type].filter(Boolean).join(" · ") ||
                  contact.group}
              </Text>
            </View>
            <Button
              size="icon"
              disabled={disableActions || !url}
              style={{ width: 48, height: 48, borderRadius: 999 }}
              accessibilityLabel={"Open dialler for " + contact.number}
              onPress={() => void openContact(url)}
            >
              <Phone size={18} color={buttonForeground} />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={disableActions}
              style={{ width: 48, height: 48, borderRadius: 999 }}
              accessibilityLabel={"Copy " + contact.number}
              onPress={() =>
                void Clipboard.setStringAsync(contact.number)
                  .then(() => toast.show({ label: "Number copied" }))
                  .catch(() =>
                    toast.show({
                      variant: "destructive",
                      label: "Could not copy number",
                    }),
                  )
              }
            >
              <Copy size={16} color={muted} />
            </Button>
          </View>
        );
      })}
      {onViewContacts ? (
        <Button
          variant="ghost"
          fullWidth
          onPress={onViewContacts}
          endContent={<ChevronRight size={16} color={primary} />}
        >
          View ALECO contacts
        </Button>
      ) : null}
      {!agency.contacts.length ? (
        <Text muted size="xs">
          No contact numbers published.
        </Text>
      ) : null}
    </View>
  );
}
