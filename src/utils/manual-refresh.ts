const refreshes = new Map<string, { times: number[]; pending: boolean }>();

export function claimManualRefresh(key: string, now = Date.now()) {
  const state = refreshes.get(key) ?? { times: [], pending: false };
  state.times = state.times.filter((time) => now - time < 60_000);
  if (state.pending)
    return { allowed: false, pending: true, retryAfterMs: 0 } as const;
  const last = state.times.at(-1);
  const next = Math.max(
    last === undefined ? now : last + 3_000,
    state.times.length < 3 ? now : state.times[0] + 60_000,
  );
  if (next > now)
    return { allowed: false, pending: false, retryAfterMs: next - now } as const;
  state.times.push(now);
  state.pending = true;
  refreshes.set(key, state);
  return {
    allowed: true,
    finish: () => { state.pending = false; },
  } as const;
}
