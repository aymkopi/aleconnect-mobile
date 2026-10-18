import { toConsumerProfileView } from "@/models/consumer-profile-view";
import type { ConsumerAccountContext } from "@/features/accounts/contract";
import type { NotificationSettingsResult } from "@/services/notification-settings";
import type { AccountLinkRequest } from "@/services/account-link-requests";
export const profileFixtureAccount: ConsumerAccountContext = {
  identityUserId: "fixture-profile",
  sessionMode: "identity",
  authorizedServiceAccountIds: ["fixture-home", "fixture-family"],
  defaultServiceAccountId: "fixture-home",
  accessRevision: 1,
  cacheKey: "fixture-profile",
  capabilities: {
    emailSetup: false,
    accountLinking: true,
    accountNumberLogin: true,
    mockEmailVerification: false,
  },
  accounts: [
    {
      id: "fixture-home",
      accountNumber: "10004821",
      registeredName: "Justine Dela Cruz",
      address: "Rawis, Legazpi City",
      phoneNumber: "09171234567",
      isDefault: true,
    },
    {
      id: "fixture-family",
      accountNumber: "10007604",
      registeredName: "Maria Dela Cruz",
      address: "Bigaa, Legazpi City",
      phoneNumber: "09181234567",
      isDefault: false,
    },
  ],
};
export function fixtureProfile(id: string, locked = false) {
  return toConsumerProfileView({
    profile_id: id,
    account_number: id === "fixture-family" ? "10007604" : "10004821",
    full_name: id === "fixture-family" ? "Maria Dela Cruz" : "Justine Dela Cruz",
    contact_num: "09171234567",
    email: "justine@example.com",
    purok_or_street: "Purok 2",
    barangay: "Rawis",
    municipality: "Legazpi City",
    full_address: "Purok 2, Rawis, Legazpi City, Albay",
    service_type: "RM",
    meter_serial_num: "12342198",
    email_editable: false,
    service_account_email: "home@example.com",
    service_account_email_editable: true,
    profile_editing: { version: 1, activeReportCount: locked ? 2 : 0 },
    created_at: "2026-10-07",
    updated_at: "2026-10-07",
  });
}
export const profileFixtureSettings: NotificationSettingsResult = {
  preferences: { receivePushNotifications: true, receiveAdvisories: true },
  selectedSubstationIds: [],
  selectedFeederIds: ["bitano-1", "bitano-2"],
  substations: [
    {
      id: "bitano",
      name: "Bitano substation",
      feeders: [
        { id: "bitano-1", name: "Bitano Feeder 1" },
        { id: "bitano-2", name: "Bitano Feeder 2" },
        { id: "bitano-3", name: "Bitano Feeder 3" },
      ],
    },
    {
      id: "ligao",
      name: "Ligao substation",
      feeders: [
        { id: "ligao-1", name: "Ligao Feeder 1" },
        { id: "ligao-2", name: "Ligao Feeder 2" },
        { id: "ligao-3", name: "Ligao Feeder 3" },
      ],
    },
  ],
  isStale: false,
};
export const profileFixtureRequests: AccountLinkRequest[] = [
  "pending",
  "conflict",
  "approved",
  "denied",
  "superseded",
  null,
  "approved",
  "approved",
].map((status, i) => ({
  requestId: "fixture-request-" + i,
  accountNumber: "1000" + (9138 + i),
  registeredName: "Maria Dela Cruz",
  status: status as AccountLinkRequest["status"],
  isCurrentLink: i === 2 ? true : i === 6 ? false : undefined,
  consumerReason:
    status === "denied" ? "The registered details did not match. Check your bill." : null,
  createdAt: "2026-10-07T01:15:00Z",
  decidedAt: status === "pending" ? null : "2026-10-08T03:20:00Z",
}));
