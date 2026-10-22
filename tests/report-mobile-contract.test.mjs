import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new report fields accept their limit and reject one character over", async () => {
  const { validateReportForm } = await import("../src/features/reports/contract.ts");
  const { initialComplaintForm } = await import("../src/features/reports/data.ts");
  const { creationStepErrors } = await import("../src/features/reports/creation-state.ts");
  for (const [field, limit, step] of [
    ["purok", 20, 3], ["landmark", 20, 3],
    ["categoryDescription", 100, 4], ["typeDescription", 100, 4],
    ["desiredAction", 100, 4],
  ]) {
    const validate = value => validateReportForm(
      { ...initialComplaintForm, [field]: value },
      undefined, undefined, { barangays: [] },
    );
    assert.equal(validate("a".repeat(limit))[field], undefined, `${field} at limit`);
    const errors = validate("a".repeat(limit + 1));
    assert.ok(errors[field], `${field} over limit`);
    assert.ok(creationStepErrors(step, errors, true).includes(errors[field]));
    assert.ok(validate("a".repeat(limit) + " ")[field], `${field} counts spaces`);
  }
});

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report form follows backend field rules and aligned evidence limits", async () => {
  const [data, contract, route, evidence] = await Promise.all([
    read("src/features/reports/data.ts"),
    read("src/features/reports/contract.ts"),
    read("src/features/reports/new-report-screen.tsx"),
    read("src/utils/evidence-image-processing.ts"),
  ]);

  assert.match(data, /requiresDescription:\s*boolean/);
  assert.match(data, /requiresKwhmTransfer:\s*boolean/);
  assert.match(data, /categoryDescription:\s*string/);
  assert.match(data, /typeDescription:\s*string/);
  assert.match(data, /currentRegisteredName:\s*string/);
  assert.match(data, /requestedRegisteredName:\s*string/);
  assert.match(contract, /category\?\.requiresDescription/);
  assert.match(contract, /type\?\.requiresDescription/);
  assert.match(contract, /type\?\.requiresKwhmTransfer/);
  assert.match(contract, /hasCurrentReportContract/);
  assert.match(contract, /currentRegisteredName.*requestedRegisteredName/s);
  assert.match(contract, /barangayPsgc/);
  assert.match(contract, /municipalityCode/);
  assert.match(contract, /isWithinAlbay/);
  assert.match(route, /validateReportForm/);
  assert.match(route, /conditionalReportPayload\(form\)/);
  assert.match(contract, /categoryDescription/);
  assert.match(contract, /typeDescription/);
  assert.doesNotMatch(route, /description:\s*reportDescription/);
  assert.match(evidence, /evidenceMaxBytes\s*=\s*5_000_000/);
});

test("report validation rejects missing distinct details, equal transfer names, bad PSGC, and oversized evidence", async () => {
  const { hasCurrentReportContract, validateReportForm } = await import(
    new URL("../src/features/reports/contract.ts", import.meta.url)
  );
  const category = {
    id: "other-category",
    title: "Others",
    description: "Other concerns",
    color: "#000000",
    requiresDescription: true,
  };
  const type = {
    id: "transfer",
    categoryId: category.id,
    title: "Transfer of KWHM",
    priority: null,
    requiresDescription: true,
    requiresKwhmTransfer: true,
  };
  const form = {
    categoryId: category.id,
    typeId: type.id,
    accountNumber: "100001321412634",
    useHomeAddress: false,
    municipalityCode: "050500000",
    barangayPsgc: "050500001",
    purok: "Purok 1",
    landmark: "",
    categoryDescription: "",
    typeDescription: "",
    currentRegisteredName: "Juan Dela Cruz",
    requestedRegisteredName: "juan dela cruz",
    desiredAction: "",
    photos: [],
    photoUploads: [
      {
        id: "photo",
        uri: "file:///photo.webp",
        size: 5_000_001,
        status: "ready",
      },
    ],
    latitude: 14,
    longitude: 123.5,
    locationVerified: true,
    ticketId: null,
    ticketNumber: null,
  };
  const meta = {
    barangays: [
      {
        code: "050500001",
        name: "Barangay",
        municipalityCode: "different-municipality",
        municipalityName: "Municipality",
      },
    ],
  };
  assert.equal(
    hasCurrentReportContract({
      categories: [{ ...category, requiresDescription: undefined }],
      types: [type],
      municipalities: [],
      barangays: [],
    }),
    false,
  );

  const errors = validateReportForm(form, category, type, meta);
  assert.ok(errors.categoryDescription);
  assert.ok(errors.typeDescription);
  assert.ok(errors.requestedRegisteredName);
  assert.ok(errors.barangayPsgc);
  assert.ok(errors.location);
  assert.ok(errors.evidence);

  const validErrors = validateReportForm(
    {
      ...form,
      categoryDescription: "Category explanation",
      typeDescription: "Type explanation",
      currentRegisteredName: "Juan Dela Cruz",
      requestedRegisteredName: "Maria Dela Cruz",
      latitude: 13.14,
      photoUploads: [{ ...form.photoUploads[0], size: 5_000_000 }],
    },
    category,
    type,
    {
      barangays: [
        {
          ...meta.barangays[0],
          municipalityCode: form.municipalityCode,
        },
      ],
    },
  );
  assert.deepEqual(validErrors, {});
  const missingStreet = validateReportForm({...form,purok:'   '}, category, type, meta);
  assert.equal(missingStreet.purok,'Enter the purok or street of the issue.');
});
