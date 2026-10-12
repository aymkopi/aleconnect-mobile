import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ReportPage } from '@/features/reports/components/report-page';
import { Text } from '@/components/panelui/text';
import { Card } from '@/components/panelui/card';
import { Button } from '@/components/panelui/button';
import { useGuestAccess } from '@/context/guest-access-context';
export default function ReportServicePreviewScreen() {
  const router = useRouter();
  const { requestSignIn } = useGuestAccess();
  return <ReportPage title="Report a service issue" onBack={() => router.canGoBack() ? router.back() : router.replace('/services')}>
    <Text accessibilityRole="header" style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 24, lineHeight: 32 }}>Know what to expect.</Text>
    <Text muted size="sm">Report power, meter, line, and other service concerns directly to ALECO.</Text>
    <Card className="rounded-xl p-4 gap-4">
      {[['01', 'Tell us what happened', 'Choose the issue and describe your concern.'], ['02', 'Add a location and photos', 'Pin the issue so the team can find it.'], ['03', 'Follow your report', 'Receive a reference number and status updates.']].map(([step, title, description]) => <View key={step} className="gap-3"><Text size="sm" weight="semibold">{step}   {title}</Text><Text muted size="sm">{description}</Text></View>)}
    </Card>
    <Text size="sm" weight="semibold">Sign in to create and track a report.</Text>
    <Button fullWidth style={{ minHeight: 48 }} labelClassName="text-[14px]" onPress={() => requestSignIn('/reports/new', 'reports')}>Sign in to report</Button>
    <Button fullWidth variant="outline" onPress={() => router.navigate('/hotlines')}>Browse hotlines</Button>
    <Text muted size="xs">For an immediate emergency, open Hotlines for emergency contacts.</Text>
  </ReportPage>;
}
