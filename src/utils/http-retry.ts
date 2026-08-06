const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

export function shouldRetryHttpRequest(
  method: string,
  status: number | undefined,
  callerAborted: boolean,
  idempotentMutation = false,
) {
  return (
    (["GET", "HEAD"].includes(method.toUpperCase()) || idempotentMutation) &&
    !callerAborted &&
    (status === undefined || transientStatuses.has(status))
  );
}
