import { useCallback, useEffect, useRef, useState } from "react";
export function useScopedRead<T>(
  scope: string | null,
  read: (force: boolean) => Promise<T>,
) {
  const current = useRef(scope);
  current.current = scope;
  const reader = useRef(read);
  reader.current = read;
  const generation = useRef(0);
  const [state, setState] = useState<{
    scope: string | null;
    data: T | null;
    busy: boolean;
    error: string | null;
    requestKind: "load" | "more";
  }>({ scope: null, data: null, busy: false, error: null, requestKind: "load" });
  const reload = useCallback(
    async (force = false) => {
      const key = scope,
        request = ++generation.current;
      if (!key) return;
      setState((s) => ({
        scope: key,
        data: s.scope === key ? s.data : null,
        busy: true,
        error: null,
        requestKind: "load",
      }));
      try {
        const data = await reader.current(force);
        if (current.current === key && request === generation.current)
          setState({ scope: key, data, busy: false, error: null, requestKind: "load" });
      } catch (error) {
        if (current.current === key && request === generation.current)
          setState((s) => ({
            ...s,
            busy: false,
            requestKind: "load",
            error:
              error instanceof Error
                ? error.message
                : "Could not load. Try again.",
          }));
      }
    },
    [scope],
  );
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const append = useCallback(
    async (readMore: () => Promise<T>, merge: (before: T, next: T) => T) => {
      const key = scope,
        request = ++generation.current;
      if (!key || current.current !== key) return false;
      setState((s) => ({ ...s, busy: true, error: null, requestKind: "more" }));
      try {
        const next = await readMore();
        if (current.current === key && request === generation.current) {
          setState((s) => ({
            scope: key,
            data: s.scope === key && s.data ? merge(s.data, next) : next,
            busy: false,
            requestKind: "more",
            error: null,
          }));
          return true;
        }
        return false;
      } catch (error) {
        if (current.current === key && request === generation.current)
          setState((s) => ({
            ...s,
            busy: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not load more. Try again.",
          }));
        return false;
      }
    },
    [scope],
  );
  return {
    append,
    data: state.scope === scope ? state.data : null,
    busy: scope !== null && (state.scope !== scope || state.busy),
    error: state.scope === scope ? state.error : null,
    errorSource: state.scope === scope && state.error ? state.requestKind : null,
    loadingMore: state.scope === scope && state.busy && state.requestKind === "more",
    reload,
  };
}
