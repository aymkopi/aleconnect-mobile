import { Asset } from "expo-asset";
import { fixtureReports } from "@/features/main-fixtures";
import {
  parseConsumerTicketStatus,
  type ReportDetail,
  type ConsumerTicketStatus,
} from "./data";

const stages: ConsumerTicketStatus[] = [
  "under_review",
  "verified",
  "dispatched",
  "in_progress",
  "resolved",
  "closed",
];
export function reportDetailFixture(id: string, state?: string): ReportDetail {
  const base =
    fixtureReports.find((report) => report.id === id) ?? fixtureReports[0];
  const status =
    state === "unknown"
      ? null
      : (parseConsumerTicketStatus(state) ?? base.status);
  const reached =
    status === "rejected"
      ? (["under_review", "rejected"] as ConsumerTicketStatus[])
      : stages.slice(0, stages.indexOf(status as ConsumerTicketStatus) + 1);
  return {
    ...base,
    status,
    imageUrls:
      state === "evidence-error"
        ? ["file:///fixture-evidence-missing.webp"]
        : [
            Asset.fromModule(
              require("../../../assets/aleconnect/report-evidence-1.png"),
            ).uri,
            Asset.fromModule(
              require("../../../assets/aleconnect/report-evidence-2.png"),
            ).uri,
            Asset.fromModule(
              require("../../../assets/aleconnect/report-evidence-3.png"),
            ).uri,
          ],
    imageUrlsExpiresAt: null,
    consumerMessage:
      status === "verified"
        ? "Similar reports in your area are linked to one active incident. ALECO will post updates as work progresses."
        : null,
    actionDesired: "Restore power as soon as possible",
    purok: "Zone 3",
    barangayPsgc: null,
    barangayName: "Bigaa",
    municipalityName: "Legazpi City",
    landmark: null,
    latitude: null,
    longitude: null,
    history: reached.map((toStatus, index) => ({
      id: `fixture-history-${index}`,
      fromStatus: reached[index - 1] ?? null,
      toStatus,
      changedAt: `2026-10-07T0${index + 1}:00:00Z`,
      note:
        toStatus === "rejected"
          ? "The selected account does not match the service location. Please confirm your account and location before creating another report."
          : null,
    })),
    publicUpdates: [],
    consumerUpdates:
      state === "incident-update" || state === "incident-eta"
        ? [
            {
              id: "fixture-service-update",
              type: "operational_note",
              body: "ALECO is assessing the affected line. Updates will appear here as field work progresses.",
              publishedAt: "2026-10-07T02:20:00Z",
              operationalPhase: "assessing_damage",
              estimateStartAt:
                state === "incident-eta" ? "2026-10-07T03:00:00Z" : null,
              estimateEndAt:
                state === "incident-eta" ? "2026-10-07T05:00:00Z" : null,
              estimateUnavailableReason:
                state === "incident-eta"
                  ? null
                  : "Restoration time has not been confirmed.",
              nextUpdateDueAt: "2026-10-07T06:00:00Z",
              classification: "extended_outage",
            },
          ]
        : [],
  };
}
