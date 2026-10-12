import type { ConsumerAccountContext } from "./contract";
export function resolveSelectedServiceAccount(
  context: ConsumerAccountContext | null,
  selected: string | null,
) {
  if (!context) return null;
  const permitted = (id: string) =>
    context.authorizedServiceAccountIds.includes(id) &&
    context.accounts.some((a) => a.id === id);
  if (selected && permitted(selected)) return selected;
  return permitted(context.defaultServiceAccountId)
    ? context.defaultServiceAccountId
    : null;
}
