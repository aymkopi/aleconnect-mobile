import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { usePathname, useRouter, useGlobalSearchParams, type Href } from 'expo-router';
import { BottomSheet } from '@/components/panelui/bottom-sheet';
import { Button } from '@/components/panelui/button';
import { Text } from '@/components/panelui/text';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useVisualPreview } from '@/context/visual-preview-context';
import { authReturnRoute } from '@/features/auth/auth-state';
import { guestGateDescriptions, guestRouteAccess, type GuestGateKind } from '@/features/auth/guest-access';

const Context = createContext<{ guest: boolean; gateOpen: boolean; openFeature: (path: string, previewReport?: boolean) => void; requestSignIn: (path: string, kind?: GuestGateKind) => void } | null>(null);
export function GuestAccessProvider({ children }: PropsWithChildren) {
  const router = useRouter(), pathname = usePathname();
  const params = useGlobalSearchParams<{ appearance?: string | string[] }>();
  const targetPath = pathname === '/profile' && params.appearance === '1' ? '/profile?appearance=1' : pathname;
  const { session, isLoading } = useAuthSession();
  const { fixtures } = useVisualPreview();
  const guest = !session && !fixtures;
  const [gate, setGate] = useState<{ path: string; kind: GuestGateKind } | null>(null);
  const requestSignIn = useCallback((path: string, kind: GuestGateKind = guestRouteAccess(path) ?? 'account') => setGate({ path, kind }), []);
  const dismissGate = () => {
    if (gate?.kind === 'advisory' && pathname !== '/advisories' && pathname !== '/home') router.replace('/advisories');
    setGate(null);
  };
  const openFeature = useCallback((path: string, previewReport = false) => {
    const kind = guestRouteAccess(path);
    if (guest && kind) {
      if (previewReport && path === '/reports/new') router.push('/services/report-preview' as Href);
      else requestSignIn(path, kind);
    } else if (['/home', '/reports', '/advisories', '/hotlines', '/profile'].includes(path)) router.navigate(path as Href);
    else router.push(path as Href);
  }, [guest, requestSignIn, router]);
  useEffect(() => {
    if (isLoading) return;
    if (['/sign-in', '/sign-in-help', '/required-password'].includes(pathname)) { setGate(null); return; }
    const kind = guestRouteAccess(targetPath);
    if (guest && kind) {
      requestSignIn(targetPath, kind);
      router.replace('/home');
    } else if (!guest) setGate(null);
  }, [guest, isLoading, pathname, targetPath, requestSignIn, router]);
  return (
    <Context.Provider value={{ guest, gateOpen: !!gate, openFeature, requestSignIn }}>
      {children}
      <BottomSheet open={!!gate} onOpenChange={(open) => { if (!open) dismissGate(); }}>
        <BottomSheet.Content size="auto" showClose={false} showGrabber={false} className="px-6 pt-6">
          <BottomSheet.Body contentContainerStyle={{ gap: 16 }}>
            <Text size="xs" weight="semibold" className="text-primary">YOUR ALECO ACCOUNT</Text>
            <Text accessibilityRole="header" style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 22, lineHeight: 32 }}>Log in to use this feature</Text>
            <Text muted size="sm">{guestGateDescriptions[gate?.kind ?? 'account']}</Text>
            <Button fullWidth style={{ minHeight: 48 }} labelClassName="text-[14px]" onPress={() => {
              const returnTo = authReturnRoute(gate?.path);
              setGate(null);
              router.push({ pathname: '/sign-in', params: { returnTo, context: 'new' } });
            }}>Sign in</Button>
            <Button fullWidth variant="outline" style={{ minHeight: 48 }} labelClassName="text-[14px]" onPress={dismissGate}>Keep browsing</Button>
          </BottomSheet.Body>
        </BottomSheet.Content>
      </BottomSheet>
    </Context.Provider>
  );
}
export function useGuestAccess() {
  const value = useContext(Context);
  if (!value) throw new Error('GuestAccessProvider is required');
  return value;
}
