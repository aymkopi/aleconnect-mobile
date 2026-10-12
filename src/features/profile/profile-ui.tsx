import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { BackHandler, View } from "react-native";
import { useRouter, useFocusEffect, useNavigation } from "expo-router";
import { LockKeyhole, Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { Text } from "@/components/panelui/text";
import { Button } from "@/components/panelui/button";
import { Field } from "@/components/panelui/field";
import { InputGroup } from "@/components/panelui/input-group";
import { ContentSkeleton } from "@/components/content-skeleton";
import { useState } from "react";
import { ReportPage } from "@/features/reports/components/report-page";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useConsumerAccount } from "@/hooks/use-consumer-account";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useAppColors } from "@/hooks/use-app-colors";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import { profileFixtureAccount } from "./profile-fixtures";
import type { ConsumerAccountContext } from "@/features/accounts/contract";
import type { TextInputProps } from "react-native";
export type ProfileIdentity = {
  key: string;
  fixture: boolean;
  account: ConsumerAccountContext;
  principalId: string;
  isCurrent: () => boolean;
};
export function ProfileGate({ children }: { children: (identity: ProfileIdentity) => ReactNode }) {
  const { session, isLoading } = useAuthSession(),
    { accountContext, isLoading: accountsLoading, refreshConsumerAccount } = useConsumerAccount(),
    { fixtures, setFixtures } = useVisualPreview(),
    router = useRouter();
  const fixture = PANELUI_PREVIEW && fixtures,
    account = fixture ? profileFixtureAccount : accountContext;
  const key = fixture
    ? "fixture-profile"
    : session && account
      ? session.user.id +
        ":" +
        account.identityUserId +
        ":" +
        account.accessRevision +
        ":" +
        account.defaultServiceAccountId
      : null;
  const current = useRef<string | null>(key);
  // The auth scope must invalidate async results before the next commit.
  // eslint-disable-next-line react-hooks/refs
  current.current = key;
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      current.current = null;
    },
    [],
  );
  if (PANELUI_PREVIEW && !fixture)
    return (
      <ReportPage title="Account preview" onBack={() => router.replace("/profile")}>
        <ProfileNotice
          title="Live changes are paused"
          description="Open labelled sample screens to review the Profile flows without changing account or device data."
        />
        <Button onPress={() => setFixtures(true)}>Open labelled visual fixtures</Button>
      </ReportPage>
    );
  if (!fixture && (!session || !account || !account.accounts.length))
    return (
      <ReportPage title="Account" onBack={() => router.replace("/profile")}>
        <ProfileHeading
          title={isLoading || accountsLoading ? "Loading account" : "Sign in to continue"}
          description="Your personal and service details belong to your signed-in account."
        />
        {isLoading || accountsLoading ? (
          <ContentSkeleton layout="profile" count={2} label="Loading account access" />
        ) : session ? (
          <Button
            onPress={() =>
              void refreshConsumerAccount().catch((e) =>
                setError(e instanceof Error ? e.message : "Could not load account."),
              )
            }
          >
            Retry account access
          </Button>
        ) : (
          <Button onPress={() => router.push({ pathname: "/sign-in", params: { returnTo: "/profile" } })}>Sign in</Button>
        )}
        {error ? <ProfileNotice title="Account unavailable" description={error} danger /> : null}
      </ReportPage>
    );
  const identity = {
    key: key!,
    fixture,
    account: account!,
    principalId: fixture ? "fixture-profile" : session!.user.id,
    isCurrent: () => current.current === key,
  };
  return (
    <View key={key} className="flex-1">
      {/* eslint-disable-next-line react-hooks/refs -- Scope is read by the callback only after async work. */}
      {children(identity)}
    </View>
  );
}
export function useProfileTask(identity: ProfileIdentity) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => mounted.current && identity.isCurrent(), [identity]);
}
export function ProfileHeading({ title, description }: { title: string; description?: string }) {
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" weight="semibold" style={{ fontSize: 22, lineHeight: 30 }}>
        {title}
      </Text>
      {description ? (
        <Text size="sm" muted>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
export function ProfileNotice({
  title,
  description,
  danger = false,
}: {
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={
        danger
          ? "gap-1 rounded-xl border border-destructive bg-destructive/10 p-3"
          : "gap-1 rounded-xl border border-border bg-primary/5 p-3"
      }
    >
      <Text size="sm" weight="semibold" className={danger ? "text-destructive" : "text-primary"}>
        {title}
      </Text>
      <Text size="sm">{description}</Text>
    </View>
  );
}
export function ProfileField({
  label,
  Icon = LockKeyhole,
  secret = false,
  description,
  ...props
}: TextInputProps & { label: string; Icon?: LucideIcon; secret?: boolean; description?: string }) {
  const [show, setShow] = useState(false),
    [muted] = useAppColors(["muted-foreground"]);
  return (
    <Field className="gap-1" disabled={props.editable === false}>
      <Field.Label>{label}</Field.Label>
      <InputGroup isDisabled={props.editable === false}>
        <InputGroup.Prefix isDecorative>
          <Icon size={18} color={muted} />
        </InputGroup.Prefix>
        <InputGroup.Input
          {...props}
          accessibilityLabel={label}
          className="min-h-12 rounded-xl bg-card"
          style={{ minHeight: 48, fontSize: 14, lineHeight: 20 }}
          secureTextEntry={secret && !show}
          autoCapitalize={secret ? "none" : props.autoCapitalize}
          autoCorrect={secret ? false : props.autoCorrect}
        />
        {secret ? (
          <InputGroup.Suffix>
            <Button
              variant="ghost"
              size="icon"
              style={{ width: 48, height: 48 }}
              accessibilityLabel={show ? "Hide " + label : "Show " + label}
              accessibilityState={{ checked: show }}
              onPress={() => setShow((v) => !v)}
            >
              {show ? <EyeOff size={18} color={muted} /> : <Eye size={18} color={muted} />}
            </Button>
          </InputGroup.Suffix>
        ) : null}
      </InputGroup>
      {description ? (
        <Field.Description className="text-xs">{description}</Field.Description>
      ) : null}
    </Field>
  );
}
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text size="xs" muted>
        {label}
      </Text>
      <Text size="sm" weight="medium">
        {value}
      </Text>
    </View>
  );
}

export function useProfileBackGuard(blocked: boolean, onBack: () => void) {
  const navigation = useNavigation(),
    allow = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!blocked) return false;
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [blocked, onBack]),
  );
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (blocked && !allow.current) {
          event.preventDefault();
          onBack();
        }
      }),
    [navigation, blocked, onBack],
  );
  return (value = true) => {
    allow.current = value;
  };
}
