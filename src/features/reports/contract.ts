import type {
  ComplaintCategory,
  ComplaintFormState,
  ComplaintMeta,
  ComplaintType,
} from "./data.ts";

export const reportLimits = {
  description: 2_000,
  actionDesired: 2_000,
  registeredName: 160,
  evidenceMin: 1,
  evidenceMax: 3,
  evidenceMaxBytes: 5_000_000,
} as const;

const albayBounds = {
  minLatitude: 12.9,
  maxLatitude: 13.55,
  minLongitude: 123.25,
  maxLongitude: 124,
};

export type ReportFormErrors = Partial<
  Record<
    | "categoryId"
    | "typeId"
    | "accountNumber"
    | "municipalityCode"
    | "barangayPsgc"
    | "location"
    | "categoryDescription"
    | "typeDescription"
    | "currentRegisteredName"
    | "requestedRegisteredName"
    | "desiredAction"
    | "evidence",
    string
  >
>;

export function isWithinAlbay(latitude: number, longitude: number) {
  return (
    latitude >= albayBounds.minLatitude &&
    latitude <= albayBounds.maxLatitude &&
    longitude >= albayBounds.minLongitude &&
    longitude <= albayBounds.maxLongitude
  );
}

export function hasCurrentReportContract(meta: ComplaintMeta) {
  return (
    meta.categories.length > 0 &&
    meta.types.length > 0 &&
    meta.categories.every(
      (category) => typeof category.requiresDescription === "boolean",
    ) &&
    meta.types.every(
      (type) =>
        typeof type.requiresDescription === "boolean" &&
        typeof type.requiresKwhmTransfer === "boolean",
    )
  );
}

export function validateReportForm(
  form: ComplaintFormState,
  category: ComplaintCategory | undefined,
  type: ComplaintType | undefined,
  meta: Pick<ComplaintMeta, "barangays">,
) {
  const errors: ReportFormErrors = {};
  const categoryDescription = form.categoryDescription.trim();
  const typeDescription = form.typeDescription.trim();
  const currentRegisteredName = form.currentRegisteredName.trim();
  const requestedRegisteredName = form.requestedRegisteredName.trim();
  const barangay = meta.barangays.find(
    (item) => item.code === form.barangayPsgc,
  );

  if (!category) errors.categoryId = "Select a report category.";
  if (!type || type.categoryId !== category?.id) {
    errors.typeId = "Select a report type.";
  }
  if (!form.accountNumber.trim()) {
    errors.accountNumber = "Account number is required.";
  }
  if (!form.municipalityCode) {
    errors.municipalityCode = "Select a municipality.";
  }
  if (!barangay || barangay.municipalityCode !== form.municipalityCode) {
    errors.barangayPsgc = "Select a barangay in this municipality.";
  }
  if (
    form.latitude == null ||
    form.longitude == null ||
    !isWithinAlbay(form.latitude, form.longitude) ||
    !form.locationVerified
  ) {
    errors.location = form.useHomeAddress
      ? "This home address has no verified Albay pin. Turn it off and choose a location."
      : "Choose a verified location within Albay.";
  }

  if (category?.requiresDescription && !categoryDescription) {
    errors.categoryDescription = "Describe the category-specific concern.";
  } else if (categoryDescription.length > reportLimits.description) {
    errors.categoryDescription = `Keep this under ${reportLimits.description.toLocaleString()} characters.`;
  }

  if (type?.requiresDescription && !typeDescription) {
    errors.typeDescription = "Describe the report type-specific concern.";
  } else if (typeDescription.length > reportLimits.description) {
    errors.typeDescription = `Keep this under ${reportLimits.description.toLocaleString()} characters.`;
  }

  if (type?.requiresKwhmTransfer) {
    if (!currentRegisteredName) {
      errors.currentRegisteredName = "Enter the current registered name.";
    }
    if (!requestedRegisteredName) {
      errors.requestedRegisteredName = "Enter the requested registered name.";
    } else if (
      currentRegisteredName.localeCompare(requestedRegisteredName, undefined, {
        sensitivity: "base",
      }) === 0
    ) {
      errors.requestedRegisteredName =
        "The requested name must differ from the current name.";
    }
  }
  if (currentRegisteredName.length > reportLimits.registeredName) {
    errors.currentRegisteredName = `Keep this under ${reportLimits.registeredName} characters.`;
  }
  if (requestedRegisteredName.length > reportLimits.registeredName) {
    errors.requestedRegisteredName = `Keep this under ${reportLimits.registeredName} characters.`;
  }
  if (form.desiredAction.length > reportLimits.actionDesired) {
    errors.desiredAction = `Keep this under ${reportLimits.actionDesired.toLocaleString()} characters.`;
  }

  const readyEvidence = form.photoUploads.filter(
    (photo) => photo.status === "ready" && photo.size != null,
  );
  if (
    readyEvidence.length < reportLimits.evidenceMin ||
    readyEvidence.length > reportLimits.evidenceMax ||
    readyEvidence.length !== form.photoUploads.length
  ) {
    errors.evidence = "Add 1 to 3 fully prepared photos.";
  } else if (
    readyEvidence.some(
      (photo) => (photo.size ?? reportLimits.evidenceMaxBytes + 1) > reportLimits.evidenceMaxBytes,
    )
  ) {
    errors.evidence = "Each prepared photo must be 5 MB or smaller.";
  }

  return errors;
}

export function reportDetails(form: ComplaintFormState) {
  return {
      version: 1 as const,
    categoryDescription: form.categoryDescription.trim() || null,
    typeDescription: form.typeDescription.trim() || null,
    kwhmTransfer:
      form.currentRegisteredName.trim() || form.requestedRegisteredName.trim()
        ? {
            currentRegisteredName: form.currentRegisteredName.trim(),
            requestedRegisteredName: form.requestedRegisteredName.trim(),
          }
        : null,
  };
}

export function conditionalReportPayload(form: ComplaintFormState) {
  const details = reportDetails(form);
  return {
    categoryDescription: details.categoryDescription,
    typeDescription: details.typeDescription,
    currentRegisteredName:
      details.kwhmTransfer?.currentRegisteredName ?? null,
    requestedRegisteredName:
      details.kwhmTransfer?.requestedRegisteredName ?? null,
    reportDetails: details,
  };
}
