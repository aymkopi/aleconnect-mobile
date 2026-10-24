import { View } from 'react-native';
import { Card } from '@/components/panelui/card';
import { Button } from '@/components/panelui/button';
import { DatePicker } from '@/components/panelui/date-picker';
import { Text } from '@/components/panelui/text';
import { formatManilaDateTime } from '@/utils/manila-time';
import type { ServiceRequestKind, ServiceRequestProgress } from './service-request-contract';

export function ServiceRequestFields({kind,requirements,requestedDate,onChange,error,disabled}:{kind:ServiceRequestKind;requirements?:string[];requestedDate:string;onChange:(date:string)=>void;error?:string;disabled?:boolean}) {
  return <Card className="p-4 gap-3">
    <Text weight="semibold">{kind==='lighting'?'Temporary lighting':'Temporary disconnection'}</Text>
    <Text size="sm" muted>This request uses the normal report fields. ALECO will review it before confirming a schedule.</Text>
    {requirements?.map(label=><Text key={label} size="sm">• {label}</Text>)}
    <Text weight="medium" size="sm">Requested date (optional)</Text>
    <DatePicker selected={requestedDate ? new Date(`${requestedDate}T12:00:00`) : undefined} onSelect={date=>onChange(date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '')} disabled={disabled}>
      <Button variant="outline" disabled={disabled} accessibilityLabel={`Requested service date: ${requestedDate || 'not selected'}`}>{requestedDate || 'Choose a requested date'}</Button>
    </DatePicker>
    <Text size="xs" muted>Your preferred date is not a confirmed appointment.</Text>
    {requestedDate ? <Button variant="ghost" disabled={disabled} onPress={()=>onChange('')}>Clear requested date</Button> : null}
    {error ? <Text size="sm" className="text-destructive" accessibilityRole="alert">{error}</Text> : null}
  </Card>;
}
export function ServiceRequestProgressCard({value}:{value:ServiceRequestProgress}) {
  return <Card className="p-4 gap-3">
    <Text weight="semibold">Service request</Text>
    <Text size="sm">{value.kind==='lighting'?'Temporary lighting':'Temporary disconnection'}</Text>
    <View className="gap-1"><Text size="xs" muted>Requested date</Text><Text size="sm">{value.requestedDate || 'No preference provided'}</Text><Text size="xs" muted>This is the consumer’s preference.</Text></View>
    <View className="gap-1"><Text size="xs" muted>Confirmed schedule</Text><Text size="sm">{value.confirmedSchedule ? formatManilaDateTime(value.confirmedSchedule) : 'Not yet confirmed by ALECO'}</Text></View>
    {value.requirements.map(item=><Text key={item.label} size="sm">{item.label}: {item.received ? 'Received' : 'Clarification needed'}</Text>)}
    {value.missingRequirementNote ? <Text size="sm">ALECO clarification: {value.missingRequirementNote}</Text> : null}
    <Text size="xs" muted>The official report status shows operational progress. Use report updates below to send clarification.</Text>
  </Card>;
}
