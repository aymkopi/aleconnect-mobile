import { Badge } from "@/components/panelui/badge";
import { Text } from "@/components/panelui/text";
import { useUniwind } from "uniwind";
import {
  consumerTicketStatusColors,
  consumerTicketStatusLabel,
} from "./status";
export function ReportStatusBadge({ status }: { status: unknown }) {
  const { theme } = useUniwind();
  const colors = consumerTicketStatusColors(
    status,
    theme === "dark" || theme.endsWith("-dark"),
  );
  return (
    <Badge
      size="xs"
      variant="secondary"
      className="rounded px-2 py-0.5"
      style={{ backgroundColor: colors.background }}
    >
      <Text
        className="text-[10px] leading-[14px]"
        style={{ color: colors.foreground }}
      >
        {consumerTicketStatusLabel(status)}
      </Text>
    </Badge>
  );
}
