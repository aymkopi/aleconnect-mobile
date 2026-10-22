export function getHomeLayout({
  height,
  top,
  bottom,
  fontScale,
  preview,
}: {
  height: number;
  top: number;
  bottom: number;
  fontScale: number;
  preview: boolean;
}) {
  const scale = Math.max(1, fontScale);
  const compact = height < 960 || scale > 1.15 || preview;
  const preferredGap = compact ? 14 : 16;
  const rowGap = compact ? 6 : 8;
  const cardHeight = 112;
  const headingHeight = Math.ceil(28 * scale);
  const gridLabelHeight = Math.ceil(22 * scale);
  const gridPadding = compact ? 8 : 14;
  const ctaHeight = 64;
  const iconTileSize = 48;
  const headerHeight = height / 3 - top;
  const available = height - top - bottom;
  const minimumTile = iconTileSize + 4 + Math.ceil(28 * scale);
  const fixed =
    headerHeight +
    cardHeight +
    headingHeight +
    8 +
    gridPadding * 2 +
    gridLabelHeight +
    ctaHeight +
    (preview ? Math.ceil(16 * scale) : 0);
  const gapCount = preview ? 5 : 4;
  const gap = Math.max(
    8,
    Math.min(
      preferredGap,
      Math.floor((available - fixed - minimumTile * 2 - rowGap + 0.5) / gapCount),
    ),
  );
  const gridBudget = available - fixed - gap * gapCount;
  const rows = 2;
  const tileHeight = Math.max(
    minimumTile,
    Math.floor((gridBudget - rowGap) / rows),
  );
  const scrollRequired =
    tileHeight * rows + (rows - 1) * rowGap > gridBudget + 0.5;
  return {
    headerHeight,
    tileHeight,
    rows,
    cardHeight,
    headingHeight,
    gridLabelHeight,
    gridPadding,
    ctaHeight,
    iconTileSize,
    gap,
    rowGap,
    compact,
    compactHeader: headerHeight < 210 * scale,
    denseHeader: headerHeight < 156 * scale,
    scrollRequired,
  };
}
