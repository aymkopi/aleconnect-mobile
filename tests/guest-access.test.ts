import assert from 'node:assert/strict';
import test from 'node:test';
import { guestRouteAccess, guestGateDescriptions } from '../src/features/auth/guest-access.ts';

test('public guest routes remain accessible, including service previews and every hotline', () => {
  for (const route of ['/home', '/profile', '/advisories', '/advisories/notice', '/posts/post', '/services', '/services/report-preview', '/services/payment/gcash', '/services/connection', '/services/requests', '/hotlines', '/hotline-directory', '/profile/help', '/profile/privacy', '/profile/about', '/profile/terms', '/sign-in']) assert.equal(guestRouteAccess(route), null, route);
});
test('private report, account, notification and service submission paths require sign-in', () => {
  for (const route of ['/reports', '/reports/new', '/reports/queue', '/reports/ticket']) assert.equal(guestRouteAccess(route), 'reports', route);
  for (const route of ['/profile/details', '/profile/accounts', '/profile/link-account', '/profile/change-password', '/notifications', '/notification-settings', '/services/request/lighting', '/profile?appearance=1']) assert.equal(guestRouteAccess(route), 'account', route);
});
test('gate copy distinguishes reports, account features and account-targeted updates', () => {
  assert.match(guestGateDescriptions.reports, /create reports.*progress.*history/);
  assert.match(guestGateDescriptions.account, /profile.*linked accounts.*notifications/);
  assert.match(guestGateDescriptions.advisory, /eligible signed-in accounts/);
});
