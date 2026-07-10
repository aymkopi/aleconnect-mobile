// Change this value when ALECO/R2 evidence file-size policy changes.
const evidenceMaxBytes = 5 * 1024 * 1024;
const evidenceDimension = 1400;
const evidenceCompressionSteps = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function compressEvidencePhoto(uri: string): Promise<ArrayBuffer> {
  const ImageManipulator = await import("expo-image-manipulator");

  for (const quality of evidenceCompressionSteps) {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: evidenceDimension } }],
      {
        format: ImageManipulator.SaveFormat.WEBP,
        compress: quality,
        base64: true,
      },
    );

    if (!manipulated.base64) {
      continue;
    }

    const imageBytes = base64ToArrayBuffer(manipulated.base64);
    if (imageBytes.byteLength <= evidenceMaxBytes) {
      return imageBytes;
    }
  }

  throw new Error("Photo is too large. Choose a smaller photo.");
}
