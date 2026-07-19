import { Directory, File, Paths } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

// Change this value when ALECO/R2 evidence file-size policy changes.
export const evidenceMaxBytes = 5 * 1024 * 1024;
const evidenceDimension = 1400;
const evidenceCompressionSteps = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

export type PreparedEvidencePhoto = {
  id: string;
  uri: string;
  size: number;
};

export async function prepareEvidencePhoto(
  sourceUri: string,
  reportId: string,
  photoId: string,
): Promise<PreparedEvidencePhoto> {
  const directory = new Directory(Paths.document, "report-evidence", reportId);
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${photoId}.webp`);

  for (const quality of evidenceCompressionSteps) {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: evidenceDimension } }],
      { format: ImageManipulator.SaveFormat.WEBP, compress: quality },
    );
    const compressed = new File(result.uri);

    if (compressed.size <= evidenceMaxBytes) {
      if (destination.exists) destination.delete();
      compressed.copy(destination);
      return { id: photoId, uri: destination.uri, size: destination.size };
    }
  }

  throw new Error("Photo is too large. Choose a smaller photo.");
}

export function readEvidencePhoto(uri: string) {
  return new File(uri).arrayBuffer();
}

export function deleteEvidencePhoto(uri: string) {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function deleteReportEvidence(reportId: string) {
  const directory = new Directory(Paths.document, "report-evidence", reportId);
  if (directory.exists) directory.delete();
}
