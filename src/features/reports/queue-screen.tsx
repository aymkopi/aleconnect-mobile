import { Asset } from "expo-asset";
import { useLayoutEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  Image,
  MapPin,
} from "lucide-react-native";
import { ReportPage } from "./components/report-page";
import { EvidencePhotoViewer } from "./components/evidence-photo-viewer";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { Badge } from "@/components/panelui/badge";
import { Select } from "@/components/panelui/select";
import { BottomSheet } from "@/components/panelui/bottom-sheet";
import { Spinner } from "@/components/panelui/spinner";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useReportQueue } from "@/context/report-queue-context";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import {
  evaluateQueuedReportAccess,
  isQueuedReportVisible,
} from "@/services/report-queue-access";
import { fetchComplaintMeta } from "@/services/reports";
import { formatManilaDateTime } from "@/utils/manila-time";
import {
  fixtureSavedReport,
  presentQueuedReport,
  queueDiagnosticText,
  simulateQueueRetry,
} from "./queue-presentation";
import type { ReportQueueItem } from "@/services/report-queue";
import { reportFailureMessage } from '@/utils/report-transport';

type QueueSheet =
  | ""
  | "diagnostic"
  | "discard"
  | "account"
  | "location"
  | "photos"
  | "preview";
function QueueRow({
  title,
  subtitle,
  details,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  details?: string;
  icon?: React.ReactNode;
  onPress: () => void;
}) {
  const [primary] = useAppColors(["primary"]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}${details ? ", " + details : ""}`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl bg-card p-3 min-h-16"
    >
      <View className="rounded-xl bg-accent p-2">
        {icon || <FileText color={primary} size={20} />}
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="semibold" size="sm">
          {title}
        </Text>
        <Text muted size="xs">
          {subtitle}
        </Text>
        {details ? <Text muted style={{ fontSize: 11, lineHeight: 16 }}>{details}</Text> : null}
      </View>
      <ChevronRight size={18} color={primary} />
    </Pressable>
  );
}
export default function ReportQueueScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuthSession();
  const { accountContext, refreshConsumerAccount } = useConsumerAccount();
  const { fixtures } = useVisualPreview();
  const queue = useReportQueue();
  const [primary] = useAppColors(["primary"]);
  const currentScope = session
    ? {
        identityUserId: accountContext?.identityUserId ?? session.user.id,
        authorizedServiceAccountIds:
          accountContext?.authorizedServiceAccountIds ?? [session.user.id],
        accessRevision: accountContext?.accessRevision ?? 0,
      }
    : null;
  const scope = JSON.stringify([fixtures, session?.user.id, currentScope]);
  const activeScope = useRef(scope);
  useLayoutEffect(() => {
    activeScope.current = scope;
  }, [scope]);
  const [fixtureItems, setFixtureItems] = useState<ReportQueueItem[]>([
    { ...fixtureSavedReport },
  ]);
  const [fixtureState, setFixtureState] = useState("queued");
  const [retryOutcome, setRetryOutcome] = useState<"confirmed" | "failed">(
    "confirmed",
  );
  const [discardOutcome, setDiscardOutcome] = useState("discard");
  const [sheet, setSheet] = useState<QueueSheet>("");
  const [busy, setBusy] = useState<{ scope: string; action: string } | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{
    scope: string;
    text: string;
  } | null>(null);
  const [viewer, setViewer] = useState<{
    scope: string;
    itemId: string;
    index: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [uncertain, setUncertain] = useState({
    scope: "",
    ids: [] as string[],
  });
  const fixtureUris = fixtures
    ? [
        Asset.fromModule(
          require("../../../assets/aleconnect/report-evidence-1.png"),
        ).uri,
        Asset.fromModule(
          require("../../../assets/aleconnect/report-evidence-2.png"),
        ).uri,
        Asset.fromModule(
          require("../../../assets/aleconnect/report-evidence-3.png"),
        ).uri,
      ]
    : [];
  const items = fixtures
    ? fixtureItems.map((item) => ({
        ...item,
        evidence: item.evidence.map((photo, i) => ({
          ...photo,
          uri: fixtureUris[i % fixtureUris.length],
        })),
      }))
    : currentScope
      ? queue.items.filter((item) => isQueuedReportVisible(item, currentScope))
      : [];
  const selected = id ? items.find((item) => item.id === id) : null;
  // Keep an unconfirmed receipt protected if a later retry fails in an earlier phase.
  const guardedItem =
    selected && uncertain.scope === scope && uncertain.ids.includes(selected.id)
      ? { ...selected, lastErrorPhase: "final submit" as const }
      : selected;
  const running = busy?.scope === scope;
  const syncing = !fixtures && queue.isSyncing;
  const actionEnabled = fixtures || !PANELUI_PREVIEW;
  const accessAllowed =
    !!selected &&
    (fixtures ||
      (!!currentScope &&
        evaluateQueuedReportAccess(selected, currentScope).allowed));
  const state = guardedItem
    ? presentQueuedReport(
        guardedItem,
        syncing || (running && busy?.action === "retry"),
        accessAllowed,
      )
    : null;
  const presentation = state
    ? {
        ...state,
        canRetry: !running && state.canRetry,
        canDiscard: !running && state.canDiscard,
      }
    : null;
  const meta = useScopedRead(
    !fixtures && selected && session
      ? JSON.stringify([scope, "queue-location"])
      : null,
    (force) => fetchComplaintMeta({ force }),
  );
  const selectedNow = useRef(guardedItem);
  useLayoutEffect(() => {
    selectedNow.current = guardedItem;
  });
  const account = selected
    ? accountContext?.accounts.find((a) => a.id === selected.serviceAccountId)
    : null;
  const accountLabel = fixtures
    ? "Home"
    : account?.registeredName || "Saved service account";
  const maskedAccount = selected
    ? `••${selected.payload.accountNumber.slice(-4)}`
    : "";
  const place = selected
    ? fixtures
      ? "Bigaa, Legazpi"
      : (() => {
          const b = meta.data?.barangays.find(
            (b) => b.code === selected.payload.barangayPsgc,
          );
          return b ? `${b.name}, ${b.municipalityName}` : "Saved barangay";
        })()
    : "";
  const location = selected
    ? [selected.payload.purok, place, selected.payload.landmark]
        .filter(Boolean)
        .join(", ")
    : "";
  function open(next: QueueSheet) {
    setCopied(false);
    setSheet(next);
  }
  function back() {
    if (id) router.setParams({ id: "" });
    else if (router.canGoBack()) router.back();
    else router.replace("/reports");
  }
  async function retry() {
    const item = selectedNow.current;
    const allowed =
      fixtures ||
      (!!currentScope &&
        !!item &&
        evaluateQueuedReportAccess(item, currentScope).allowed);
    if (
      !item ||
      !actionEnabled ||
      !presentQueuedReport(item, running || syncing, allowed).canRetry
    )
      return;
    const key = scope;
    setBusy({ scope: key, action: "retry" });
    setFeedback(null);
    if (item.lastErrorPhase === "final submit")
      setUncertain((before) => ({
        scope: key,
        ids: [
          ...new Set([...(before.scope === key ? before.ids : []), item.id]),
        ],
      }));
    try {
      if (fixtures) {
        setFixtureItems((rows) =>
          rows.map((r) =>
            r.id === item.id ? { ...r, status: "submitting" } : r,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (activeScope.current !== key) return;
        setFixtureItems((rows) =>
          rows.map((r) =>
            r.id === item.id ? simulateQueueRetry(item, retryOutcome) : r,
          ),
        );
        setFeedback({
          scope: key,
          text:
            retryOutcome === "confirmed"
              ? "Fixture receipt confirmed. No report was sent."
              : "Fixture retry failed. No saved device report was changed.",
        });
      } else {
        const results = await queue.retry(item.id);
        if (activeScope.current !== key) return;
        await queue.refresh();
        const received = results?.find(row => row.id === item.id && row.status === 'submitted' && row.ticketId && row.ticketNumber);
        if (activeScope.current === key && received) router.replace({ pathname: '/reports/[id]', params: { id: received.ticketId!, ...(received.serviceAccountId ? { serviceAccountId: received.serviceAccountId } : {}) } });
      }
    } catch (error) {
      if (activeScope.current === key)
        setFeedback({
          scope: key,
          text: reportFailureMessage({ message: error instanceof Error ? error.message : null }),
        });
    } finally {
      if (activeScope.current === key) setBusy(null);
    }
  }
  async function discard() {
    const item = selectedNow.current;
    if (
      !item ||
      !actionEnabled ||
      !presentQueuedReport(item, running || syncing).canDiscard
    )
      return;
    const key = scope;
    setBusy({ scope: key, action: "discard" });
    try {
      if (fixtures) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (activeScope.current !== key) return;
        if (discardOutcome === "fail")
          throw new Error(
            "Fixture: saved report could not be removed. Its details and photos are retained.",
          );
        setFixtureItems((rows) => rows.filter((r) => r.id !== item.id));
      } else await queue.remove(item.id);
      if (activeScope.current !== key) return;
      setSheet("");
      setFeedback({
        scope: key,
        text: fixtures
          ? "Fixture saved report discarded. Device data is unchanged."
          : "The saved report was removed from this device.",
      });
      router.setParams({ id: "" });
    } catch (error) {
      if (activeScope.current === key)
        setFeedback({
          scope: key,
          text:
            error instanceof Error
              ? error.message
              : "Could not discard. Your saved report is retained.",
        });
    } finally {
      if (activeScope.current === key) setBusy(null);
    }
  }
  async function copyDiagnostic() {
    if (!selected) return;
    const key = scope;
    try {
      await Clipboard.setStringAsync(queueDiagnosticText(selected));
      if (activeScope.current === key) setCopied(true);
    } catch {
      if (activeScope.current === key)
        setFeedback({
          scope: key,
          text: "Support reference could not be copied. You can read it below.",
        });
    }
  }
  function previewState(value: string) {
    setFixtureState(value);
    const row =
      value === "failed"
        ? simulateQueueRetry(fixtureSavedReport, "failed")
        : value === "submitted"
          ? simulateQueueRetry(fixtureSavedReport, "confirmed")
          : value === "unknown"
            ? {
                ...fixtureSavedReport,
                attempts: 1,
                lastError: "Fixture: ALECO did not return a confirmation.",
                lastErrorPhase: "final submit" as const,
              }
            : {
                ...fixtureSavedReport,
                status:
                  value === "submitting"
                    ? ("submitting" as const)
                    : ("queued" as const),
              };
    setFixtureItems(value === "empty" ? [] : [row]);
    setFeedback(null);
    setSheet("");
  }
  const footer =
    selected && presentation ? (
      <>
        <Button
          fullWidth
          loading={running && busy?.action === "retry"}
          disabled={!actionEnabled || !presentation.canRetry}
          onPress={() => void retry()}
        >
          {presentation.confirmed
            ? "Received by ALECO"
            : presentation.sending
              ? "Sending report…"
              : "Try again"}
        </Button>
        {presentation.confirmed ? (
          <Button
            fullWidth
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/reports/[id]",
                params: {
                  id: selected.ticketId || "",
                  ...(selected.serviceAccountId
                    ? { serviceAccountId: selected.serviceAccountId }
                    : {}),
                },
              })
            }
            disabled={!selected.ticketId}
          >
            View sent report
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outline"
            disabled={!actionEnabled || !presentation.canDiscard}
            onPress={() => open("discard")}
          >
            Discard saved report
          </Button>
        )}
      </>
    ) : !items.length ? <Button fullWidth onPress={() => router.push('/reports/new')}>New report</Button> : undefined;
  const sheetTitle =
    sheet === "diagnostic"
        ? copied
          ? "Copied"
          : "Support details"
        : sheet === "discard"
          ? "Discard this saved report?"
          : sheet === "account"
            ? "Saved account"
            : sheet === "location"
              ? "Saved location"
              : sheet === "photos"
                ? "Saved photos"
                : "Fixture states";
  return (
    <ReportPage
      title={id ? "Saved report" : "Saved reports"}
      onBack={back}
      footer={footer}
      headerAction={
        fixtures ? (
          <Button
            size="sm"
            variant="ghost"
            accessibilityLabel="Choose fixture queue state"
            onPress={() => open("preview")}
          >
            Preview
          </Button>
        ) : selected ? (
          <Button size="icon" variant="ghost" accessibilityLabel="Support details" onPress={() => open('diagnostic')}>
            <Copy size={20} color={primary} />
          </Button>
        ) : undefined
      }
    >
      {feedback?.scope === scope ? (
        <View className="rounded-xl bg-card p-3">
          <Text size="sm" accessibilityRole="alert">
            {feedback.text}
          </Text>
        </View>
      ) : null}
      {PANELUI_PREVIEW && !fixtures ? (
        <View className="rounded-xl bg-card p-3 gap-1">
          <Text weight="semibold" size="sm">
            Preview; device queue protected
          </Text>
          <Text muted size="sm">
            Replay, retry and discard are paused. Turn on fixture data to test
            these actions safely.
          </Text>
        </View>
      ) : null}
      {id && !selected ? (
        <View className="rounded-xl bg-card p-4 gap-3">
          <Text weight="semibold">Saved report unavailable</Text>
          <Text muted size="sm">
            This copy is no longer in your current consumer’s queue. Open Sent
            reports to confirm an ALECO reference.
          </Text>
          <Button
            variant="outline"
            onPress={() => router.push("/reports/list")}
          >
            View sent reports
          </Button>
        </View>
      ) : selected && presentation ? (
        <>
          <Text weight="semibold" size="lg">
            {selected.title}
          </Text>
          <View className="rounded-xl bg-card p-3 gap-2">
            <View className="flex-row items-center gap-2">
              <Badge variant={presentation.variant}>{presentation.label}</Badge>
              {presentation.sending ? <Spinner size="sm" /> : null}
            </View>
            {!presentation.sending ? <Text size="sm" accessibilityRole={selected.lastError ? 'alert' : undefined}>{presentation.description}</Text> : null}
            <Text muted size="xs">
              Saved {formatManilaDateTime(selected.createdAt)}
            </Text>
          </View>
          <QueueRow
            title="Account"
            subtitle={accountLabel}
            details={maskedAccount}
            icon={<CreditCard size={20} color={primary} />}
            onPress={() => open("account")}
          />
          <QueueRow
            title="Location"
            subtitle={location}
            icon={<MapPin size={20} color={primary} />}
            onPress={() => open("location")}
          />
          <Text muted size="sm">
            {[
              selected.payload.categoryDescription,
              selected.payload.typeDescription,
              selected.payload.actionDesired,
            ]
              .filter(Boolean)
              .join("\n") || "No additional details saved."}
          </Text>
          <QueueRow
            title="Photos"
            subtitle={`${selected.evidence.length} photo${selected.evidence.length === 1 ? "" : "s"}`}
            icon={<Image size={20} color={primary} />}
            onPress={() => open("photos")}
          />
          {!presentation.canRetry &&
          !presentation.confirmed &&
          !presentation.sending ? (
            <View className="gap-2">
              <Text muted size="sm">
                Refresh your accounts to check access.
              </Text>
              {!fixtures && !accessAllowed ? (
                <Button
                  variant="outline"
                  loading={running && busy?.action === "access"}
                  onPress={async () => {
                    const key = scope;
                    setBusy({ scope: key, action: "access" });
                    try {
                      await refreshConsumerAccount();
                    } catch {
                      if (activeScope.current === key)
                        setFeedback({
                          scope: key,
                          text: "Account access could not be refreshed. Try again.",
                        });
                    } finally {
                      if (activeScope.current === key) setBusy(null);
                    }
                  }}
                >
                  Refresh linked accounts
                </Button>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <>
          {!items.length ? <View className="gap-2"><Text weight="semibold" size="lg">No saved reports</Text><Text muted size="sm">{!session && !fixtures ? 'Sign in to view your saved reports.' : 'Reports saved offline will appear here.'}</Text></View> : null}
          {items.map((item) => (
            <QueueRow
              key={item.id}
              title={item.title}
              subtitle={presentQueuedReport(item, syncing).label}
              details={`${item.evidence.length} photo${item.evidence.length === 1 ? '' : 's'}\nSaved ${formatManilaDateTime(item.createdAt)}`}
              onPress={() => router.setParams({ id: item.id })}
            />
          ))}
          <QueueRow
            title="Sent reports"
            subtitle="See reports received by ALECO"
            onPress={() => router.push("/reports/list")}
          />
        </>
      )}
      <BottomSheet
        open={!!sheet}
        onOpenChange={(next) => !next && setSheet("")}
      >
        <BottomSheet.Content>
          <BottomSheet.Header title={sheetTitle} />
          <BottomSheet.Body
            className="gap-3"
            showsVerticalScrollIndicator={false}
          >
            {feedback?.scope === scope ? (
              <Text size="sm" accessibilityRole="alert">
                {feedback.text}
              </Text>
            ) : null}
            {sheet === "preview" && fixtures ? (
              <>
                <Text muted size="sm">
                  These states and actions affect memory only. Retained device
                  reports and evidence are unchanged.
                </Text>
                <Select
                  presentation="content"
                  value={fixtureState}
                  onValueChange={previewState}
                >
                  <Select.Item
                    value="queued"
                    label="Waiting for a connection"
                  />
                  <Select.Item value="unknown" label="Receipt not confirmed" />
                  <Select.Item value="submitting" label="Sending report" />
                  <Select.Item value="failed" label="Photo needs attention" />
                  <Select.Item value="submitted" label="Confirmed by ALECO" />
                  <Select.Item value="empty" label="Empty device queue" />
                </Select>
                <LabelledOutcome
                  value={retryOutcome}
                  onChange={setRetryOutcome}
                />
                <Text weight="semibold" size="sm">
                  Next fixture discard result
                </Text>
                <Select
                  presentation="content"
                  value={discardOutcome}
                  onValueChange={setDiscardOutcome}
                >
                  <Select.Item value="discard" label="Remove fixture report" />
                  <Select.Item value="fail" label="Show discard failure" />
                </Select>
              </>
            ) : selected ? (
              sheet === "discard" ? (
                <>
                  <Text>
                    Delete this saved report and its photos? This can’t be undone.
                  </Text>
                  {!presentation?.canDiscard ? (
                    <Text accessibilityRole="alert">
                      Keep this report while sending or waiting for
                      confirmation.
                    </Text>
                  ) : null}
                </>
              ) : sheet === "diagnostic" ? (
                <>
                  <Text selectable size="sm">
                    {queueDiagnosticText(selected)}
                  </Text>
                  {copied ? (
                    <Text size="sm" accessibilityRole="alert">
                      Copied.
                    </Text>
                  ) : null}
                </>
              ) : sheet === "account" ? (
                <>
                  <Text weight="semibold">{accountLabel}</Text>
                  <Text>{maskedAccount}</Text>
                </>
              ) : sheet === "location" ? (
                <>
                  <Text>{location}</Text>
                  {selected.payload.latitude !== null &&
                  selected.payload.longitude !== null ? (
                    <Text muted size="sm">
                      Saved pin: {selected.payload.latitude.toFixed(5)},{" "}
                      {selected.payload.longitude.toFixed(5)}
                    </Text>
                  ) : (
                    <Text muted size="sm">
                      No map pin was saved.
                    </Text>
                  )}
                </>
              ) : sheet === "photos" ? (
                <>
                  {selected.evidence.length ? (
                    selected.evidence.map((photo, index) => (
                      <Button
                        key={photo.id}
                        variant="outline"
                        onPress={() => {
                          setSheet("");
                          setViewer({ scope, itemId: selected.id, index });
                        }}
                      >
                        Photo {index + 1} ({Math.round(photo.size / 1000)} KB)
                        {fixtures ? " (fixture)" : ""}
                      </Button>
                    ))
                  ) : (
                    <Text muted>No photos were saved.</Text>
                  )}
                  <Text muted size="sm">
                    Prepared photos are retained with this report. This queue
                    does not support replacing or editing them.
                  </Text>
                </>
              ) : null
            ) : (
              <Text muted>
                The saved report is no longer available in this consumer queue.
              </Text>
            )}
          </BottomSheet.Body>
          <BottomSheet.Footer>
            {sheet === "discard" ? (
              <>
                <Button
                  fullWidth
                  variant="destructive"
                  loading={running && busy?.action === "discard"}
                  disabled={!actionEnabled || !presentation?.canDiscard}
                  onPress={() => void discard()}
                >
                  Discard saved report
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onPress={() => setSheet("")}
                >
                  Keep report
                </Button>
              </>
            ) : sheet === "diagnostic" ? (
              <Button
                fullWidth
                startContent={<Copy size={18} />}
                onPress={() => void copyDiagnostic()}
                disabled={!selected}
              >
                Copy support reference
              </Button>
            ) : (
              <Button fullWidth variant="outline" onPress={() => setSheet("")}>
                Done
              </Button>
            )}
          </BottomSheet.Footer>
        </BottomSheet.Content>
      </BottomSheet>
      <EvidencePhotoViewer
        photos={
          selected && viewer?.scope === scope && viewer.itemId === selected.id
            ? selected.evidence.map((photo) => ({
                id: photo.id,
                uri: photo.uri,
                status: "ready" as const,
              }))
            : []
        }
        initialIndex={viewer?.index}
        open={
          !!selected && viewer?.scope === scope && viewer.itemId === selected.id
        }
        onClose={() => setViewer(null)}
      />
    </ReportPage>
  );
}
function LabelledOutcome({
  value,
  onChange,
}: {
  value: "confirmed" | "failed";
  onChange: (value: "confirmed" | "failed") => void;
}) {
  return (
    <View className="gap-1">
      <Text weight="semibold" size="sm">
        Next fixture retry result
      </Text>
      <Select
        presentation="content"
        value={value}
        onValueChange={(v) => onChange(v as "confirmed" | "failed")}
      >
        <Select.Item value="confirmed" label="Confirm receipt" />
        <Select.Item value="failed" label="Show photo failure" />
      </Select>
    </View>
  );
}
