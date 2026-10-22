import type { ReportFormErrors } from "./contract.ts";
import type { ComplaintFormState } from "./data.ts";
export type CreationStep = 1 | 2 | 3 | 4 | 5 | 6;
export type ReportDraftScope = {
  principalId: string;
  identityUserId: string;
  serviceAccountId: string;
  accessRevision: number;
};
const stageFields = {
  1: ["accountNumber"],
  2: ["categoryId", "typeId"],
  3: ["municipalityCode", "barangayPsgc", "location", "purok", "landmark"],
  4: [
    "categoryDescription",
    "typeDescription",
    "currentRegisteredName",
    "requestedRegisteredName",
    "desiredAction",
  ],
  5: ["evidence"],
} as const;
export function creationStepErrors(
  step: CreationStep,
  errors: ReportFormErrors,
  accountReady: boolean,
) {
  const fields =
    step === 6 ? Object.values(stageFields).flat() : stageFields[step];
  const messages = fields
    .map((field) => errors[field])
    .filter((message): message is string => Boolean(message));
  if (!accountReady)
    messages.unshift(
      "Wait for the selected ALECO account to load, or refresh your account access.",
    );
  return messages;
}
export function nextCreationStep(
  step: CreationStep,
  editingReview: boolean,
): CreationStep {
  return editingReview ? 6 : (Math.min(6, step + 1) as CreationStep);
}
export function previousCreationStep(
  step: CreationStep,
  editingReview: boolean,
): CreationStep {
  return editingReview ? 6 : (Math.max(1, step - 1) as CreationStep);
}
export function confirmedReportReceipt(
  result:
    | { status: string; ticketId: string | null; ticketNumber: string | null }
    | undefined,
) {
  return result?.status === "submitted" &&
    result.ticketId?.trim() &&
    result.ticketNumber?.trim()
    ? { ticketId: result.ticketId, ticketNumber: result.ticketNumber }
    : null;
}
export function isDraftScopeCurrent(
  draft: ReportDraftScope | null,
  current: {
    principalId: string | null;
    identityUserId: string | null;
    accessRevision: number;
    authorizedServiceAccountIds: readonly string[];
    profileId: string | null;
  },
) {
  return Boolean(
    draft &&
    draft.principalId === current.principalId &&
    draft.identityUserId === current.identityUserId &&
    draft.accessRevision === current.accessRevision &&
    current.authorizedServiceAccountIds.includes(draft.serviceAccountId) &&
    draft.serviceAccountId === current.profileId,
  );
}
export function creationSubmissionMode(preview: boolean, fixtures: boolean) {
  return fixtures ? "fixture" : preview ? "disabled" : "live";
}
export function changeReportIssue(
  form: ComplaintFormState,
  categoryId: string,
  typeId: string,
): ComplaintFormState {
  if (form.categoryId === categoryId && form.typeId === typeId) return form;
  return {
    ...form,
    categoryId,
    typeId,
    categoryDescription:
      form.categoryId === categoryId ? form.categoryDescription : "",
    typeDescription: "",
    currentRegisteredName: "",
    requestedRegisteredName: "",
  };
}

export function singleCategoryTypeId(
  types: readonly { id: string; categoryId: string }[],
  categoryId: string,
) {
  const matches = types.filter(type => type.categoryId === categoryId);
  return matches.length === 1 ? matches[0].id : "";
}
