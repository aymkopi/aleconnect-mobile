import { Asset } from "expo-asset";
import { fixtureUpdates } from "@/features/main-fixtures";
import type { MobilePublicUpdate } from "@/services/public-updates";
const photo = {
  id: "fixture-mayon",
  url: Asset.fromModule(
    require("../../../assets/aleconnect/mayon.jpeg"),
  ).uri,
  altText: "Mayon volcano above the Albay countryside",
  position: 0,
  width: 370,
  height: 238,
};
export function detailFixture(
  id: string,
  preview?: string,
): MobilePublicUpdate | null {
  const item = fixtureUpdates.find((update) => update.id === id);
  if (!item || preview === "unavailable") return null;
  if (item.kind === "facebook_post")
    return {
      ...item,
      photos: [photo],
      message:
        item.id === "fixture-story"
          ? "Serving Albay, every day.\n\nKeeping our community connected\nOfficial advisories help you plan ahead. Track your reports and find the service contacts you need, all in one place.\n\nA safer, more reliable service\nALECO continues to care for the lines that serve our communities. Follow official updates for the latest service information."
          : item.message,
    };
  const content =
    "ALECO will carry out scheduled line maintenance. Please prepare for the interruption and unplug sensitive appliances. Power may return earlier once work is completed.\n\nAffected service areas: Rawis, Bigaa and Victory Village North, Legazpi City.";
  const variants: Record<string, Partial<typeof item>> = {
    unscheduled: {
      type: "unscheduled_outage",
      title: "Unscheduled power interruption",
      scheduledEndAt: null,
      content:
        "Our team is checking a service-line concern in Rawis. No restoration estimate has been announced. We will publish another advisory when information is confirmed.",
    },
    restoration: {
      type: "restoration",
      title: "Power has been restored",
      content:
        "ALECO confirms restoration of power in the affected service area. If your home still has no power, report the issue so our team can check.",
    },
    maintenance: {
      type: "maintenance",
      title: "Line maintenance in your area",
    },
    weather: {
      type: "weather_advisory",
      title: "Stay safe during heavy rain",
      content:
        "Keep clear of fallen wires and flooded electrical equipment. Contact ALECO for electrical hazards. For life-threatening emergencies, use the emergency hotline.",
    },
    billing: {
      type: "general",
      title: "Billing collection reminder",
      content:
        "Billing collection will be held on October 21. Please use authorized payment channels and keep your receipt. This advisory is a reminder; it does not confirm your balance or payment status.",
    },
    general: {
      type: "general",
      title: "Service desk hours",
      content:
        "Our service desk is open Monday to Friday. Please contact ALECO before visiting for current service hours.",
    },
    updated: {
      title: "Updated interruption schedule",
      scheduledStartAt: "2026-10-07T02:00:00Z",
      content:
        "ALECO has updated the schedule to 10:00 AM–5:00 PM. Please use this latest notice when planning your day.",
    },
    photos: { photos: [photo] },
  };
  return {
    ...item,
    type: "scheduled_outage",
    content,
    audience: "Rawis, Bigaa and Victory Village North, Legazpi City",
    ...variants[preview ?? ""],
  };
}
