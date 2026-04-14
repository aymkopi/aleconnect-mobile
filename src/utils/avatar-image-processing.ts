const avatarMaxBytes = 20 * 1024;
const avatarDimension = 300;
const avatarCompressionSteps = [
  0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1,
];

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function compressAvatarToStrictLimit(
  uri: string,
): Promise<ArrayBuffer> {
  const ImageManipulator = await import("expo-image-manipulator");

  for (const quality of avatarCompressionSteps) {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: avatarDimension, height: avatarDimension } }],
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
    if (imageBytes.byteLength <= avatarMaxBytes) {
      return imageBytes;
    }
  }

  throw new Error(
    "Image could not be compressed to 300x300 and 20KB. Please choose a simpler image.",
  );
}
