export type GuestGateKind = 'reports' | 'account' | 'advisory';
export const guestGateDescriptions: Record<GuestGateKind, string> = {
  reports: 'Sign in to create reports, follow their progress, and see your report history.',
  account: 'Sign in to manage your profile, linked accounts, saved preferences, and notifications.',
  advisory: 'This update is available to eligible signed-in accounts. Sign in to check your access.',
};
export function guestRouteAccess(path: string): GuestGateKind | null {
  if (path === '/profile?appearance=1') return 'account';
  if (path === '/reports' || path.startsWith('/reports/')) return 'reports';
  if (path.startsWith('/profile/') && !['/profile/help', '/profile/privacy', '/profile/about', '/profile/terms'].includes(path)) return 'account';
  if (['/notifications', '/notification-settings'].includes(path) || path.startsWith('/services/request/')) return 'account';
  return null;
}
