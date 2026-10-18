import { useRouter } from "expo-router";
import { KeyRound, ShieldCheck } from "lucide-react-native";
import { Button } from "@/components/panelui/button";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAppColors } from "@/hooks/use-app-colors";
import { DetailRow, ProfileGate, ProfileHeading } from "./profile-ui";

export default function SecurityScreen() {
  const router = useRouter(), [primary] = useAppColors(["primary"]);
  return <ProfileGate>{identity => <ReportPage title="Security settings" onBack={() => router.dismissTo("/profile")}>
    <ShieldCheck size={28} color={primary} />
    <ProfileHeading title="Account security" description="Manage the password for your current sign-in account." />
    <DetailRow label="Sign-in method" value={identity.account.sessionMode === "identity" ? "Email" : "ALECO account number"} />
    <Button variant="secondary" startContent={<KeyRound size={18} color={primary} />} onPress={() => router.push("/profile/change-password")}>Change password</Button>
  </ReportPage>}</ProfileGate>;
}
