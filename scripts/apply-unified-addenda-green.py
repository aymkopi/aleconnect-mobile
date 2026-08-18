from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "tests/report-detail.test.mjs",
    '  assert.match(card, /Restoration progress history/);',
    '  assert.doesNotMatch(card, /Public update history/);',
)

replace_once(
    "src/features/reports/data.ts",
    '''export type IncidentPublicUpdate = {
  id: string;
  phase: string;
  publicNote: string;
  estimateStartAt: string | null;
  estimateEndAt: string | null;
  estimateUnavailableReason: string | null;
  nextUpdateDueAt: string;
  classification: "standard" | "extended_outage";
  publishedAt: string;
};
''',
    '''export type IncidentPublicUpdate = {
  id: string;
  phase: string;
  publicNote: string;
  estimateStartAt: string | null;
  estimateEndAt: string | null;
  estimateUnavailableReason: string | null;
  nextUpdateDueAt: string;
  classification: "standard" | "extended_outage";
  publishedAt: string;
};

export type ConsumerServiceMemoUpdate = {
  id: string;
  type: "additional_detail" | "operational_note" | "correction";
  body: string;
  publishedAt: string;
  operationalPhase: string | null;
  estimateStartAt: string | null;
  estimateEndAt: string | null;
  estimateUnavailableReason: string | null;
  nextUpdateDueAt: string | null;
  classification: "standard" | "extended_outage" | null;
};
''',
)

replace_once(
    "src/features/reports/data.ts",
    '''  history: ReportHistoryItem[];
  publicUpdates: IncidentPublicUpdate[];
''',
    '''  history: ReportHistoryItem[];
  publicUpdates: IncidentPublicUpdate[];
  consumerUpdates: ConsumerServiceMemoUpdate[];
''',
)

replace_once(
    "src/features/reports/data.ts",
    '''export function parseReportDetailResponse(value: unknown): ReportDetail {
  const report =
    isRecord(value) && isRecord(value.report) ? value.report : null;
  const requiredStrings = [
    "id",
    "ticketNumber",
    "title",
    "status",
    "createdAt",
    "typeId",
    "typeTitle",
    "categoryId",
    "categoryTitle",
  ];
  if (
    !report ||
    requiredStrings.some(
      (key) => typeof report[key] !== "string" || !report[key].trim(),
    ) ||
    !Array.isArray(report.history) ||
    !Array.isArray(report.publicUpdates)
  ) {
    throw new Error("Report details response was incomplete.");
  }

  return {
    ...(report as unknown as ReportDetail),
    imageUrls: Array.isArray(report.imageUrls)
      ? report.imageUrls.filter(isHttpUrl)
      : [],
    imageUrlsExpiresAt:
      typeof report.imageUrlsExpiresAt === "string" &&
      parseApiInstant(report.imageUrlsExpiresAt)
        ? report.imageUrlsExpiresAt
        : null,
    consumerMessage: normalizeConsumerMessage(report.consumerMessage),
  };
}
''',
    '''const consumerServiceMemoUpdateTypes = new Set([
  "additional_detail",
  "operational_note",
  "correction",
]);

function optionalInstant(value: unknown) {
  return typeof value === "string" && parseApiInstant(value) ? value : null;
}

function parseConsumerServiceMemoUpdate(
  value: unknown,
): ConsumerServiceMemoUpdate | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const type = typeof value.type === "string" ? value.type.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const publishedAt = optionalInstant(value.publishedAt);
  if (!id || !consumerServiceMemoUpdateTypes.has(type) || !body || !publishedAt) {
    return null;
  }
  const classification = value.classification === "standard"
    || value.classification === "extended_outage"
    ? value.classification
    : null;
  return {
    id,
    type: type as ConsumerServiceMemoUpdate["type"],
    body,
    publishedAt,
    operationalPhase:
      typeof value.operationalPhase === "string" && value.operationalPhase.trim()
        ? value.operationalPhase.trim()
        : null,
    estimateStartAt: optionalInstant(value.estimateStartAt),
    estimateEndAt: optionalInstant(value.estimateEndAt),
    estimateUnavailableReason:
      typeof value.estimateUnavailableReason === "string"
      && value.estimateUnavailableReason.trim()
        ? value.estimateUnavailableReason.trim()
        : null,
    nextUpdateDueAt: optionalInstant(value.nextUpdateDueAt),
    classification,
  };
}

function legacyConsumerServiceMemoUpdate(
  update: IncidentPublicUpdate,
): ConsumerServiceMemoUpdate {
  return {
    id: update.id,
    type: "operational_note",
    body: update.publicNote,
    publishedAt: update.publishedAt,
    operationalPhase: update.phase,
    estimateStartAt: update.estimateStartAt,
    estimateEndAt: update.estimateEndAt,
    estimateUnavailableReason: update.estimateUnavailableReason,
    nextUpdateDueAt: update.nextUpdateDueAt,
    classification: update.classification,
  };
}

export function parseReportDetailResponse(value: unknown): ReportDetail {
  const report =
    isRecord(value) && isRecord(value.report) ? value.report : null;
  const requiredStrings = [
    "id",
    "ticketNumber",
    "title",
    "status",
    "createdAt",
    "typeId",
    "typeTitle",
    "categoryId",
    "categoryTitle",
  ];
  if (
    !report ||
    requiredStrings.some(
      (key) => typeof report[key] !== "string" || !report[key].trim(),
    ) ||
    !Array.isArray(report.history) ||
    !Array.isArray(report.publicUpdates)
  ) {
    throw new Error("Report details response was incomplete.");
  }

  const publicUpdates = report.publicUpdates as IncidentPublicUpdate[];
  const consumerUpdates = Array.isArray(report.consumerUpdates)
    ? report.consumerUpdates
        .map(parseConsumerServiceMemoUpdate)
        .filter((update): update is ConsumerServiceMemoUpdate => update !== null)
    : publicUpdates.map(legacyConsumerServiceMemoUpdate);

  return {
    ...(report as unknown as ReportDetail),
    publicUpdates,
    consumerUpdates,
    imageUrls: Array.isArray(report.imageUrls)
      ? report.imageUrls.filter(isHttpUrl)
      : [],
    imageUrlsExpiresAt:
      typeof report.imageUrlsExpiresAt === "string" &&
      parseApiInstant(report.imageUrlsExpiresAt)
        ? report.imageUrlsExpiresAt
        : null,
    consumerMessage: normalizeConsumerMessage(report.consumerMessage),
  };
}
''',
)

replace_once(
    "src/app/(tabs)/reports/[id].tsx",
    '''              <View className="mt-4">
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === timeline.length - 1}
                    consumerMessage={
                      index === consumerMessageIndex
                        ? report.consumerMessage
                        : null
                    }
                  />
                ))}
              </View>
''',
    '''              <View className="mt-4">
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === timeline.length - 1}
                    consumerMessage={
                      index === consumerMessageIndex
                        ? report.consumerMessage
                        : null
                    }
                  />
                ))}
              </View>
              {report.consumerUpdates.length > 0 ? (
                <View className="mt-1 border-border border-t pt-4">
                  <Text className="text-sm font-bold text-foreground">
                    Service Memo updates
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Updates published by ALECO about the incident linked to your report.
                  </Text>
                  <View className="mt-3 gap-3">
                    {report.consumerUpdates.map((update) => (
                      <View key={update.id} className="rounded-md bg-secondary/40 p-3">
                        <View className="flex-row items-center justify-between gap-3">
                          <Text className="text-xs font-bold text-muted-foreground">
                            {formatStatus(update.type)}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {formatReportDate(update.publishedAt)}
                          </Text>
                        </View>
                        {update.operationalPhase ? (
                          <Text className="mt-1 text-xs font-semibold text-primary">
                            {formatStatus(update.operationalPhase)}
                          </Text>
                        ) : null}
                        <Text className="mt-2 text-sm text-foreground">{update.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
''',
)

replace_once(
    "src/features/reports/extended-outage-status-card.tsx",
    '''import { CalendarClock, Clock3 } from "lucide-react-native";''',
    '''import { Clock3 } from "lucide-react-native";''',
)

replace_once(
    "src/features/reports/extended-outage-status-card.tsx",
    '''      <View>
        <View className="mb-3 flex-row items-center gap-2">
          <CalendarClock size={16} color={accentColor} />
          <Text className="text-sm font-bold text-foreground">Public update history</Text>
        </View>
        {updates.map((update, index) => (
          <View
            key={update.id}
            className={index ? "border-border border-t pt-3" : ""}
            style={{ marginTop: index ? 12 : 0 }}
          >
            <Text className="text-xs font-bold text-muted-foreground">
              {formatStatus(update.phase)} · {formatReportDate(update.publishedAt)}
            </Text>
            <Text className="mt-1 text-sm text-foreground">{update.publicNote}</Text>
          </View>
        ))}
      </View>
''',
    '''''',
)
