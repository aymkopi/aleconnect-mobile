/** A measured Tour card height tied to the step that produced it. */
export interface TourCardMeasurement {
  order: number | undefined;
  height: number;
}

/**
 * Returns a height only when it belongs to the step currently being rendered.
 * A previous step can be much taller or shorter, so reusing its height would
 * place the next card incorrectly before that card's first layout pass.
 */
export function currentTourCardHeight(
  order: number | undefined,
  measurement: TourCardMeasurement | null
): number | null {
  return measurement && measurement.order === order ? measurement.height : null;
}

/** Stores a card height without churning state for sub-pixel layout noise. */
export function nextTourCardMeasurement(
  order: number | undefined,
  height: number,
  current: TourCardMeasurement | null
): TourCardMeasurement | null {
  if (!Number.isFinite(height) || height <= 0) return current;
  if (current && current.order === order && Math.abs(current.height - height) < 1) {
    return current;
  }
  return { order, height };
}
