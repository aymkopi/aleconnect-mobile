import assert from "node:assert/strict";
import test from "node:test";

import * as accountContract from "../src/features/accounts/contract.ts";
import * as reportContract from "../src/features/reports/contract.ts";

type AccountActionPresentation = {
  kind: "error" | "password-reset-required";
  message: string;
};

type AccountContractUnderTest = {
  presentAccountLinkError?: (error: unknown) => AccountActionPresentation;
  presentAccountUnlinkError?: (error: unknown) => AccountActionPresentation;
};

type ReportContractUnderTest = {
  buildReportAccountSelector?: (
    accounts: Array<{ id: string; accountNumber: string | null; registeredName: string; isDefault: boolean }>,
    activeServiceAccountId: string | null,
    busy: boolean,
  ) => {
    value: string;
    isDisabled: boolean;
    options: Array<{ value: string; label: string }>;
  };
  shouldReloadReportsForAccountChange?: (
    previousServiceAccountId: string | null,
    nextServiceAccountId: string | null,
    hasLoaded: boolean,
  ) => boolean;
};

const accountBehavior = accountContract as AccountContractUnderTest;
const reportBehavior = reportContract as ReportContractUnderTest;

test("password-reset linking presents recovery steps while invalid credentials stay generic", () => {
  assert.equal(typeof accountBehavior.presentAccountLinkError, "function");

  assert.deepEqual(
    accountBehavior.presentAccountLinkError?.({
      code: "ACCOUNT_PASSWORD_RESET_REQUIRED",
      message: "server fallback",
    }),
    {
      kind: "password-reset-required",
      message: "Complete this ALECO account's required password change before linking it.",
    },
  );
  assert.deepEqual(
    accountBehavior.presentAccountLinkError?.({
      code: "ACCOUNT_LINK_VERIFICATION_FAILED",
      message: "We could not verify those account details.",
    }),
    {
      kind: "error",
      message: "We could not verify those account details.",
    },
  );
});

test("unlink password errors identify the ALECO credential instead of the unified email password", () => {
  assert.equal(typeof accountBehavior.presentAccountUnlinkError, "function");
  assert.deepEqual(
    accountBehavior.presentAccountUnlinkError?.({
      code: "UNLINK_PASSWORD_INCORRECT",
      message: "server fallback",
    }),
    {
      kind: "error",
      message: "That ALECO account password is incorrect. Use this account's password, not your email sign-in password.",
    },
  );
});

test("report account selector is disabled for one account and enabled for multiple accounts", () => {
  assert.equal(typeof reportBehavior.buildReportAccountSelector, "function");
  const accountA = { id: "account-a", accountNumber: "1001", registeredName: "Ana Cruz", isDefault: true };
  const accountB = { id: "account-b", accountNumber: "1002", registeredName: "Ana Cruz", isDefault: false };

  assert.deepEqual(
    reportBehavior.buildReportAccountSelector?.([accountA], "account-a", false),
    {
      value: "account-a",
      isDisabled: true,
      options: [{ value: "account-a", label: "1001 — Ana Cruz (Default)" }],
    },
  );
  assert.equal(
    reportBehavior.buildReportAccountSelector?.([accountA, accountB], "account-a", false).isDisabled,
    false,
  );
});

test("a loaded Recent Reports screen reloads for every account-filter transition", () => {
  assert.equal(typeof reportBehavior.shouldReloadReportsForAccountChange, "function");
  assert.equal(reportBehavior.shouldReloadReportsForAccountChange?.(null, "account-a", true), true);
  assert.equal(reportBehavior.shouldReloadReportsForAccountChange?.("account-a", null, true), true);
  assert.equal(reportBehavior.shouldReloadReportsForAccountChange?.("account-a", "account-a", true), false);
  assert.equal(reportBehavior.shouldReloadReportsForAccountChange?.(null, "account-a", false), false);
});
