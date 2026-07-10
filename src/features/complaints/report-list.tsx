import {
  formatReportDate,
  formatStatus,
  type Report,
} from "@/features/complaints/data";
import {
  ListGroup,
  PressableFeedback,
  Separator,
  Typography,
  useThemeColor,
} from "heroui-native";
import { FileText } from "lucide-react-native";
import { Fragment } from "react";
import { View } from "react-native";

export function ReportStatusBadge({ status }: { status: string }) {
  return (
    <View className="rounded-full bg-default px-3 py-1">
      <Typography type="body-xs" weight="bold">
        {formatStatus(status)}
      </Typography>
    </View>
  );
}

export function ReportListGroup({
  reports,
  getColor,
  onPress,
}: {
  reports: Report[];
  getColor?: (report: Report) => string | undefined;
  onPress: (report: Report) => void;
}) {
  const [accentColor] = useThemeColor(["accent"]);

  return (
    <ListGroup>
      {reports.map((report, index) => (
        <Fragment key={report.id}>
          {index > 0 ? <Separator className="mx-4" /> : null}
          <PressableFeedback animation={false} onPress={() => onPress(report)}>
            <PressableFeedback.Scale>
              <ListGroup.Item disabled>
                <ListGroup.ItemPrefix>
                  <View
                    className="h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: getColor?.(report) ?? accentColor }}
                  >
                    <FileText size={18} color="white" />
                  </View>
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <View className="min-w-0">
                    <Typography type="body-xs" color="muted" weight="bold">
                      {report.ticketNumber}
                    </Typography>
                    <ListGroup.ItemTitle numberOfLines={2}>
                      {report.title}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription numberOfLines={2}>
                      {report.typeTitle} - {formatReportDate(report.createdAt)}
                    </ListGroup.ItemDescription>
                  </View>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <ReportStatusBadge status={report.status} />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </PressableFeedback.Scale>
            <PressableFeedback.Ripple />
          </PressableFeedback>
        </Fragment>
      ))}
    </ListGroup>
  );
}
