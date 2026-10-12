import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  Contact,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react-native";
import { InputGroup } from "@/components/panelui/input-group";
import { Button } from "@/components/panelui/button";
import { Spinner } from "@/components/panelui/spinner";
import { Label } from "@/components/panelui/label";
import { Text } from "@/components/panelui/text";
import { PANELUI_PREVIEW } from "@/constants/panelui-preview";
import { useVisualPreview } from "@/context/visual-preview-context";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAppColors } from "@/hooks/use-app-colors";
import { signInWithAccountNumber, signInWithEmail } from "@/services/auth";
import { useProfileBackGuard } from "@/features/profile/profile-ui";
import {
  signInCopy,
  signInIntent,
  signedInDestination,
  validateSignIn,
} from "./auth-state";

export default function SignInScreen() {
  const params = useLocalSearchParams<{
    mode?: string | string[];
    linked?: string | string[];
    linking?: string | string[];
    context?: string | string[];
    returnTo?: string | string[];
  }>();
  const intent = signInIntent(params);
  return (
    <SignInForm
      key={[
        intent.mode,
        intent.linked,
        intent.linking,
        intent.context,
        intent.returnTo,
      ].join(":")}
      intent={intent}
    />
  );
}
function SignInForm({ intent }: { intent: ReturnType<typeof signInIntent> }) {
  const { setFixtures, setGuestFixtures } = useVisualPreview();
  const router = useRouter(),
    insets = useSafeAreaInsets();
  const { session, isLoading, refreshSession } = useAuthSession();
  const [mode, setMode] = useState(intent.mode);
  const [resume, setResume] = useState(false);
  const isResume = intent.context === "session-ended";
  const [foreground, card, muted, primaryForeground, border] = useAppColors([
    "foreground",
    "card",
    "muted-foreground",
    "primary-foreground",
    "border",
  ]);
  const iconColor = isResume ? muted : "white";
  const fieldStyle = [
    styles.field,
    isResume && {
      color: foreground,
      backgroundColor: card,
      borderColor: border,
    },
  ];
  const linkingParams = intent.linking ? { linking: "1" } : {};
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true),
    submitting = useRef(false),
    principal = useRef(session?.user.id);
  principal.current = session?.user.id;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const copy = signInCopy(mode, intent.context);
  const EyeIcon = visible ? EyeOff : Eye;
  const IdentityIcon = mode === "account" ? Contact : Mail;
  const AlternateIcon = mode === "account" ? Mail : Contact;
  const destination = session
    ? signedInDestination(intent, session)
    : intent.returnTo;
  function leave() {
    if (busy) return;
    setPassword("");
    setVisible(false);
    if (isResume && resume) {
      setResume(false);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }
  const allowLeave = useProfileBackGuard(busy, leave);
  async function submit() {
    if (submitting.current) return;
    const problem = validateSignIn(mode, identity, password);
    if (problem) {
      setError(problem);
      return;
    }
    submitting.current = true;
    allowLeave(false);
    setBusy(true);
    setError("");
    const initialPrincipal = principal.current;
    const isCurrent = () =>
      mounted.current && principal.current === initialPrincipal;
    const secret = password;
    setPassword("");
    setVisible(false);
    try {
      const login =
        mode === "account"
          ? await signInWithAccountNumber(
              { accountNumber: identity, password: secret },
              isCurrent,
            )
          : await signInWithEmail(
              { email: identity, password: secret },
              isCurrent,
            );
      if (!isCurrent()) return;
      const refreshed = await refreshSession({ forceNetwork: true });
      if (!mounted.current) return;
      setPassword("");
      if (
        !refreshed ||
        refreshed.user.id !== login.user.id ||
        (principal.current && principal.current !== login.user.id)
      )
        throw new Error(
          "Sign-in could not be confirmed. Reconnect and try again.",
        );
      allowLeave();
      router.replace(signedInDestination(intent, refreshed));
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "Could not sign in. Try again.",
        );
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const fields = (
    <>
      <View className="gap-1.5">
        <Label>
          <Label.Text style={isResume ? undefined : styles.label}>
            {mode === "account" ? "Account number" : "Email address"}
          </Label.Text>
        </Label>
        <InputGroup isDisabled={busy}>
          <InputGroup.Prefix isDecorative>
            <IdentityIcon size={18} color={iconColor} />
          </InputGroup.Prefix>
          <InputGroup.Input
            accessibilityLabel={
              mode === "account" ? "Account number" : "Email address"
            }
            value={identity}
            onChangeText={setIdentity}
            disabled={busy}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={mode === "account" ? "number-pad" : "email-address"}
            autoComplete={mode === "account" ? "username" : "email"}
            placeholder={
              mode === "account" ? "Enter account number" : "you@example.com"
            }
            placeholderTextColor={isResume ? muted : "rgba(255,255,255,0.64)"}
            style={[fieldStyle, { paddingEnd: 16 }]}
            onSubmitEditing={() => void submit()}
          />
        </InputGroup>
      </View>
      <View className="gap-1.5">
        <Label>
          <Label.Text style={isResume ? undefined : styles.label}>
            Password
          </Label.Text>
        </Label>
        <InputGroup isDisabled={busy}>
          <InputGroup.Prefix isDecorative>
            <Lock size={18} color={iconColor} />
          </InputGroup.Prefix>
          <InputGroup.Input
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            disabled={busy}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            placeholder="Enter password"
            placeholderTextColor={isResume ? muted : "rgba(255,255,255,0.64)"}
            style={fieldStyle}
            onSubmitEditing={() => void submit()}
          />
          <InputGroup.Suffix>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? "Hide password" : "Show password"}
              accessibilityState={{ checked: visible, disabled: busy }}
              disabled={busy}
              onPress={() => setVisible((v) => !v)}
              style={styles.decorator}
            >
              <EyeIcon size={18} color={iconColor} />
            </Pressable>
          </InputGroup.Suffix>
        </InputGroup>
      </View>
      {!isResume ? <Button
        variant="ghost"
        disabled={busy}
        accessibilityLabel="Forgot password?"
        style={{ minHeight: 44, alignSelf: "center", paddingHorizontal: 8 }}
        onPress={() => {
          setPassword("");
          router.push({
            pathname: "/sign-in-help",
            params: {
              mode,
              context: intent.context,
              returnTo: intent.returnTo,
              ...linkingParams,
            },
          });
        }}
      >
        <Text style={styles.help}>
          Forgot password?
        </Text>
      </Button> : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={isResume ? undefined : styles.error}
          className={isResume ? "text-destructive" : undefined}
        >
          {error}
        </Text>
      ) : null}
    </>
  );
  if (isLoading)
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner label="Restoring session" />
      </View>
    );
  if (session && !busy && !error) return <Redirect href={destination} />;
  if (isResume)
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <KeyboardAwareScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bottomOffset={24}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.body}>
            <View className="gap-3">
              <Text style={[styles.brand, { color: foreground }]}>ALEConnect</Text>
              <Text accessibilityRole="header" style={[styles.heading, { color: foreground }]}>
                {resume ? intent.returnTo === "/reports/new" ? "Resume your report" : "Resume sign-in" : "Sign in to continue"}
              </Text>
              {!resume ? <Text size="sm" muted className="text-center">{copy.description}</Text> : null}
            </View>
            {resume ? <>
              <View className="gap-3">{fields}</View>
              <Text size="sm" muted className="text-center">
                After sign-in, we’ll reopen the page you were using. Saved queue entries are available only to their original account.
              </Text>
            </> : null}
            <View className="gap-3">
              {resume ? <>
                <Button loading={busy} disabled={!identity.trim() || !password || busy} onPress={() => void submit()} style={styles.submit} accessibilityLabel="Sign in">
                  <Text size="sm" weight="semibold" className="text-primary-foreground">Sign in</Text>
                </Button>
                <Button variant="outline" disabled={busy} style={styles.submit} accessibilityLabel="Need help signing in?" onPress={() => {
                  setPassword("");
                  router.push({ pathname: "/sign-in-help", params: { mode, context: intent.context, returnTo: intent.returnTo, ...linkingParams } });
                }}>
                  <Text size="sm" weight="semibold">Need help signing in?</Text>
                </Button>
              </> : (["account", "email"] as const).map((method) => {
                const MethodIcon = method === "account" ? Contact : Mail;
                return <Button key={method} variant={method === "account" ? "primary" : "outline"} style={styles.submit}
                  startContent={<MethodIcon size={20} color={method === "account" ? primaryForeground : foreground} />}
                  accessibilityLabel={"Sign in with " + (method === "account" ? "account number" : "email")}
                  onPress={() => { setMode(method); setIdentity(""); setPassword(""); setVisible(false); setError(""); setResume(true); }}>
                  <Text size="sm" weight="semibold" className={method === "account" ? "text-primary-foreground" : undefined}>
                    Sign in with {method === "account" ? "account number" : "email"}
                  </Text>
                </Button>;
              })}
              <Button variant="ghost" disabled={busy} style={{ minHeight: 44 }} onPress={leave}
                accessibilityLabel={resume ? "Use another sign-in method" : "Back to browsing"}>
                <Text size="sm" weight="semibold">{resume ? "Use another sign-in method" : "Back to browsing"}</Text>
              </Button>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    );
  return (
    <View
      style={{ flex: 1, backgroundColor: "#00060F", paddingTop: insets.top }}
    >
      <Image
        source={require("../../../assets/sign-in-mayon.png")}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
      />
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
      >
        <Defs>
          <LinearGradient id="auth-ink" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor="#00060F" stopOpacity={0.7} />
            <Stop offset="0.55" stopColor="#00060F" stopOpacity={0.8} />
            <Stop offset="1" stopColor="#00060F" stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auth-ink)" />
      </Svg>
      <KeyboardAwareScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bottomOffset={24}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={[styles.body, { gap: 12, alignItems: "center" }]}>
          <Text style={styles.brand}>ALEConnect</Text>
          <View style={{ gap: 4, width: "100%" }}>
            <Text accessibilityRole="header" style={styles.heading}>
              {copy.title}
            </Text>
            <Text style={styles.purpose}>{copy.description}</Text>
          </View>
        </View>
        <View style={[styles.body, { gap: 12 }]}>
          {intent.linked ? (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              Account linked—continue with email.
            </Text>
          ) : null}
          {intent.linking ? (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              Use the ALECO account you want to link and its temporary password.
              After updating it, return to email sign-in to finish linking.
            </Text>
          ) : null}
          {fields}
          <View className="gap-3">
            <Button
              fullWidth
              loading={busy}
              disabled={!identity.trim() || !password || busy}
              accessibilityLabel={
                "Sign in with " +
                (mode === "account" ? "account number" : "email")
              }
              style={styles.submit}
              startContent={<IdentityIcon size={20} color={primaryForeground} />}
              onPress={() => void submit()}
            >
              <Text style={[styles.action, { color: primaryForeground }]}>
                Sign in with {mode === "account" ? "account number" : "email"}
              </Text>
            </Button>
            <Button
              variant="outline"
              fullWidth
              disabled={busy}
              style={styles.alternate}
              accessibilityLabel={
                "Sign in with " +
                (mode === "account" ? "email" : "account number")
              }
              startContent={<AlternateIcon size={20} color="white" />}
              onPress={() => {
                setMode(mode === "account" ? "email" : "account");
                setIdentity("");
                setPassword("");
                setVisible(false);
                setError("");
              }}
            >
              <Text style={styles.action}>
                Sign in with {mode === "account" ? "email" : "account number"}
              </Text>
            </Button>
          </View>
          <Text style={styles.note}>
            Use an existing ALECO account. No sign-up is needed.
          </Text>
          {PANELUI_PREVIEW ? (
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() => {
                setPassword("");
                setFixtures(true);
                router.replace("/home");
              }}
            >
              <Text style={styles.action}>Open labelled visual fixtures</Text>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={busy}
            accessibilityLabel="Explore as a guest"
            style={{ minHeight: 44 }}
            onPress={() => {
              setPassword("");
              setGuestFixtures(false);
              router.replace("/home");
            }}
          >
            <Text style={styles.action}>Explore as a guest</Text>
          </Button>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, gap: 24, justifyContent: "center" },
  body: { width: "100%", maxWidth: 440, alignSelf: "center", gap: 16 },
  submit: { minHeight: 48, borderRadius: 16 },
  brand: {
    color: "white",
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
  },
  heading: {
    color: "white",
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.22,
    textAlign: "center",
  },
  purpose: {
    color: "white",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  label: {
    color: "rgba(255,255,255,0.96)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  field: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.24)",
    borderWidth: 0.75,
    color: "white",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  decorator: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    color: "white",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  help: { color: "white", fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 20 },
  alternate: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 0.75,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  note: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  error: {
    color: "white",
    backgroundColor: "rgba(145,25,25,0.75)",
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});
