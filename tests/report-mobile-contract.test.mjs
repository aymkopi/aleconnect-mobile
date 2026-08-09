import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report form follows backend field rules and aligned evidence limits", async () => {
  const [data, contract, route, evidence] = await Promise.all([
    read("src/features/reports/data.ts"),
    read("src/features/reports/contract.ts"),
    read("src/app/(tabs)/reports/new.tsx"),
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
  assert.match(route, /categoryDescription:/);
  assert.match(route, /typeDescription:/);
  assert.match(route, /currentRegisteredName:/);
  assert.match(route, /requestedRegisteredName:/);
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
});

test("report details avoid raw coordinates and render authenticated evidence plus a static map", async () => {
  const [detail, staticMap] = await Promise.all([
    read("src/app/(tabs)/reports/[id].tsx"),
    read("src/features/maps/static-location-map.tsx"),
  ]);

  assert.match(detail, /title="Report details"/);
  assert.doesNotMatch(detail, /label="Coordinates"/);
  assert.match(detail, /<StaticLocationMap/);
  assert.match(staticMap, /dragPan=\{false\}/);
  assert.match(staticMap, /touchZoom=\{false\}/);
  assert.match(detail, /report\.imageUrls/);
  assert.match(detail, /Report status/);
});

test("reports expose one archive entry and keep queued drafts inside the archive", async () => {
  const [main, archive] = await Promise.all([
    read("src/app/(tabs)/reports/index.tsx"),
    read("src/app/(tabs)/reports/list.tsx"),
  ]);

  assert.equal((main.match(/router\.push\("\/reports\/list"\)/g) ?? []).length, 1);
  assert.doesNotMatch(main, /router\.push\("\/reports\/queue"\)/);
  assert.match(archive, /Saved on this device/);
  assert.match(archive, /Official reports/);
});
