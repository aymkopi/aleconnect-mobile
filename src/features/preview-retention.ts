import AsyncStorage from "@react-native-async-storage/async-storage";
import { isDevice } from "expo-device";
import { Directory, File, Paths } from "expo-file-system";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import type { ReportQueueItem } from "@/services/report-queue";

const queueKey = "report_submission_queue_v1";
const receiptKey = "report_submission_completions_v1";
const fixtureId = "__panelui_emulator_retention__";
function assertEmulatorPreview() {
  if (!PANELUI_PREVIEW || isDevice)
    throw new Error("This check is available only in the emulator preview.");
}
export async function seedEmulatorRetentionFixture() {
  assertEmulatorPreview();
  const values = await AsyncStorage.multiGet([
    queueKey,
    receiptKey,
    "auth_session_cache_v1",
  ]);
  if (values.some(([, value]) => value && value !== "[]"))
    throw new Error(
      "Existing account or report data found. Nothing was changed.",
    );
  const directory = new Directory(Paths.document, "report-evidence", fixtureId);
  directory.create({ idempotent: true, intermediates: true });
  const photo = new File(directory, "fixture.png");
  photo.create({ overwrite: true });
  photo.write(
    new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
      0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84,
      120, 218, 99, 252, 255, 31, 0, 3, 3, 2, 0, 239, 162, 125, 91, 0, 0, 0, 0,
      73, 69, 78, 68, 174, 66, 96, 130,
    ]),
  );
  const now = new Date().toISOString();
  const item: ReportQueueItem = {
    id: fixtureId,
    idempotencyKey: fixtureId,
    userId: fixtureId,
    identityUserId: fixtureId,
    serviceAccountId: fixtureId,
    accessRevision: 0,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    attempts: 0,
    lastError: null,
    lastErrorPhase: null,
    diagnosticId: null,
    ticketId: null,
    ticketNumber: null,
    title: "Emulator retention fixture — never submit",
    payload: {
      typeId: fixtureId,
      accountNumber: fixtureId,
      barangayPsgc: "",
      purok: "",
      landmark: "",
      actionDesired: "Preview-only retained data check",
      latitude: null,
      longitude: null,
    },
    evidence: [{ id: "fixture", uri: photo.uri, size: photo.size }],
  };
  await AsyncStorage.multiSet([
    [queueKey, JSON.stringify([item])],
    [
      receiptKey,
      JSON.stringify([
        {
          id: fixtureId,
          userId: fixtureId,
          ticketId: fixtureId,
          ticketNumber: "PREVIEW-ONLY",
          completedAt: now,
        },
      ]),
    ],
  ]);
  return readEmulatorRetentionSnapshot();
}
export async function readEmulatorRetentionSnapshot() {
  assertEmulatorPreview();
  const values = await AsyncStorage.multiGet([queueKey, receiptKey]);
  const digest = new File(Paths.cache, "panelui-retention-digest.json");
  digest.create({ overwrite: true });
  digest.write(JSON.stringify(values));
  const storageDigest = digest.md5;
  digest.delete();
  const queue = JSON.parse(values[0][1] || "[]") as ReportQueueItem[];
  const evidence = queue
    .flatMap((item) => item.evidence)
    .map((photo) => {
      const file = new File(photo.uri);
      return {
        exists: file.exists,
        bytes: file.exists ? file.size : 0,
        digest: file.exists ? file.md5 : null,
      };
    });
  return JSON.stringify(
    { storageDigest, queueCount: queue.length, evidence },
    null,
    2,
  );
}
