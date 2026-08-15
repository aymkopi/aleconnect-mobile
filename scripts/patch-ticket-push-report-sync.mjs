import { readFile, writeFile } from "node:fs/promises";

const path = "src/app/(tabs)/reports/list.tsx";
let source = await readFile(path, "utf8");

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

await writeFile(path, source);
