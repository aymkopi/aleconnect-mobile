import { useState } from "react";
import { View } from "react-native";
import { type Href, useRouter, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/panelui/button";
import { Text } from "@/components/panelui/text";
import { DataState, DataNotice } from "@/components/data-state";
import { ReportPage } from "@/features/reports/components/report-page";
import { useScopedRead } from "@/hooks/use-scoped-read";
import { fetchAccountLinkRequests } from "@/services/account-link-requests";
import { consumerAccountLinkRequestStatusLabel, consumerAccountLinkRequestReviewMessage } from "@/features/accounts/status";
import {
  ProfileGate,
  ProfileHeading,
  ProfileNotice,
  DetailRow,
  useProfileBackGuard,
  type ProfileIdentity,
} from "./profile-ui";
import { profileFixtureRequests } from "./profile-fixtures";
export default function LinkRequestsScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  return (
    <ProfileGate>
      {(identity) => (
        <Requests
          identity={identity}
          initial={typeof requestId === "string" ? requestId : undefined}
        />
      )}
    </ProfileGate>
  );
}
function Requests({ identity, initial }: { identity: ProfileIdentity; initial?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(initial ?? "");
  const ready =
    identity.account.sessionMode === "identity" && identity.account.capabilities.accountLinking;
  const read = useScopedRead(ready ? identity.key : null, async () => {
    if (identity.fixture) return profileFixtureRequests;
    const r = await fetchAccountLinkRequests();
    if (r.accessRevision !== identity.account.accessRevision)
      throw new Error("Account access changed. Return to Account and refresh.");
    return r.requests;
  });
  const request = read.data?.find((r) => r.requestId === selected);
  const back = () => {
    if (selected) {
      setSelected("");
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/profile/accounts");
  };
  useProfileBackGuard(!!selected, back);
  return (
    <>
      <ReportPage
        title={selected ? "Account-link request" : "Link requests"}
        onBack={back}
        footer={
          selected ? (
            <Button variant="outline" onPress={back}>
              Back to requests
            </Button>
          ) : undefined
        }
      >
        {!ready ? (
          <ProfileNotice
            title="Email setup required"
            description="Account-link requests are available with email sign-in."
          />
        ) : read.busy && !read.data ? (
          <DataState loading title="Loading your account-link requests" />
        ) : !read.data ? (
          <DataState title="Your requests couldn’t load" description="Reconnect and retry before sending another request." actionLabel="Try again" onAction={() => void read.reload(true)} />
        ) : selected ? (
          <>
            {!request ? (
              <ProfileNotice
                title="Request unavailable"
                description="This request is not available to your current profile."
                danger
              />
            ) : (
              <>
                <ProfileHeading title={consumerAccountLinkRequestStatusLabel(request.status, request.isCurrentLink)} />
                <View className="gap-3 rounded-xl bg-card p-4">
                  <DetailRow
                    label="Requested account"
                    value={"ALECO ••" + request.accountNumber.slice(-4)}
                  />
                  <DetailRow label="Registered name" value={request.registeredName} />
                  <DetailRow
                    label="Submitted"
                    value={new Date(request.createdAt).toLocaleString("en-PH")}
                  />
                  {request.decidedAt ? (
                    <DetailRow
                      label="Updated"
                      value={new Date(request.decidedAt).toLocaleString("en-PH")}
                    />
                  ) : null}
                </View>
                <ProfileNotice
                  title="ALECO review"
                  description={consumerAccountLinkRequestReviewMessage(request)}
                />
                {request.status === "approved" ? (
                  <Button onPress={() => router.push("/profile/accounts")}>View ALECO accounts</Button>
                ) : request.status === "denied" ? (
                  <Button onPress={() => router.push("/profile/link-account")}>Try again</Button>
                ) : (
                  <Button onPress={() => router.push("/profile/help" as Href)}>
                    Contact ALECO
                  </Button>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <ProfileHeading
              title="Your linking requests"
              description="Status updates appear here after ALECO reviews each request."
            />
            {!read.data.length ? (
              <DataState title="No link requests yet" description="Requests to add another ALECO account will appear here." actionLabel="Link an account" onAction={() => router.push("/profile/link-account")} />
            ) : (
              read.data.map((r) => (
                <View
                  key={r.requestId}
                  className="gap-2 rounded-xl bg-card p-3"
                >
                  <Text size="sm" weight="semibold" className="text-primary">
                    {consumerAccountLinkRequestStatusLabel(r.status, r.isCurrentLink)}
                  </Text>
                  <Text size="sm" weight="medium">{r.registeredName}</Text>
                  <Text size="xs" muted>ALECO ••{r.accountNumber.slice(-4)}</Text>
                  <Text size="xs" muted>
                    Sent {new Date(r.createdAt).toLocaleDateString("en-PH")}
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    accessibilityLabel={
                      "View request for account ending " + r.accountNumber.slice(-4)
                    }
                    onPress={() => setSelected(r.requestId)}
                  >
                    View request
                  </Button>
                </View>
              ))
            )}
            <Button variant="outline" onPress={() => void read.reload(true)} loading={read.busy}>
              Refresh requests
            </Button>
          </>
        )}
        {read.error && read.data ? <DataNotice title="Could not refresh requests" description="Your loaded requests are still available. Refresh before sending another request." actionLabel="Refresh requests" onAction={() => void read.reload(true)} busy={read.busy} /> : null}
      </ReportPage>

    </>
  );
}
