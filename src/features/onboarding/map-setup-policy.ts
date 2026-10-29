type Dependencies = {
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
  status(): Promise<{ state: string }>;
  online(): Promise<boolean>;
};
const key = (principalId: string) => `albay_map_setup_required_v1:${encodeURIComponent(principalId)}`;

export function createNativeMapSetup(dependencies: Dependencies) {
  const offered = new Set<string>();
  return {
    async offer(principalId: string, sessionId: string, current = () => true) {
      if (!principalId) return false;
      const pending = await dependencies.storage.getItem(key(principalId));
      // Native resources, never an optional welcome hint, establish completion.
      if ((await dependencies.status()).state === "ready") {
        if (pending !== null) await dependencies.storage.removeItem(key(principalId));
        return false;
      }
      if (pending !== "required") await dependencies.storage.setItem(key(principalId), "required");
      const session = JSON.stringify([principalId, sessionId]);
      if (!await dependencies.online() || !current() || offered.has(session)) return false;
      offered.add(session);
      return true;
    },
    async finish(principalId: string) {
      if (!principalId || (await dependencies.status()).state !== "ready") throw Error("Finish downloading the Albay map to complete setup.");
      await dependencies.storage.removeItem(key(principalId));
    },
  };
}
