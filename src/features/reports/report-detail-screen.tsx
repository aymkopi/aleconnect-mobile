import { DataNotice, DataState } from "@/components/data-state";
import { appScrollableBottomPadding } from "@/components/floating-app-bar";
import { Button } from "@/components/panelui/button";
import { ConsumerUpdatesSection } from "./consumer-updates-section";
import { ConsumerRatingAction } from './consumer-rating-action';
import { ServiceRequestProgressCard } from "@/features/services/service-request-fields";
import { Skeleton } from "@/components/panelui/skeleton";
import { Text } from "@/components/panelui/text";
import { toast } from "@/components/panelui/toast";
import { useConsumerAccountContext } from "@/context/consumer-account-context";
import { useVisualPreview } from "@/context/visual-preview-context";
import { StaticLocationMap } from "@/features/maps/static-location-map";
import { useAppColors } from "@/hooks/use-app-colors";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useManualRefresh } from "@/hooks/use-manual-refresh";
import { markNotificationsRead } from "@/services/notifications";
import { requestReportRevalidation } from "@/services/report-sync-events";
import {
  clearReportListCache,
  fetchComplaintReportDetail,
} from "@/services/reports";
import { isApiInstantExpired, parseApiInstant } from "@/utils/manila-time";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { ChevronRight, Copy } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { BackHandler, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EvidencePhotoViewer } from "./components/evidence-photo-viewer";
import { ReportPage } from "./components/report-page";
import {
  consumerTicketStatusLabel,
  formatReportDate,
  preserveKnownConsumerReportDetailStatus,
  type ConsumerServiceMemoUpdate,
  type ReportDetail,
} from "./data";
import { reportDetailFixture } from "./detail-fixtures";
import {
  publishedRestorationEstimate,
  reportAccessUnavailable,
  reportDetailScope,
  reportRejectionReason,
} from "./detail-presentation";
import {
  ExtendedOutageStatusCard,
  operationalPhaseLabel,
} from "./extended-outage-status-card";
import { ReportStatusBadge } from "./report-status-badge";
import { ReportTimeline } from "./report-timeline";

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row gap-2 items-start">
      <Text muted style={{ fontSize: 13, lineHeight: 18, width: 100 }}>
        {label}
      </Text>
      <Text
        className="flex-1 text-right"
        style={{ fontSize: 13, lineHeight: 18 }}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

function EvidenceThumbnail({
  uri,
  index,
  count,
  expired,
  onPress,
  onError,
}: {
  uri: string;
  index: number;
  count: number;
  expired: boolean;
  onPress: () => void;
  onError: () => void;
}) {
  const focused = useIsFocused();
  const [phase, setPhase] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View evidence photo ${index + 1} of ${count}`}
      className="flex-1 rounded-xl overflow-hidden bg-muted"
      style={{ height: 80 }}
      onPress={onPress}
    >
      {expired ? (
        <View className="flex-1 items-center justify-center">
          <Text size="xs" muted>
            Photo expired
          </Text>
        </View>
      ) : (
        <>
          <Image
            source={{ uri }}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={{ width: "100%", height: "100%" }}
            accessibilityLabel={`Evidence thumbnail ${index + 1}`}
            onLoad={() => setPhase("loaded")}
            onError={() => {
              setPhase("error");
              onError();
            }}
          />
          {phase !== "loaded" ? (
            <View className="absolute inset-0 items-center justify-center bg-muted">
              {phase === "error" ? (
                <Text size="xs" muted>
                  Tap to retry
                </Text>
              ) : (
                <Skeleton
                  animated={focused}
                  className="absolute inset-0 rounded-lg"
                  label={`Loading evidence photo ${index + 1}`}
                />
              )}
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

function ServiceUpdateView({
  update,
  report,
  onClose,
  onReadAdvisories,
}: {
  update: ConsumerServiceMemoUpdate;
  report: ReportDetail;
  onClose: () => void;
  onReadAdvisories: () => void;
}) {
  const estimate = publishedRestorationEstimate(update);
  return (
    <Modal visible onRequestClose={onClose} animationType="slide">
      <ReportPage
        title="Service update"
        onBack={onClose}
        footer={
          <>
            <Button fullWidth variant="outline" onPress={onReadAdvisories}>
              Read public advisories
            </Button>
            <Button fullWidth onPress={onClose}>
              Back to report
            </Button>
          </>
        }
      >
        <Text
          weight="semibold"
          style={{ fontSize: 18, lineHeight: 26 }}
          accessibilityRole="header"
        >
          Update from ALECO
        </Text>
        <View className="rounded-xl bg-card p-3 gap-2">
          <Text size="sm" weight="semibold">
            {update.operationalPhase
              ? operationalPhaseLabel(update.operationalPhase)
              : operationalPhaseLabel(update.type)}
          </Text>
          <Text size="sm" selectable>
            {update.body}
          </Text>
          {parseApiInstant(update.publishedAt) ? (
            <Text muted size="xs">
              Published {formatReportDate(update.publishedAt)}
            </Text>
          ) : null}
        </View>
        {update.operationalPhase ||
        update.estimateStartAt ||
        update.estimateEndAt ||
        update.estimateUnavailableReason ||
        update.nextUpdateDueAt ? (
          <View className="rounded-xl bg-card p-3 gap-2">
            <Text size="sm" weight="semibold">
              Restoration information
            </Text>
            <Text size="sm">{estimate}</Text>
            <Text muted size="sm">
              {parseApiInstant(update.nextUpdateDueAt ?? "")
                ? `Next update by ${formatReportDate(update.nextUpdateDueAt!)}`
                : "A next update time has not been published."}
            </Text>
          </View>
        ) : null}
        <View className="rounded-xl bg-card p-3 gap-1">
          <Text size="sm" weight="semibold">
            Your report
          </Text>
          <Text size="sm" weight="medium">{report.ticketNumber}</Text>
          <Text muted size="xs">{consumerTicketStatusLabel(report.status)}</Text>
        </View>
        <Text muted size="sm">
          Updates may change as field work progresses. Times shown here are the
          estimates published by ALECO.
        </Text>
      </ReportPage>
    </Modal>
  );
}

export default function ReportDetailScreen({ followUp = false }: { followUp?: boolean } = {}) {
  const router = useRouter();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{
    id: string;
    focus?: string;
    serviceAccountId?: string;
    previewState?: string;
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const serviceAccountId = Array.isArray(params.serviceAccountId)
    ? params.serviceAccountId[0]
    : params.serviceAccountId;
  const { session, isLoading: sessionLoading } = useAuthSession();
  const {
    accountContext,
    isLoading: accountLoading,
    refreshConsumerAccount,
  } = useConsumerAccountContext();
  const { fixtures } = useVisualPreview();
  const insets = useSafeAreaInsets();
  const [primary] = useAppColors(["primary"]);
  const scope = fixtures
    ? `fixture:${id}:${params.previewState ?? ""}`
    : reportDetailScope({
        principalId: session?.user.id ?? null,
        sessionId: session?.session.id ?? null,
        identityId: accountContext?.identityUserId ?? null,
        reportId: id,
        serviceAccountId,
        accessRevision: accountContext?.accessRevision ?? 0,
        authorizedServiceAccountIds:
          accountContext?.authorizedServiceAccountIds ?? [],
      });
  const scopeRef = useRef(scope);
  useLayoutEffect(() => {
    scopeRef.current = scope;
    return () => {
      scopeRef.current = null;
    };
  }, [scope]);
  const previous = useRef<{ scope: string; report: ReportDetail } | null>(null);
  const evidenceAttempt = useRef<string | null>(null);
  const lastFocus = useRef<string | null>(null);
  const [viewer, setViewer] = useState<{
    scope: string | null;
    index: number;
  } | null>(null);
  const [updateSelection, setUpdateSelection] = useState<{
    scope: string | null;
    update: ConsumerServiceMemoUpdate;
  } | null>(null);
  const [readReceiptError, setReadReceiptError] = useState(false);
  const markedUpdates = useRef<string>("");
  const read = useScopedRead<{
    report: ReportDetail | null;
    isStale: boolean;
    unavailableReason?: string;
  }>(scope, async (refreshEvidence) => {
    if (fixtures && params.previewState === "unavailable")
      throw new Error("Visual fixture: report is unavailable.");
    let next: ReportDetail;
    try {
      next = fixtures
        ? reportDetailFixture(id, params.previewState)
        : await fetchComplaintReportDetail(id, {
            serviceAccountId,
            accessRevision: accountContext?.accessRevision,
            refreshEvidence,
          });
    } catch (error) {
      if (!reportAccessUnavailable(error)) throw error;
      return {
        report: null,
        isStale: false,
        unavailableReason:
          "This report is not available with your current account access. Return to your reports or contact ALECO.",
      };
    }
    const preserved = preserveKnownConsumerReportDetailStatus(
      next,
      previous.current?.scope === scope ? previous.current.report : null,
    );
    return {
      report: preserved.report,
      isStale:
        preserved.hasUnsupportedStatus ||
        (fixtures && params.previewState === "stale"),
    };
  });
  const { reload, data } = read;
  const { refresh, refreshing } = useManualRefresh(
    "reports",
    fixtures ? "fixture" : accountContext?.identityUserId ?? session?.user.id ?? null,
    () => read.reload(true),
    !fixtures && read.busy,
  );
  const report = data?.report;
  useLayoutEffect(() => {
    previous.current =
      scope && data?.report ? { scope, report: data.report } : null;
  }, [scope, data]);
  useEffect(() => {
    const ids = report?.unreadNotificationIds ?? [];
    if (
      !focused ||
      fixtures ||
      !scope ||
      !report ||
      !session ||
      !accountContext ||
      !ids.length ||
      data?.isStale
    )
      return;
    const key = JSON.stringify([scope, ids]);
    if (markedUpdates.current === key) return;
    markedUpdates.current = key;
    setReadReceiptError(false);
    void markNotificationsRead(ids, session.user.id, {
      identityUserId: accountContext.identityUserId,
      accessRevision: accountContext.accessRevision,
      serviceAccountId:
        report.serviceAccountId ??
        serviceAccountId ??
        accountContext.defaultServiceAccountId,
      isCurrent: () => scopeRef.current === scope,
    })
      .then(async () => {
        await clearReportListCache(accountContext.identityUserId);
        requestReportRevalidation(session.user.id);
      })
      .catch(() => {
        if (scopeRef.current === scope) {
          markedUpdates.current = "";
          setReadReceiptError(true);
        }
      });
  }, [
    focused,
    fixtures,
    scope,
    report,
    session,
    accountContext,
    serviceAccountId,
    data?.isStale,
  ]);
  const expired = Boolean(
    report?.imageUrlsExpiresAt &&
    isApiInstantExpired(report.imageUrlsExpiresAt),
  );
  const refreshEvidenceOnce = useCallback(() => {
    if (!scope || fixtures || !report) return;
    const key = JSON.stringify([scope, report.imageUrlsExpiresAt]);
    if (evidenceAttempt.current === key) return;
    evidenceAttempt.current = key;
    void reload(true);
  }, [scope, fixtures, report, reload]);
  const handleBack = useCallback(() => {
    if (followUp) { router.dismissTo({ pathname: "/reports/[id]", params: { id, ...(serviceAccountId ? { serviceAccountId } : {}) } }); return; }
    if (router.canGoBack()) router.back();
    else router.replace("/reports");
  }, [router, followUp, id, serviceAccountId]);
  useFocusEffect(
    useCallback(() => {
      if (scope && lastFocus.current === scope) void reload();
      lastFocus.current = scope;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [scope, reload, handleBack]),
  );
  useEffect(() => {
    if (!report?.imageUrlsExpiresAt) return;
    if (expired) {
      refreshEvidenceOnce();
      return;
    }
    const expiry = parseApiInstant(report.imageUrlsExpiresAt);
    if (!expiry) return;
    const timer = setTimeout(
      refreshEvidenceOnce,
      Math.min(2_147_483_647, Math.max(0, expiry.getTime() - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [report?.imageUrlsExpiresAt, expired, refreshEvidenceOnce]);
  const address = report
    ? [
        report.purok,
        report.barangayName,
        report.municipalityName,
        report.landmark,
      ]
        .filter(Boolean)
        .join(", ") || report.displayAddress
    : "";
  const photos = (report?.imageUrls ?? []).map((uri, index) => ({
    id: `evidence-${index}`,
    uri: expired ? "" : uri,
    status: expired ? ("failed" as const) : ("ready" as const),
  }));
  const selectedUpdate =
    updateSelection?.scope === scope ? updateSelection.update : null;
  const rejectionReason = report ? reportRejectionReason(report) : null;
  const waiting =
    sessionLoading || (!accountContext && accountLoading) || read.busy;
  const accountUnavailable = Boolean(
    !fixtures &&
    serviceAccountId &&
    accountContext &&
    !accountContext.authorizedServiceAccountIds.includes(serviceAccountId),
  );
  const reportUnavailable = Boolean(
    read.data?.unavailableReason || accountUnavailable,
  );
  const scopeError =
    !session && !fixtures
      ? "Sign in to view this report."
      : serviceAccountId &&
          !accountContext?.authorizedServiceAccountIds.includes(
            serviceAccountId,
          )
        ? "This service account is no longer linked. Return to your reports to select an available account."
        : "Your account access could not be confirmed. Try again.";

  if (followUp && report && !fixtures && session && accountContext && report.serviceAccountId && accountContext.authorizedServiceAccountIds.includes(report.serviceAccountId)) {
    return <ConsumerUpdatesSection key={`${scope}:follow-up`} screen ticketId={report.id} serviceAccountId={report.serviceAccountId} scope={{ principalId: session.user.id, identityUserId: accountContext.identityUserId, accessRevision: accountContext.accessRevision, authorizedServiceAccountIds: accountContext.authorizedServiceAccountIds }} featureAvailable={accountContext.capabilities.reportUpdates === true} retired={Boolean(report.closurePolicy)} serviceFeedbackAvailable={accountContext.capabilities.serviceFeedback===true} active={focused} ticketNumber={report.ticketNumber} title={report.title} onBack={handleBack} />;
  }
  return (
    <ReportPage
      title={followUp ? "Follow-up" : "Ticket details"}
      onBack={handleBack}
      headerAction={!fixtures&&report&&session&&accountContext&&report.serviceAccountId&&accountContext.authorizedServiceAccountIds.includes(report.serviceAccountId)?<ConsumerRatingAction key={`${scope}:rating`} ticketId={report.id} serviceAccountId={report.serviceAccountId} scope={{principalId:session.user.id,identityUserId:accountContext.identityUserId,accessRevision:accountContext.accessRevision,authorizedServiceAccountIds:accountContext.authorizedServiceAccountIds}} available={accountContext.capabilities.serviceFeedback===true} ticketNumber={report.ticketNumber} closurePolicy={report.closurePolicy} refreshRequest={refreshing} onClosed={()=>{if(scopeRef.current===scope){requestReportRevalidation(session.user.id);void reload(true);}}}/>:undefined}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {!report ? (
        waiting ? (
          <DataState
            loading
            loadingLayout="detail"
            title="Loading report details"
          />
        ) : (
          <DataState
            title={
              reportUnavailable
                ? "This report is unavailable"
                : "Report details couldn’t load"
            }
            description={
              read.data?.unavailableReason ??
              (!scope
                ? scopeError
                : "Reconnect and retry. Your report has not been changed.")
            }
            actionLabel={
              !session && !fixtures
                ? "Sign in"
                : reportUnavailable
                  ? "Back to reports"
                  : "Try again"
            }
            onAction={() => {
              if (!session && !fixtures) router.push("/sign-in");
              else if (reportUnavailable) router.dismissTo("/reports");
              else if (!accountContext && !fixtures)
                void refreshConsumerAccount().catch(() => {});
              else void refresh();
            }}
          />
        )
      ) : (
        <>
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-1">
              <Text size="sm" weight="medium" selectable className="shrink">
                {report.ticketNumber}
              </Text>
              <Button
                size="icon"
                variant="ghost"
                accessibilityLabel="Copy ticket number"
                onPress={() => void Clipboard.setStringAsync(report.ticketNumber).then(
                  copied => toast.show(copied ? { label: "Ticket number copied" } : { variant: "destructive", label: "Could not copy the ticket number" }),
                  () => toast.show({ variant: "destructive", label: "Could not copy the ticket number" }),
                )}
              >
                <Copy size={16} color={primary} />
              </Button>
            </View>
            <View className="self-center">
              <ReportStatusBadge status={report.status} />
            </View>
          </View>
          <View className="gap-1">
            <Text
              weight="semibold"
              style={{ fontSize: 16, lineHeight: 22 }}
              accessibilityRole="header"
            >
              {report.title}
            </Text>
            <Text muted size="xs">
              Submitted {formatReportDate(report.createdAt)}
            </Text>
          </View>
          {read.error || read.data?.isStale ? (
            <DataNotice
              title="Showing the last loaded report"
              description="Your report reference is still available. Refresh to confirm the latest status."
              actionLabel="Refresh report"
              busy={read.busy}
              onAction={refresh}
            />
          ) : null}
          {report.status === "rejected" ? (
            <View className="rounded-xl bg-card p-3 gap-1">
              <Text size="sm" weight="semibold">
                Reason from ALECO
              </Text>
              <Text size="sm">
                {rejectionReason ??
                  "A rejection reason has not been published. Contact ALECO for more information."}
              </Text>
            </View>
          ) : null}
          {readReceiptError ? (
            <Text size="xs" muted>
              Could not mark this update as read. It stays unread until you
              reopen the report online.
            </Text>
          ) : null}
          <ReportTimeline report={report} />
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onPress={() =>
              router.push({
                pathname: "/reports/timeline",
                params: {
                  id,
                  ...(serviceAccountId ? { serviceAccountId } : {}),
                },
              })
            }
          >
            What the statuses mean <ChevronRight size={16} color={primary} />
          </Button>
          <View className="rounded-xl bg-card p-3 gap-2">
            <DetailRow label="Type" value={report.typeTitle} />
            <DetailRow label="Category" value={report.categoryTitle} />
            <DetailRow label="Location" value={address} />
            <DetailRow label="Desired action" value={report.actionDesired} />
            <DetailRow
              label="Account"
              value={report.accountName}
            />
            <DetailRow label="Account number" value={report.accountNumber} />
            <DetailRow
              label="Category details"
              value={report.reportDetails?.categoryDescription}
            />
            <DetailRow
              label="Type details"
              value={report.reportDetails?.typeDescription}
            />
            <DetailRow
              label="Registered name"
              value={report.reportDetails?.kwhmTransfer?.currentRegisteredName}
            />
            <DetailRow
              label="Requested name"
              value={
                report.reportDetails?.kwhmTransfer?.requestedRegisteredName
              }
            />
            {!report.reportDetails ? (
              <DetailRow label="Description" value={report.description} />
            ) : null}
            {report.latitude !== null &&
            report.longitude !== null &&
            Number.isFinite(report.latitude) &&
            Number.isFinite(report.longitude) ? (
              <StaticLocationMap
                latitude={report.latitude}
                longitude={report.longitude}
                label={address || "Reported location"}
                fixture={fixtures}
              />
            ) : null}
          </View>

          {!fixtures && session && accountContext && report.serviceAccountId && accountContext.authorizedServiceAccountIds.includes(report.serviceAccountId) ? <ConsumerUpdatesSection key={`${scope}:consumer-updates`} ticketId={report.id} serviceAccountId={report.serviceAccountId} scope={{ principalId: session.user.id, identityUserId: accountContext.identityUserId, accessRevision: accountContext.accessRevision, authorizedServiceAccountIds: accountContext.authorizedServiceAccountIds }} featureAvailable={accountContext.capabilities.reportUpdates === true} retired={Boolean(report.closurePolicy)} serviceFeedbackAvailable={accountContext.capabilities.serviceFeedback === true} active={focused} ticketNumber={report.ticketNumber} title={report.title} refreshRequest={refreshing} onOpen={() => router.push({ pathname: "/reports/follow-up", params: { id: report.id, serviceAccountId: report.serviceAccountId! } })} /> : null}
          {report.closurePolicy&&["resolved","closed"].includes(report.status??"")?<View className="gap-2">{report.status==="resolved"&&report.closurePolicy.closesAt?<Text size="xs" muted>Closes {formatReportDate(report.closurePolicy.closesAt)}</Text>:null}<Button variant="outline" onPress={()=>router.push("/reports/new")}>Report another issue</Button></View>:null}
          {report.serviceRequest ? <ServiceRequestProgressCard value={report.serviceRequest} /> : null}
          <View className="gap-2">
            <Text weight="medium" size="sm">
              Evidence
            </Text>
            {photos.length ? (
              <View className="flex-row gap-2">
                {photos.slice(0, 3).map((photo, index) => (
                  <EvidenceThumbnail
                    key={`${scope}:${photo.id}:${photo.uri}`}
                    uri={photo.uri}
                    index={index}
                    count={photos.length}
                    expired={expired}
                    onError={refreshEvidenceOnce}
                    onPress={() => {
                      if (expired) refreshEvidenceOnce();
                      setUpdateSelection(null);
                      setViewer({ scope, index });
                    }}
                  />
                ))}
              </View>
            ) : (
              <Text size="xs" muted>
                No evidence photos are available for this report.
              </Text>
            )}
            {expired ? (
              <Text size="xs" muted>
                Photo access has expired. Refresh the report to renew available
                evidence.
              </Text>
            ) : null}
          </View>
          <ExtendedOutageStatusCard
            updates={report.publicUpdates}
            onPress={() => {
              const update =
                report.publicUpdates[report.publicUpdates.length - 1];
              if (!update) return;
              setViewer(null);
              setUpdateSelection({
                scope,
                update: report.consumerUpdates.find(
                  (item) => item.id === update.id,
                ) ?? {
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
                },
              });
            }}
          />
          {report.consumerUpdates.length ? (
            <View className="gap-2">
              <Text weight="semibold" size="sm">
                Service Memo updates
              </Text>
              {report.consumerUpdates.map((update) => (
                <Pressable
                  key={update.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Read ${operationalPhaseLabel(update.type)} from ALECO`}
                  onPress={() => {
                    setViewer(null);
                    setUpdateSelection({ scope, update });
                  }}
                  className="rounded-xl bg-card p-3 gap-1"
                  style={{ minHeight: 64 }}
                >
                  <View className="flex-row gap-2 items-center">
                    <Text size="sm" weight="semibold" className="flex-1">
                      {operationalPhaseLabel(update.type)}
                    </Text>
                    <ChevronRight size={18} color={primary} />
                  </View>
                  <Text size="sm" numberOfLines={3}>
                    {update.body}
                  </Text>
                  {parseApiInstant(update.publishedAt) ? (
                    <Text muted size="xs">
                      {formatReportDate(update.publishedAt)}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          <View className="gap-2">
            {report.status === "rejected" ? (
              <>
                <Button fullWidth onPress={() => router.push("/reports/new")}>
                  Create a new report
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onPress={() => router.push("/hotlines")}
                >
                  Contact ALECO
                </Button>
              </>
            ) : null}
          </View>
          <EvidencePhotoViewer
            key={scope}
            photos={photos}
            initialIndex={viewer?.scope === scope ? viewer.index : 0}
            open={viewer?.scope === scope}
            onClose={() => setViewer(null)}
          />
          {selectedUpdate ? (
            <ServiceUpdateView
              update={selectedUpdate}
              report={report}
              onClose={() => setUpdateSelection(null)}
              onReadAdvisories={() => {
                setUpdateSelection(null);
                router.push("/advisories");
              }}
            />
          ) : null}
        </>
      )}
      <View style={{ height: appScrollableBottomPadding(insets.bottom) }} />
    </ReportPage>
  );
}
