import { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { RotateCw, Star } from "lucide-react-native";
import { FlipCard } from "@/components/panelui/flip-card";
import { QRCode } from "@/components/panelui/qr-code";
import { Text } from "@/components/panelui/text";
import { SoftRadial } from "@/components/soft-radial";
import { useAppColors } from "@/hooks/use-app-colors";
import type { LinkedAccount } from "@/features/accounts/contract";

export function ServiceAccountCard({ account }: { account: LinkedAccount }) {
  const [feature, primary] = useAppColors(["feature", "primary"]);
  const { fontScale } = useWindowDimensions();
  const [flipped, setFlipped] = useState(false);
  useEffect(() => setFlipped(false), [account.id]);
  return (
    <FlipCard flipped={flipped} onFlippedChange={setFlipped} accessibilityState={{ expanded: flipped }} style={{ height: Math.max(216, 216 * fontScale), width: "100%" }}
      accessibilityLabel={flipped
        ? `Service account details. Name: ${account.registeredName}. Account number: ${account.accountNumber || "Not available"}. Address: ${account.address || "Not on file"}. Phone: ${account.phoneNumber || "Not on file"}. Tap to return.`
        : account.registeredName + (account.isDefault ? ", default service account." : ", service account.") + " Tap to view account details."}>
      <FlipCard.Front className="h-full gap-2 overflow-hidden rounded-xl p-3" style={{ backgroundColor: feature }}>
        <SoftRadial />
        <View className="flex-row items-center justify-between gap-2">
          <Text size="xs" weight="semibold" className="flex-1" numberOfLines={2} style={{ color: "#FFFFFF" }}>ALECO SERVICE ACCOUNT</Text>
          {account.isDefault ? <View className="flex-row items-center gap-1">
            <Star size={13} color="#FFFFFF" /><Text size="xs" style={{ color: "#FFFFFF" }}>Default</Text>
          </View> : null}
        </View>
        <View className="flex-1 justify-center gap-2">
          <Text size="lg" weight="semibold" style={{ color: "#FFFFFF" }} numberOfLines={2}>{account.registeredName}</Text>
          <Text size="sm" style={{ color: "#E5E7EB" }} numberOfLines={2}>{account.address || "No address on file"}</Text>
          <Text size="lg" weight="semibold" style={{ color: "#FFFFFF" }}>•••• {account.accountNumber?.slice(-4) || "—"}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <RotateCw size={14} color="#E5E7EB" /><Text size="xs" style={{ color: "#E5E7EB" }}>Tap to view details & account QR</Text>
        </View>
      </FlipCard.Front>
      <FlipCard.Back className="h-full gap-2 rounded-xl bg-card p-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="flex-1 gap-1">
            {[
              ["Name", account.registeredName],
              ["Account number", account.accountNumber || "Not available"],
              ["Address", account.address || "Not on file"],
              ["Phone", account.phoneNumber || "Not on file"],
            ].map(([label, value]) => <View key={label}>
              <Text size="xs" muted style={{ fontSize: 11, lineHeight: 13 }}>{label}</Text>
              <Text size="xs" weight="medium" numberOfLines={label === "Address" ? 3 : 2}>{value}</Text>
            </View>)}
          </View>
          {account.accountNumber ? <QRCode value={account.accountNumber} size="sm" accessibilityLabel="ALECO account number QR code">
            <QRCode.Canvas />
          </QRCode> : null}
        </View>
        <Text size="xs" style={{ color: primary }}>Show the QR to ALECO personnel. Tap to return.</Text>
      </FlipCard.Back>
    </FlipCard>
  );
}
