import {useEffect,useState} from 'react';
import {Platform,View} from 'react-native';
import {Text} from '@/components/panelui/text';
import {Button} from '@/components/panelui/button';
import {createConsumerUpdateId} from '@/features/reports/consumer-updates-contract';
import {fetchAdvisoryReminders,readReminderChoice,saveReminderChoice,sendAdvisoryReminder,discardReminderChoice,type ReminderScope,type ReminderChoice,type ReminderPage} from '@/services/advisory-reminders';
import {registerForPushNotificationsAsync} from '@/services/push-notifications';
import {fetchNotificationSettings,registerDevicePushToken} from '@/services/notification-settings';
import {reminderAvailability,type ReminderOccurrence} from './reminder-contract';
import {consumerIntentToken} from '@/services/consumer-intent';

export function AdvisoryReminderSection({advisoryId,occurrences,scope,available}:{advisoryId:string;occurrences:readonly ReminderOccurrence[];scope:ReminderScope;available:boolean}){
 const [page,setPage]=useState<ReminderPage|null>(null),[pending,setPending]=useState<Record<string,ReminderChoice>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  let current=true;
  void Promise.all(occurrences.map(async row=>[row.id,await readReminderChoice(scope,advisoryId,row.id)] as const)).then(rows=>{if(current)setPending(Object.fromEntries(rows.filter((row):row is readonly [string,ReminderChoice]=>row[1]!==null)));}).catch(()=>{if(current)setError('Saved reminder choices could not load.');});
  if(available)void fetchAdvisoryReminders(advisoryId,scope.serviceAccountId).then(value=>{if(current){setPage(value);setError('');}}).catch(()=>{if(current)setError('Reminders could not refresh. Saved choices are kept.');});
  return()=>{current=false;};
 },[advisoryId,scope,occurrences,available,refreshKey]);
 async function send(row:ReminderOccurrence){
  if(busy)return;setBusy(true);setError('');setNotice('');
  const choice=pending[row.id] ?? {clientMutationId:createConsumerUpdateId(),advisoryId,occurrenceId:row.id,serviceAccountId:scope.serviceAccountId,accessRevision:scope.accessRevision,enabled:!page?.subscriptions.some(s=>s.occurrenceId===row.id && s.enabled),leadMinutes:60 as const};
  try{
   await saveReminderChoice(scope,choice);setPending(before=>({...before,[row.id]:choice}));
   await sendAdvisoryReminder(scope,choice);
   setPending(before=>{const next={...before};delete next[row.id];return next;});
   setNotice(choice.enabled?'Reminder saved. Alerts use your current notification settings.':'Reminder cancelled.');
   setRefreshKey(v=>v+1);
   if(choice.enabled && Platform.OS!=='web'){
    const settings=await fetchNotificationSettings(scope.identityUserId);
    if(!settings.preferences.receivePushNotifications || !settings.preferences.receiveAdvisories)setNotice('Reminder saved. Enable push and advisory alerts in Notification settings to receive it.');
    else {const token=await registerForPushNotificationsAsync();if(token)await registerDevicePushToken(token,await consumerIntentToken(scope));else setNotice('Reminder saved. This device has no notification permission or registered push token. Check Notification settings.');}
   }
  }catch(failure){setError(failure instanceof Error?failure.message:'Receipt not confirmed. Retry your saved choice.');}finally{setBusy(false);}
 }
 async function discard(id:string){try{await discardReminderChoice(scope,advisoryId,id);setPending(before=>{const next={...before};delete next[id];return next;});setRefreshKey(v=>v+1);}catch{setError('The saved choice could not be removed.');}}
 if(!occurrences.length)return null;
 return <View className="gap-3 rounded-xl bg-card p-4" accessibilityLabel="Official schedule and reminders">
  <Text weight="semibold">Official schedule (Philippine time)</Text>
  {occurrences.map(row=>{
   const state=reminderAvailability(row),saved=page?.subscriptions.some(s=>s.occurrenceId===row.id && s.enabled),choice=pending[row.id];
   const reason=state==='cancelled'?'This occurrence was cancelled.':state==='date_only'?'No exact start time has been announced.':state==='too_late'?'New reminders require more than one hour before the start.':'This occurrence is not eligible for this service account.';
   return <View key={row.id} className="gap-2 rounded-xl bg-background p-3">
    <Text size="sm" weight="medium">{row.date}{row.startTime?` · ${row.startTime}`:' · Time to be announced'}{row.endTime?` to ${row.endDate ?? row.date} ${row.endTime}`:''}</Text>
    {row.status==='cancelled'?<Text muted size="sm">Cancelled{row.cancellationReason?`: ${row.cancellationReason}`:''}</Text>:null}
    {saved?<Text size="sm">Reminder saved for this account.</Text>:null}
    {choice?<Text size="sm" accessibilityLiveRegion="polite">Saved choice awaiting a server receipt: {choice.enabled?'enable':'cancel'} reminder.</Text>:null}
    {available && page?.enabled && (choice || saved || state==='available' && page.eligibleOccurrenceIds.includes(row.id))?<Button variant="outline" disabled={busy || !page.canWrite} onPress={()=>void send(row)}>{busy?'Saving…':choice?'Retry saved reminder choice':saved?'Cancel reminder':'Remind me 1 hour before'}</Button>:<Text muted size="sm">{!available || page?.enabled===false?'Reminders are unavailable.':reason}</Text>}
    {choice?<Button variant="ghost" disabled={busy} onPress={()=>void discard(row.id)}>Remove saved choice from this device</Button>:null}
   </View>;
  })}
  <Button variant="ghost" disabled={busy || !available} onPress={()=>setRefreshKey(v=>v+1)}>Refresh reminders</Button>
  {page && !page.canWrite?<Text muted size="sm">Saving reminders is paused. Your saved choices are kept.</Text>:null}
  {error?<Text accessibilityRole="alert" size="sm" className="text-destructive">{error}</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" size="sm">{notice}</Text>:null}
 </View>;
}
