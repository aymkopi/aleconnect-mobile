import { readFile, writeFile } from "node:fs/promises";

const archivePath = "src/app/(tabs)/reports/list.tsx";
let source = await readFile(archivePath, "utf8");

function replaceOnce(from, to) {
  if (!source.includes(from)) {
    throw new Error(`Archive patch marker not found:\n${from.slice(0, 120)}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
`import {
  fetchComplaintMeta,
  fetchComplaintReportPage,
  type ComplaintReportSort,
} from "@/services/reports";
import { formatManilaWeekRange, manilaWeekStartKey } from "@/utils/manila-time";`,
`import {
  fetchComplaintMeta,
  fetchComplaintReportPage,
  type ComplaintReportSort,
} from "@/services/reports";
import {
  subscribeReportRevalidationRequested,
  subscribeReportStatusChanged,
} from "@/services/report-sync-events";
import { formatManilaWeekRange, manilaWeekStartKey } from "@/utils/manila-time";`,
);

replaceOnce(
`  const { session } = useAuthSession();
  const { items: queuedItems, isSyncing, sync, retry, remove } = useReportQueue();`,
`  const { session } = useAuthSession();
  const userId = session?.user.id;
  const { items: queuedItems, isSyncing, sync, retry, remove } = useReportQueue();`,
);

replaceOnce(
`    async (options?: {
      force?: boolean;
      append?: boolean;
      cursor?: string | null;
    }) => {
      if (!session) return;`,
`    async (options?: {
      force?: boolean;
      revalidate?: boolean;
      append?: boolean;
      cursor?: string | null;
    }) => {
      if (!userId) return;`,
);

replaceOnce(
`      if (append) setIsLoadingMore(true);
      else if (options?.force) setIsRefreshing(true);
      else setIsLoading(true);`,
`      if (append) setIsLoadingMore(true);
      else if (options?.force) setIsRefreshing(true);
      else if (!options?.revalidate) setIsLoading(true);`,
);

replaceOnce(
`        const [nextMeta, page] = await Promise.all([
          append ? Promise.resolve(null) : fetchComplaintMeta(options),
          fetchComplaintReportPage({
            userId: session.user.id,
            force: options?.force,
            cursor: options?.cursor,
            query,
            categoryId,
            sort: sortMode,
          }),
        ]);`,
`        const [nextMeta, page] = await Promise.all([
          append
            ? Promise.resolve(null)
            : fetchComplaintMeta(options?.force ? { force: true } : undefined),
          fetchComplaintReportPage({
            userId,
            force: options?.force,
            revalidate: options?.revalidate,
            cursor: options?.cursor,
            query,
            categoryId,
            sort: sortMode,
          }),
        ]);`,
);

replaceOnce(
`        setNextCursor(page.nextCursor);
        setIsStale(Boolean(page.isStale));
        setError(null);`,
`        setNextCursor(page.nextCursor);
        setIsStale(Boolean(page.isStale));
        setError(null);
        if (
          page.isStale &&
          !options?.revalidate &&
          !options?.force &&
          !append
        ) {
          queueMicrotask(() => {
            void loadReportsRef.current({ revalidate: true });
          });
        }`,
);

replaceOnce(
`    [categoryId, query, session, sortMode],
  );
  const loadReportsRef = useRef(loadReports);
  useEffect(() => {
    loadReportsRef.current = loadReports;
  }, [loadReports]);`,
`    [categoryId, query, sortMode, userId],
  );
  const loadReportsRef = useRef(loadReports);
  useEffect(() => {
    loadReportsRef.current = loadReports;
  }, [loadReports]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeStatus = subscribeReportStatusChanged((event) => {
      if (event.userId !== userId) return;
      setReports((current) =>
        current.map((report) =>
          report.id === event.ticketId
            ? { ...report, status: event.status }
            : report,
        ),
      );
    });

    const unsubscribeRevalidation = subscribeReportRevalidationRequested(
      (changedUserId) => {
        if (changedUserId !== userId) return;
        void loadReportsRef.current({ revalidate: true });
      },
    );

    return () => {
      unsubscribeStatus();
      unsubscribeRevalidation();
    };
  }, [userId]);`,
);

await writeFile(archivePath, source);

const historyPath = "docs/agent-harness/implementation-history.md";
let history = await readFile(historyPath, "utf8");
const heading = "# Implementation history\n\n";
if (!history.startsWith(heading)) {
  throw new Error("Implementation history heading not found");
}

const entry = `## 2026-08-15 - Push-driven report status synchronization

- Repositories: mobile \`feature/ticket-push-report-sync\`; coordinated staff/API branch \`feature/ticket-push-report-sync\` owns the versioned ticket-status push contract.
- Scope: makes Recent Reports and Report Archive reflect accepted ticket status pushes immediately, then revalidates from the authoritative complaint API without polling, WebSockets, or waiting for notification delivery.
- Files: \`src/app/_layout.tsx\`, both report-list routes, \`src/services/notification-navigation.ts\`, \`src/services/report-sync-ordering.ts\`, \`src/services/report-sync-events.ts\`, \`src/services/reports.ts\`, focused report-sync tests, and this history entry.
- Contracts: v1 ticket push events require \`context=ticket\`, \`event=ticket.status_changed\`, \`version=1\`, ticket ID, canonical status, and server \`changedAt\`; optional monotonic \`revision\` wins when both compared events provide one. Legacy ticket notification taps retain navigation and trigger authoritative revalidation. The server remains authoritative.
- Verification: focused report-sync tests, the full Node suite (130 passed, 1 existing sibling-contract skip), TypeScript, and lint completed successfully in the pre-handoff verification run. The final branch gate repeats those checks plus \`npm run harness:check\` and \`git diff --check\` after this required history entry is present.
- Git/Deployment: feature-branch implementation only; no Expo/EAS/store release, backend deployment, database mutation, or mobile publication is included.
- Remaining risks: operating systems may delay or omit background push execution, so app/session activation and offline-to-online transitions intentionally request server revalidation. Immediate foreground projection is best-effort cache/UI acceleration, not the consistency source.
- Next: complete final branch verification, review the cross-repository diffs, then merge/release backend and mobile in a coordinated order.

`;

if (!history.includes("## 2026-08-15 - Push-driven report status synchronization")) {
  history = heading + entry + history.slice(heading.length);
  await writeFile(historyPath, history);
}
