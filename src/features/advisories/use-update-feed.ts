import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { useVisualPreview } from "@/context/visual-preview-context";
import {
  fetchPublicUpdates,
  type MobilePublicUpdatesPage,
} from "@/services/public-updates";
import { fixtureUpdates } from "@/features/main-fixtures";
export function useUpdateFeed() {
  const { session, isLoading } = useAuthSession(),
    { accountContext } = useConsumerAccount(),
    { publicFixtures: fixtures } = useVisualPreview();
  const userId = session?.user.id;
  const options = {
    userId: userId ?? "guest",
    publicOnly: !session,
    identityUserId: accountContext?.identityUserId,
    accessRevision: accountContext?.accessRevision,
    limit: 20,
  };
  const scope =
    !fixtures && !isLoading
      ? JSON.stringify([userId ? "private" : "public",userId, options.identityUserId, options.accessRevision])
      : null;
  const read = async (
    force = false,
    cursor?: string | null,
  ): Promise<MobilePublicUpdatesPage & { signIn?: boolean }> => {
    try {
      return await fetchPublicUpdates({ ...options, force, cursor });
    } catch (error) {
      if ([401, 403].includes((error as { status?: number })?.status ?? 0))
        return { items: [], nextCursor: null, signIn: true };
      throw error;
    }
  };
  const feed = useScopedRead(scope, (force) => read(force));
  const loadMore = () => {
    if (feed.busy || !feed.data?.nextCursor || feed.data.isStale) return Promise.resolve(false);
    return feed.append(
      () => read(false, feed.data?.nextCursor),
      (before, next) => ({
        ...next,
        items: next.signIn
          ? []
          : [
              ...new Map(
                [...before.items, ...next.items].map((item) => [
                  item.kind + item.id,
                  item,
                ]),
              ).values(),
            ],
      }),
    );
  };
  return {
    ...feed,
    loadMore,
    items: fixtures ? fixtureUpdates : (feed.data?.items ?? []),
    fixtures,
    signIn: !fixtures && !!feed.data?.signIn,
    authLoading: !fixtures && isLoading,
  };
}
