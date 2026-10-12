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
  const gap = compact ? 8 : 12;
  const rowGap = compact ? 6 : 8;
  const cardHeight = 112;
  const headingHeight = Math.ceil(28 * scale);
  const gridLabelHeight = Math.ceil(22 * scale);
  const gridPadding = compact ? 4 : 10;
  const ctaHeight = 64;
  const iconTileSize = 48;
  const headerHeight = height / 3 - top;
  const available = height - top - bottom;
  const fixed =
    headerHeight +
    cardHeight +
    headingHeight +
    8 +
    gridPadding * 2 +
    2 +
    gridLabelHeight +
    8 +
    ctaHeight +
    gap * 3 +
    (preview ? Math.ceil(16 * scale) + gap : 0);
  const gridBudget = available - fixed;
  const minimumTile = iconTileSize + 4 + Math.ceil(28 * scale);
  const rows = gridBudget >= minimumTile * 3 + rowGap * 2 ? 3 : 2;
  const tileHeight = Math.max(
    minimumTile,
    Math.min(
      Math.ceil(104 * scale),
      Math.floor((gridBudget - (rows - 1) * rowGap) / rows),
    ),
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
