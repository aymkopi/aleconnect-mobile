export const services = [
  {
    id: "report",
    title: "Report an issue",
    description: "Power, meter and line concerns",
    route: "/reports/new",
    icon: "report",
  },
  {
    id: "track",
    title: "Track reports",
    description: "Follow the progress of your reports",
    route: "/reports",
    icon: "track",
  },
  {
    id: "call",
    title: "Call ALECO",
    description: "Power and account support",
    route: "/hotlines",
    icon: "phone",
  },
  {
    id: "updates",
    title: "Latest Updates",
    description: "Advisories, news and your community",
    route: "/advisories",
    icon: "updates",
  },
  {
    id: "account",
    title: "My Account",
    description: "Your profile and linked service accounts",
    route: "/profile",
    icon: "account",
  },
  {
    id: "emergency",
    title: "Emergency Help",
    description: "National emergency and local contacts",
    route: "/hotline-directory",
    icon: "shield",
  },
  {
    id: "requests",
    title: "Service Requests",
    description: "Temporary lighting, disconnection and more",
    route: "/services/requests",
    icon: "power",
  },
  {
    id: "connection",
    title: "Request Connection",
    description: "Start a new electrical connection",
    route: "/services/connection",
    icon: "power",
  },
  {
    id: "payment",
    title: "Pay Bills",
    description: "Find an authorized payment channel",
    route: "/services/payment",
    icon: "payment",
  },
] as const;
export const serviceGroups = [
  { title: 'Quick access', services },
  { title: 'Report history', services: [{ id: 'history', title: 'All & saved reports', description: 'Full history and offline submissions', route: '/reports/list', icon: 'track' }] },
  { title: 'More support', services: [
    { id: 'directory', title: 'Hotline directory', description: 'Agencies, hospitals and local help', route: '/hotline-directory', icon: 'phone' },
    { id: 'notifications', title: 'Notifications', description: 'Report, account and service alerts', route: '/notifications', icon: 'updates' },
  ] },
  { title: 'Account & preferences', services: [
    { id: 'link', title: 'Link an account', description: 'Request access to another account', route: '/profile/link-account', icon: 'account' },
    { id: 'link-requests', title: 'Link requests', description: 'Follow ALECO’s review of your request', route: '/profile/link-requests', icon: 'track' },
    { id: 'details', title: 'Personal information', description: 'Contact details and address', route: '/profile/details', icon: 'account' },
    { id: 'password', title: 'Change password', description: 'Update your account password', route: '/profile/change-password', icon: 'shield' },
    { id: 'appearance', title: 'Appearance', description: 'System, light or dark theme', route: '/profile?appearance=1', icon: 'account' },
    { id: 'alerts', title: 'Alert settings', description: 'Choose push and feeder notifications', route: '/notification-settings', icon: 'updates' },
  ] },
  { title: 'Official links', services: [
    { id: 'website', title: 'ALECO website', description: 'Visit the official ALECO portal', route: 'https://web.alecoinc.com.ph/', icon: 'account' },
    { id: 'facebook', title: 'ALECO Facebook', description: 'Announcements from ALECO', route: 'https://www.facebook.com/albayelectric', icon: 'updates' },
    { id: 'about', title: 'About ALECO', description: 'Organization profile and services', route: '/profile/about', icon: 'account' },
  ] },
] as const;
export function searchServices(query: string) {
  const term = query.trim().toLowerCase();
  return serviceGroups.flatMap((group) => [...group.services]).filter((s) =>
    (s.title + " " + s.description).toLowerCase().includes(term),
  );
}
export const paymentChannels = [
  {
    id: "gcash",
    title: "GCash",
    description: "Mobile wallet",
    url: "https://help.gcash.com/hc/en-us",
  },
  {
    id: "bayad",
    title: "Bayad Center",
    description: "Payment centers",
    url: "https://www.bayad.com/",
  },
  {
    id: "ecpay",
    title: "ECPay",
    description: "7-Eleven and partner outlets",
    url: "https://ecpay.com.ph/",
  },
  {
    id: "bdo",
    title: "BDO",
    description: "Over-the-counter at branches",
    url: "https://www.bdo.com.ph/",
  },
  {
    id: "unionbank",
    title: "UnionBank",
    description: "Bank payment channel",
    url: "https://www.unionbankph.com/",
  },
  {
    id: "camalig",
    title: "Camalig Bank",
    description: "Bank payment channel",
    url: "https://www.camaligbank.com/",
  },
  {
    id: "aleco",
    title: "ALECO offices",
    description: "Service and Collection Offices",
    url: "https://web.alecoinc.com.ph/",
  },
] as const;
