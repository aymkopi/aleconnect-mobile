import { useUniwind } from "uniwind";
import { Badge } from "@/components/panelui/badge";
import { Text } from "@/components/panelui/text";
import { consumerTicketStatusLabel, consumerTicketStatusColors } from "./status";
export function ReportStatusBadge({status}: {status: unknown}) {
  const { theme } = useUniwind();
  const colors = consumerTicketStatusColors(status, theme === "dark" || theme.endsWith("-dark"));
  return <Badge variant="secondary" className="self-center rounded-lg px-2 py-1" style={{backgroundColor: colors.background}}>
    <Text size="xs" weight="medium" style={{color: colors.foreground}}>{consumerTicketStatusLabel(status)}</Text>
  </Badge>;
}
