import { useRouter } from "expo-router";
import { Bell, ChevronRight, FileText, House, Link, Megaphone, Phone, Plus, UserRound, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { useAppGuide } from "@/context/app-guide-context";
import { useGuestAccess } from "@/context/guest-access-context";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAppColors } from "@/hooks/use-app-colors";
import { appGuides } from "./guidance-state";

const guideIcons = { House, FileText, Plus, Megaphone, Phone, UserRound };

function GuideRow({ title, description, Icon, onPress }: { title: string; description: string; Icon: LucideIcon; onPress: () => void }) {
  const [primary] = useAppColors(["primary"]);
  return <Button fullWidth variant="social" className="bg-card rounded-xl py-4 justify-start" style={{ minHeight: 76 }} onPress={onPress}
    startContent={<Icon size={22} color={primary} />} endContent={<ChevronRight size={20} color={primary} />}>
    <View className="flex-1 gap-1">
      <Text weight="semibold" style={{ fontSize: 16, lineHeight: 22 }}>{title}</Text>
      <Text muted style={{ fontSize: 13, lineHeight: 18 }}>{description}</Text>
    </View>
  </Button>;
}

export function AppGuideScreen() {
  const router = useRouter();
  const { guest } = useGuestAccess();
  const { startGuide } = useAppGuide();
  return <ReportPage title="App guide" onBack={() => router.canGoBack() ? router.back() : router.replace("/home")}
    footer={<Button variant="ghost" fullWidth style={{ minHeight: 48 }} labelClassName="text-primary" onPress={() => router.dismissTo("/home")}>Back to Home</Button>}>
    <Text muted style={{ fontSize: 16, lineHeight: 24 }}>Choose a guide. Follow the highlights, or stop whenever you like.</Text>
    {appGuides.filter((guide) => !guest || guide.public).map((guide) => <GuideRow key={guide.id} title={guide.title} description={guide.summary} Icon={guideIcons[guide.icon]} onPress={() => startGuide(guide.id)} />)}
  </ReportPage>;
}

export function AccountSetupScreen() {
  const router = useRouter();
  return <ReportPage title="Account setup" onBack={() => router.canGoBack() ? router.back() : router.replace("/home")}
    footer={<>
      <Button fullWidth style={{ minHeight: 48 }} onPress={() => router.push("/guide")}>Explore with a guide</Button>
      <Button variant="ghost" fullWidth style={{ minHeight: 48 }} labelClassName="text-primary" onPress={() => router.dismissTo("/home")}>Back to Home</Button>
    </>}>
    <Text style={{ fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 20, lineHeight: 28 }}>Set up at your pace</Text>
    <Text muted style={{ fontSize: 16, lineHeight: 24 }}>The optional checks help ALECO reach you. You can return to them later.</Text>
    <GuideRow title="Review your profile" description="Photo, contact details and home location." Icon={UserRound} onPress={() => router.push("/profile/details")} />
    <GuideRow title="Service accounts" description="Check your account or link another one." Icon={Link} onPress={() => router.push("/profile/accounts")} />
    <GuideRow title="Alerts & notifications" description="Choose updates and device alerts." Icon={Bell} onPress={() => router.push("/notification-settings")} />
    <Text muted style={{ fontSize: 13, lineHeight: 18 }}>Profile and account changes still require password confirmation.</Text>
  </ReportPage>;
}
