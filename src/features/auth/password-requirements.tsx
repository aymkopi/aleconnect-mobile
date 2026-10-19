import { View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { Text } from '@/components/panelui/text';
import { useAppColors } from '@/hooks/use-app-colors';
import { consumerPasswordRules } from '@/lib/consumer-password-policy';

export function PasswordRequirements({ password, confirmation, personal = [] }: {
  password: string; confirmation: string; personal?: readonly string[];
}) {
  const [primary, muted] = useAppColors(['primary', 'muted-foreground']);
  const rules = [...consumerPasswordRules(password, personal), {
    id: 'confirmation', label: 'Both passwords match', met: !!password && password === confirmation,
  }];
  return <View className="gap-2" accessibilityLiveRegion="polite" accessibilityLabel="Password requirements">
    {rules.map(rule => {
      const Icon = rule.met ? Check : Circle;
      return <View key={rule.id} className="flex-row items-start gap-2"
        accessible accessibilityLabel={(rule.met ? 'Met: ' : 'Not met: ') + rule.label}>
        <Icon size={14} color={rule.met ? primary : muted} style={{ marginTop: 2 }} />
        <Text size="xs" muted={!rule.met} className="flex-1">{rule.label}</Text>
      </View>;
    })}
    <Text size="xs" muted>Your account details and known breaches are checked securely when you save.</Text>
  </View>;
}
