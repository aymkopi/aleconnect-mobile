import { useState } from "react";
import { View, Linking } from "react-native";
import { type Href, useRouter } from "expo-router";
import {
  ChevronRight,
  FileText,
  Globe,
  LifeBuoy,
  ShieldCheck,
  MessageCircle,
  BookOpen,
  UserRound,
} from "lucide-react-native";
import Constants from "expo-constants";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAppColors } from "@/hooks/use-app-colors";
import { ProfileHeading, ProfileNotice } from "./profile-ui";
import { useGuestAccess } from "@/context/guest-access-context";
export function SupportScreen({ kind, returnToReport = false }: { kind: "help" | "about" | "privacy" | "terms"; returnToReport?: boolean }) {
  const { guest } = useGuestAccess();
  const router = useRouter(),
    [primary] = useAppColors(["primary"]),
    [error, setError] = useState("");
  const title = {
    help: "Help & support",
    about: "About ALEConnect",
    privacy: "Privacy information",
    terms: "Terms of use",
  }[kind];
  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setError("This link could not open. Try again or contact ALECO.");
    }
  }
  const row = (label: string, description: string, action: () => void, Icon = FileText) => (
    <Button
      fullWidth
      variant="outline"
      className="rounded-xl bg-card min-h-16 py-3 justify-start"
      labelClassName="flex-1"
      startContent={<Icon size={20} color={primary} />}
      endContent={<ChevronRight size={18} color={primary} />}
      onPress={action}
    >
      <View className="flex-1 gap-1">
        <Text size="sm" weight="semibold">
          {label}
        </Text>
        <Text size="xs" muted>
          {description}
        </Text>
      </View>
    </Button>
  );
  return (
    <ReportPage
      title={title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(returnToReport ? "/reports" : "/profile"))}
      footer={
        <Button variant="outline" onPress={() => returnToReport
          ? (router.canGoBack() ? router.back() : router.replace("/reports"))
          : router.dismissTo("/profile")}>
          {returnToReport ? "Back to report" : "Back to Account"}
        </Button>
      }
    >
      {kind === "about" ? (
        <>
          <ProfileHeading
            title="Closer to your service"
            description="ALEConnect helps ALECO consumers report service concerns, follow updates and find official contacts."
          />
          {row("Contact ALECO", "Consumer services and official channels", () =>
            router.push("/profile/help" as Href),
          )}
          {row("Terms of use", "Information about app terms", () =>
            router.push("/profile/terms" as Href),
          )}
          {row(
            "Privacy notice",
            "Read ALECO’s published statement",
            () => router.push("/profile/privacy" as Href),
            ShieldCheck,
          )}
          <Text size="xs" muted>
            ALEConnect version {Constants.expoConfig?.extra?.releaseVersion ?? Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </>
      ) : kind === "privacy" ? (
        <>
          <ProfileHeading
            title="ALECO’s privacy statement"
            description="Read ALECO’s published statement on how it collects, uses and protects consumer information."
          />
          {row(
            "Open the official statement",
            "web.alecoinc.com.ph",
            () => void open("https://web.alecoinc.com.ph/data-privacy.html"),
            ShieldCheck,
          )}
          {row(
            "Ask about your information",
            "Contact ALECO",
            () => router.push("/profile/help" as Href),
            LifeBuoy,
          )}
        </>
      ) : kind === "terms" ? (
        <>
          <ProfileHeading title="App terms of use" />
          <ProfileNotice
            title="Contact ALECO for approved terms"
            description="ALEConnect-specific terms have not been supplied for this app. ALECO consumer services can provide the applicable approved documents."
          />
          {row(
            "Contact consumer services",
            "Ask about account and service terms",
            () => router.push("/profile/help" as Href),
            LifeBuoy,
          )}
          {row(
            "ALECO website",
            "Official service and membership information",
            () => void open("https://web.alecoinc.com.ph/"),
            Globe,
          )}
        </>
      ) : (
        <>
          <ProfileHeading
            title="How can we help?"
            description="Find official contacts and get help with your ALECO service account."
          />
          {row("App guide", "Learn the controls with short, replayable tours", () => router.push("/guide"), BookOpen)}
          {!guest ? row("Account setup", "Review your profile, service accounts and alerts", () => router.push("/profile/setup"), UserRound) : null}
          {!guest ? row("App feedback", "Send a suggestion or report a problem using ALEConnect", () => router.push("/profile/feedback"), MessageCircle) : null}
          {row(
            "Call ALECO",
            "View official hotlines and contact details",
            () => router.push("/hotlines"),
            LifeBuoy,
          )}
          {row(
            "ALECO website",
            "Consumer services and organization information",
            () => void open("https://web.alecoinc.com.ph/"),
            Globe,
          )}
          {row(
            "ALECO on Facebook",
            "Official updates from ALECO",
            () => void open("https://www.facebook.com/albayelectric"),
            MessageCircle,
          )}
          <ProfileNotice
            title="Account or password help"
            description="Have your ALECO account number ready when you contact consumer services. Never share your password in a report or message."
          />
        </>
      )}
      {error ? <ProfileNotice title="Link unavailable" description={error} danger /> : null}
    </ReportPage>
  );
}
