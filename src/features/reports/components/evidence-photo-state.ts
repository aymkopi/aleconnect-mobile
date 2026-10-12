export function clampEvidenceIndex(index: number, count: number) {
  return Math.min(
    Math.max(Number.isFinite(index) ? Math.trunc(index) : 0, 0),
    Math.max(0, count - 1),
  );
}

export function isViewableEvidenceUri(uri: string) {
  // React Native resolves bundled Android drawables to local resource names.
  if (/^[a-z][a-z0-9_]*$/.test(uri)) return true;
  try {
    return ["http:", "https:", "file:", "content:", "blob:"].includes(
      new URL(uri).protocol,
    );
  } catch {
    return false;
  }
}
