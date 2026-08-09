import { Redirect } from "expo-router";

// Kept for existing deep links. Saved reports now live inside the archive.
export default function ReportQueueRoute() {
  return <Redirect href="/reports/list" />;
}
