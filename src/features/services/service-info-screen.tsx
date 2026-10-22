import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useGuestAccess } from "@/context/guest-access-context";
import { ReportPage } from "@/features/reports/components/report-page";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { Card } from "@/components/panelui/card";
import { openContact } from "@/features/hotlines/contact-card";
import { ServiceRow } from "./service-row";
export function ServiceRequestsScreen() {
  const router = useRouter();
  const { openFeature } = useGuestAccess();
  return (
    <ReportPage
      title="Service Requests"
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/services")
      }
    >
      <Text
        weight="semibold"
        style={{
          fontFamily: "PlusJakartaSans_600SemiBold",
          fontSize: 22,
          lineHeight: 30,
        }}
      >
        How can we help?
      </Text>
      <Text muted size="sm">
        Choose the service you need to see where to start.
      </Text>
      <ServiceRow
        title="Temporary lighting"
        description="Request temporary electrical service"
        icon="power"
        onPress={() => openFeature("/services/request/lighting")}
      />
      <ServiceRow
        title="Temporary disconnection"
        description="Arrange a temporary service interruption"
        icon="power"
        onPress={() => openFeature("/services/request/disconnection")}
      />
      <ServiceRow
        title="Meter and line concerns"
        description="Request help with your existing service"
        icon="power"
        onPress={() => openFeature("/reports/new", true)}
      />
      <ServiceRow
        title="Request Connection"
        description="Start a new electrical connection"
        icon="account"
        onPress={() => router.push("/services/connection")}
      />
      <Text muted size="sm">
        Service concerns use the report flow so you can describe the concern and
        track its progress.
      </Text>
      <Button variant="outline" onPress={() => router.push("/hotlines")}>
        Contact ALECO
      </Button>
    </ReportPage>
  );
}
export function ConnectionScreen() {
  const router = useRouter();
  return <ReportPage title="Request Connection" onBack={() => router.canGoBack() ? router.back() : router.replace("/services")}>
    <Text weight="semibold" size="lg">Start your new connection</Text>
    <Text muted size="sm">Read ALECO’s official steps, requirements and application forms before applying.</Text>
    <Button onPress={() => void openContact("https://web.alecoinc.com.ph/newconnection.html")}>Open ALECO connection guide</Button>
    <Text muted size="xs">Opens ALECO’s official website in your browser.</Text>
  </ReportPage>;
}
export function PaymentsScreen() { return <Redirect href="/services" />; }
export function PaymentChannelScreen() { return <Redirect href="/services" />; }
export function ServiceRequestScreen() {
  const router = useRouter(),
    { kind } = useLocalSearchParams<{ kind: string }>();
  const title =
    kind === "lighting"
      ? "Temporary lighting"
      : kind === "disconnection"
        ? "Temporary disconnection"
        : null;
  return (
    <ReportPage
      title="Service request"
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace("/services/requests")
      }
      footer={
        title ? (
          <>
            <Button onPress={() => router.push("/reports/new")}>
              Continue to report
            </Button>
            <Button variant="outline" onPress={() => router.push("/hotlines")}>
              Contact ALECO
            </Button>
          </>
        ) : undefined
      }
    >
      <Text weight="semibold" size="lg">
        {title ?? "Service unavailable"}
      </Text>
      <Card className="p-3 gap-2">
        <Text size="sm">
          {title
            ? "Use the report flow to select this service, describe your request and confirm the service location."
            : "Return to Explore services to choose an available service."}
        </Text>
      </Card>
      {title ? (
        <>
          <Text muted size="sm">
            ALECO will review the request. Any requirements, fees and schedule
            are confirmed by consumer services.
          </Text>
          <ServiceRow
            title="Official forms and requirements"
            description="Read the ALECO service guide"
            onPress={() =>
              void openContact("https://web.alecoinc.com.ph/newconnection.html")
            }
          />
        </>
      ) : null}
    </ReportPage>
  );
}
