import { useLocalSearchParams, useRouter } from "expo-router";
import { useGuestAccess } from "@/context/guest-access-context";
import { View } from "react-native";
import { ReportPage } from "@/features/reports/components/report-page";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { Card } from "@/components/panelui/card";
import { openContact } from "@/features/hotlines/contact-card";
import { ServiceRow } from "./service-row";
import { paymentChannels } from "./catalog";
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
  return (
    <ReportPage
      title="Request Connection"
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
        Power for your new place.
      </Text>
      <Text muted size="sm">
        Start with ALECO’s connection guide and application requirements.
      </Text>
      <Card className="p-4 gap-2">
        <Text weight="semibold" size="sm">
          Before you apply
        </Text>
        <Text muted size="sm">
          Review the official process, required documents and membership steps
          for your application.
        </Text>
      </Card>
      <ServiceRow
        title="Connection requirements"
        description="Read the official ALECO guide"
        icon="power"
        onPress={() =>
          void openContact("https://web.alecoinc.com.ph/newconnection.html")
        }
      />
      <ServiceRow
        title="Application forms"
        description="New connection and membership forms"
        onPress={() =>
          void openContact("https://web.alecoinc.com.ph/newconnection.html")
        }
      />
      <Button
        onPress={() =>
          void openContact("https://web.alecoinc.com.ph/webapp/apply.php")
        }
      >
        Open ALECO application
      </Button>
      <Text muted size="xs">
        Your application opens on ALECO’s official website.
      </Text>
      <Button variant="outline" onPress={() => router.push("/hotlines")}>
        Contact ALECO
      </Button>
    </ReportPage>
  );
}
export function PaymentsScreen() {
  const router = useRouter();
  return (
    <ReportPage
      title="Pay Bills"
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
        Choose where to pay
      </Text>
      <Text muted size="sm">
        Find a payment channel for your ALECO bill.
      </Text>
      <View className="gap-2">
        {paymentChannels.map((p) => (
          <ServiceRow
            key={p.id}
            title={p.title}
            description={p.description}
            icon="payment"
            onPress={() =>
              router.push({
                pathname: "/services/payment/[channel]",
                params: { channel: p.id },
              })
            }
          />
        ))}
      </View>
      <Card className="p-3 gap-1">
        <Text weight="semibold" size="sm">
          Paying an overdue bill?
        </Text>
        <Text muted size="xs">
          Visit an ALECO Service and Collection Office. Payment partners accept
          current bills.
        </Text>
      </Card>
    </ReportPage>
  );
}
export function PaymentChannelScreen() {
  const router = useRouter(),
    { channel } = useLocalSearchParams<{ channel: string }>();
  const p = paymentChannels.find((p) => p.id === channel);
  return (
    <ReportPage
      title="Payment channels"
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/services/payment")
      }
      footer={
        <Button onPress={() => router.push("/hotlines")}>Contact ALECO</Button>
      }
    >
      <Text weight="semibold" size="lg">
        Pay through an authorized channel
      </Text>
      <Card className="p-3 gap-1">
        <Text weight="semibold" size="sm">
          Use your current official bill
        </Text>
        <Text size="sm">
          ALECO’s payment partners accept current bills. For overdue bills,
          contact or visit an ALECO service and collection office.
        </Text>
      </Card>
      {p ? (
        <ServiceRow
          title={p.title}
          description="Open the official payment partner website"
          icon="payment"
          onPress={() => void openContact(p.url)}
        />
      ) : (
        <Text muted size="sm">
          This payment channel is unavailable.
        </Text>
      )}
      <ServiceRow
        title="ALECO payment information"
        description="Current partners and consumer services"
        onPress={() => void openContact("https://web.alecoinc.com.ph/")}
      />
      <Text muted size="sm">
        ALEConnect does not collect payments or confirm balances. Check the
        account number and amount against your bill in the payment channel.
      </Text>
    </ReportPage>
  );
}
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
