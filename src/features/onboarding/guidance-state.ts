export const pendingWelcomeKey = "aleconnect_get_started_pending_v1";

export const appGuides = [
  {
    "id": "home",
    "title": "Home",
    "summary": "Search, shortcuts and navigation.",
    "route": "/home",
    "public": true,
    "icon": "House",
    "steps": [
      {
        "target": "search",
        "title": "Find what you need",
        "description": "Search for services, your reports or hotlines. Open a result to go straight to it.",
        "guestDescription": "Search for services, public updates and hotlines. Open a result to go straight to it."
      },
      {
        "target": "shortcuts",
        "title": "Your everyday actions",
        "description": "Report an issue, request billing information or start a connection request. Explore services shows the full list.",
        "guestDescription": "Open ALECO’s billing and connection guides, or explore services. Creating a report will ask you to sign in."
      },
      {
        "target": "updates",
        "title": "Hear from ALECO",
        "description": "Swipe through official notices and posts. Open a card for affected areas, schedules and the full update."
      },
      {
        "target": "navigation",
        "title": "Move around the app",
        "description": "The bottom tabs open Home, Reports, Advisories, Hotlines and Account. Guests can browse public updates and contacts."
      }
    ]
  },
  {
    "id": "reports",
    "title": "Reports",
    "summary": "Filters and report status updates.",
    "route": "/reports",
    "public": false,
    "icon": "FileText",
    "steps": [
      {
        "target": "search",
        "title": "Find a report",
        "description": "Search your reports by reference or issue. Search and filters work together to narrow the list."
      },
      {
        "target": "create",
        "title": "Report a service concern",
        "description": "Start here to choose an issue, add details, pin its location and attach photos. You review everything before sending."
      },
      {
        "target": "filters",
        "title": "Focus your report list",
        "description": "Choose the service account, reporting period and other filters here. Apply them to update the list."
      },
      {
        "target": "list",
        "title": "Follow the latest update",
        "description": "A report card shows its current status and latest update date. Highlighted cards have an update you have not opened."
      }
    ]
  },
  {
    "id": "report-new",
    "title": "Create a report",
    "summary": "Location, photos and review.",
    "route": "/reports/new",
    "public": false,
    "icon": "Plus",
    "steps": [
      {
        "target": "progress",
        "title": "One step at a time",
        "description": "Follow the steps to add details, an Albay location and evidence. You will review everything before sending."
      },
      {
        "target": "fields",
        "title": "Complete the current step",
        "description": "Fill the required fields before continuing. When an issue has several types, select the type that matches it."
      },
      {
        "target": "continue",
        "title": "Review before you send",
        "description": "Continue confirms each step. On review, check the account, location and photos before pressing Submit report."
      }
    ]
  },
  {
    "id": "advisories",
    "title": "Advisories",
    "summary": "Service notices and ALECO posts.",
    "route": "/advisories",
    "public": true,
    "icon": "Megaphone",
    "steps": [
      {
        "target": "search",
        "title": "Find an update",
        "description": "Search official notices and ALECO posts. Open a result for the complete message and any attached information."
      },
      {
        "target": "tabs",
        "title": "Choose what to read",
        "description": "All combines service notices and ALECO posts. Use the other tabs to focus on advisories or the ALECO feed."
      },
      {
        "target": "feed",
        "title": "Read the full notice",
        "description": "Open a card to see its schedule, affected areas and details. Guests see updates published for everyone."
      }
    ]
  },
  {
    "id": "hotlines",
    "title": "Hotlines",
    "summary": "Contacts and emergency calling.",
    "route": "/hotlines",
    "public": true,
    "icon": "Phone",
    "steps": [
      {
        "target": "emergency",
        "title": "Emergency help",
        "description": "Hold the 911 button for two seconds to open the call action. Use it for emergencies. This guide will never place a call."
      },
      {
        "target": "aleco",
        "title": "Contact ALECO",
        "description": "Use the call button beside a contact number, or copy it for later. The prefix icon shows the contact type."
      },
      {
        "target": "categories",
        "title": "Find the right contact",
        "description": "Open a category to browse its agencies and numbers. View all hotlines lets you search the complete directory."
      }
    ]
  },
  {
    "id": "account",
    "title": "Account",
    "summary": "Profile, accounts and preferences.",
    "route": "/profile",
    "public": false,
    "icon": "UserRound",
    "steps": [
      {
        "target": "profile",
        "title": "Keep your details current",
        "description": "Open your profile to review your photo, contact details and home location. Changes require password confirmation."
      },
      {
        "target": "settings",
        "title": "Choose alerts and appearance",
        "description": "Choose the updates you receive and your preferred color theme here. Your service accounts are in Account & security above."
      },
      {
        "target": "help",
        "title": "Come back to a guide",
        "description": "Help & support keeps account setup and these guides available. You can repeat a chapter whenever you need it."
      }
    ]
  }
] as const;

export type GuideId = (typeof appGuides)[number]["id"];
export type GuideStepDefinition = { target: string; title: string; description: string; guestDescription?: string };
export type WelcomeOffer = "account" | "guest";

export function isInteractiveSignIn(previous: { isLoading: boolean; userId: string | null }, next: { isLoading: boolean; userId: string | null }) {
  return !previous.isLoading && previous.userId === null && !next.isLoading && next.userId !== null;
}

export function guideOfferKey(principalId: string | null) {
  return "aleconnect_get_started_offered_v1:" + (principalId === null ? "guest" : "account:" + encodeURIComponent(principalId));
}

export function pendingWelcomeOffer(pending: string | null, state: {
  isLoading: boolean; hasSession: boolean; mustChangePassword: boolean; alreadyOffered: boolean; interactiveSignIn: boolean;
}): WelcomeOffer | null {
  if (state.isLoading || state.mustChangePassword || state.alreadyOffered) return null;
  if (pending === "account" && state.hasSession && state.interactiveSignIn) return "account";
  if (pending === "guest" && !state.hasSession) return "guest";
  return null;
}
