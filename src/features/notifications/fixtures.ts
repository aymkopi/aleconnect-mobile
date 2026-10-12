import type { ConsumerAccountContext } from "../accounts/contract.ts";
import type { MobileNotification } from "../../services/notifications.ts";

export const notificationFixtureAccount: ConsumerAccountContext = {
  identityUserId: "fixture-notifications", sessionMode: "identity", accessRevision: 1,
  authorizedServiceAccountIds: ["fixture-home", "fixture-family"], defaultServiceAccountId: "fixture-home", cacheKey: "fixture-notifications",
  capabilities: { emailSetup: false, accountLinking: true, accountNumberLogin: true, mockEmailVerification: false },
  accounts: [
    { id: "fixture-home", registeredName: "Home", accountNumber: "10004821", isDefault: true },
    { id: "fixture-family", registeredName: "Family home", accountNumber: "10007604", isDefault: false },
  ],
};

const base: MobileNotification = {
  id: "", title: "", description: null, entityType: null, entityId: null,
  createdAt: "2026-10-10T01:30:00Z", isRead: false, severity: "Info", ticketId: null, ticketNumber: null,
  category: "system", serviceAccountId: null, accountNumber: null, accountName: null, identityLevel: false,
};
export const notificationFixtureNow = new Date("2026-10-10T02:00:00Z");
export const notificationFixtures: MobileNotification[] = [
  { ...base, id: "fixture-billing", title: "Billing collection reminder", description: "Collection is scheduled for 21 October.", entityType: "advisory", entityId: "fixture-advisory", category: "advisories" },
  { ...base, id: "fixture-advisory-update", title: "New service advisory", description: "Scheduled outage in Rawis.", entityType: "advisory", entityId: "fixture-advisory", category: "advisories", createdAt: "2026-10-10T01:20:00Z", severity: "High" },
  { ...base, id: "fixture-report-progress", title: "Report in progress", entityType: "ticket", ticketId: "fixture-1", ticketNumber: "TK-2026-1042", category: "report_updates", serviceAccountId: "fixture-home", accountNumber: "10004821", accountName: "Home", createdAt: "2026-10-10T00:16:00Z" },
  { ...base, id: "fixture-link", title: "Account link approved", description: "Your ALECO account is now linked.", entityType: "account_linking", entityId: "fixture-link-approved", identityLevel: true, createdAt: "2026-10-09T23:45:00Z" },
  { ...base, id: "fixture-report-incident", title: "Report linked to an active incident", description: "Your report is now part of SM-2026-0081. Updates for this incident will apply to your report.", entityType: "ticket", ticketId: "fixture-2", ticketNumber: "TK-2026-1038", category: "area_incidents", serviceAccountId: "fixture-family", accountNumber: "10007604", accountName: "Family home", createdAt: "2026-10-09T06:10:00Z" },
  { ...base, id: "fixture-report-received", title: "Report received", description: "We received your report and will review it.", entityType: "ticket", ticketId: "fixture-2", ticketNumber: "TK-2026-1038", category: "report_updates", serviceAccountId: "fixture-family", accountNumber: "10007604", accountName: "Family home", createdAt: "2026-10-09T06:10:00Z", isRead: true },
  { ...base, id: "fixture-report-complete", title: "Report completed", entityType: "ticket", ticketId: "fixture-3", ticketNumber: "TK-2026-1029", category: "report_updates", serviceAccountId: "fixture-home", accountNumber: "10004821", accountName: "Home", createdAt: "2026-10-05T02:24:00Z", isRead: true },
  { ...base, id: "fixture-message", title: "Service update", description: "Consumer services will be available from 8 AM to 5 PM on weekdays. Please use the hotline directory for urgent power concerns.", serviceAccountId: "fixture-home", accountNumber: "10004821", accountName: "Home", createdAt: "2026-10-04T01:10:00Z", isRead: true },
];
