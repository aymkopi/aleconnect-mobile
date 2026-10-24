import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Platform,View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConsumerUpdateId} from '@/features/reports/consumer-updates-contract';
import Constants from 'expo-constants';
import {useAuthSession} from '@/hooks/use-auth-session';
import {useConsumerAccount} from '@/hooks/use-consumer-account';
import {ReportPage} from '@/features/reports/components/report-page';
import {Button} from '@/components/panelui/button';
import {Card} from '@/components/panelui/card';
import {Input} from '@/components/panelui/input';
import {RadioGroup} from '@/components/panelui/radio-group';
import {Spinner} from '@/components/panelui/spinner';
import {Text} from '@/components/panelui/text';
import {ApiRequestError} from '@/services/api';
import {readAppFeedbackDraft,saveAppFeedbackDraft,sendAppFeedback} from '@/services/feedback';
import {formatManilaDateTime} from '@/utils/manila-time';
import {appFeedbackTextError,type AppFeedbackDraft,type AppFeedbackScope} from './app-feedback-contract';

const appVersion=String(Constants.expoConfig?.extra?.releaseVersion??Constants.expoConfig?.version??'unknown');
const platform=Platform.OS==='android'?'android':Platform.OS==='ios'?'ios':'web';
function emptyDraft(scope:AppFeedbackScope):AppFeedbackDraft{return {...scope,version:1,clientMutationId:createConsumerUpdateId(),category:'suggestion',text:'',appVersion,platform,status:'draft',receipt:null};}
export function AppFeedbackScreen(){
 const router=useRouter(),{session,isLoading:authLoading}=useAuthSession();
 const {accountContext,isLoading:accountLoading,refreshConsumerAccount}=useConsumerAccount();
 const principalId=session?.user.id,identityUserId=accountContext?.identityUserId;
 const scope=useMemo(()=>principalId&&identityUserId?{principalId,identityUserId}:null,[principalId,identityUserId]);
 const ownerKey=scope?JSON.stringify(scope):null,latest=useRef(ownerKey),mounted=useRef(true);
 useLayoutEffect(()=>{latest.current=ownerKey;},[ownerKey]);
 const [draft,setDraft]=useState<AppFeedbackDraft|null>(null),draftRef=useRef<AppFeedbackDraft|null>(null);
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempted,setAttempted]=useState(false),[retry,setRetry]=useState(0);
 const put=useCallback((next:AppFeedbackDraft|null)=>{draftRef.current=next;setDraft(next);},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous owner's rendered draft before reading private storage.
  let active=true;put(null);setLoadError('');setError('');setLoading(true);setAttempted(false);setBusy(false);
  if(!scope){setLoading(false);return;}
  readAppFeedbackDraft(scope).then(saved=>{if(active)put(saved??emptyDraft(scope));}).catch(failure=>{if(active)setLoadError(failure instanceof Error?failure.message:'Saved feedback could not load. Its local copy is kept.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[scope,retry,put]);
 const current=()=>mounted.current&&latest.current===ownerKey;
 const canWrite=accountContext?.capabilities.appFeedback===true;
 function update(patch:Partial<Pick<AppFeedbackDraft,'category'|'text'>>){
  const previous=draftRef.current;if(!scope||!previous||previous.status!=='draft'||busy||!canWrite)return;
  const next={...previous,...patch};put(next);setError('');
  void saveAppFeedbackDraft(scope,next).catch(()=>{if(current())setError('Your changes could not be saved on this device. Keep this page open and try again.');});
 }
 async function send(){
  const previous=draftRef.current;if(!scope||!accountContext||!previous||busy||previous.status==='received'||(previous.status==='draft'&&!canWrite))return;
  setAttempted(true);const invalid=appFeedbackTextError(previous.text);if(invalid){setError(invalid);return;}
  const pending:AppFeedbackDraft={...previous,status:'pending',receipt:null};put(pending);setBusy(true);setError('');
  try{
   const received=await sendAppFeedback({...scope,serviceAccountId:accountContext.defaultServiceAccountId,accessRevision:accountContext.accessRevision},pending);
   if(current())put(received);
  }catch(failure){
   if(failure instanceof ApiRequestError&&failure.status===400){
    const editable:AppFeedbackDraft={...pending,status:'draft'};
    try{await saveAppFeedbackDraft(scope,editable);if(current())put(editable);}catch{/* The original pending copy remains recoverable. */}
   }
   if(current())setError(`${failure instanceof Error?failure.message:'Feedback could not be sent.'} Your saved copy is kept.`);
  }finally{if(current())setBusy(false);}
 }
 async function leave(){
  try{if(scope&&draftRef.current?.status==='draft'&&!busy)await saveAppFeedbackDraft(scope,draftRef.current);if(router.canGoBack())router.back();else router.replace('/profile/help');}
  catch{setError('The draft could not be saved. Keep this page open and try again.');}
 }
 async function another(){if(!scope)return;const next=emptyDraft(scope);try{await saveAppFeedbackDraft(scope,next);if(current()){put(next);setAttempted(false);setError('');}}catch{if(current())setError('A new draft could not be saved. Your receipt is kept.');}}
 const owned=Boolean(scope&&draft&&draft.principalId===scope.principalId&&draft.identityUserId===scope.identityUserId);
 const footer=owned&&draft ? draft.status==='received'?<Button onPress={()=>void another()}>Send more feedback</Button>:<Button loading={busy} disabled={busy||(draft.status==='draft'&&!canWrite)} onPress={()=>void send()}>{draft.status==='pending'?'Retry saved feedback':'Send app feedback'}</Button>:undefined;
 return <ReportPage title="App feedback" onBack={()=>void leave()} footer={footer}>
  {authLoading||accountLoading||loading?<View accessibilityLabel="Loading saved feedback"><Spinner/></View>:!session?<><Text>Sign in to send app feedback.</Text><Button onPress={()=>router.push('/sign-in')}>Sign in</Button></>:!accountContext?<><Text accessibilityRole="alert">Your account context could not load.</Text><Button variant="outline" onPress={()=>void refreshConsumerAccount()}>Retry account access</Button></>:loadError?<><Text accessibilityRole="alert" className="text-destructive">{loadError}</Text><Button variant="outline" onPress={()=>setRetry(value=>value+1)}>Retry saved feedback</Button></>:owned&&draft?<>
   <Text size="sm" muted>Use this form for suggestions or problems using ALEConnect. For an electricity concern, create a report or contact ALECO.</Text>
   {draft.status==='received'&&draft.receipt?<Card className="p-4 gap-2"><Text weight="semibold">Feedback received</Text><Text size="sm">Your message was received for app review on {formatManilaDateTime(draft.receipt.acceptedAt)}.</Text><Text size="sm" muted>This does not create an electricity service report.</Text></Card>:<>
    {!canWrite?<Text size="sm" muted>New app feedback is temporarily unavailable. Your saved copy remains available.</Text>:null}
    {draft.status==='pending'?<Text size="sm" accessibilityLiveRegion="polite">Saved on this device; delivery is not confirmed. Retry uses the original submission.</Text>:null}
    <RadioGroup value={draft.category} onValueChange={value=>{if(value==='bug'||value==='suggestion')update({category:value});}} disabled={busy||draft.status!=='draft'||!canWrite}>
     <RadioGroup.Item value="bug" label="App problem" description="Something in the app is not working"/>
     <RadioGroup.Item value="suggestion" label="Suggestion" description="An idea to improve the app"/>
    </RadioGroup>
    <Input label="Your feedback" value={draft.text} onChangeText={text=>update({text})} multiline numberOfLines={8} maxLength={4000} disabled={busy||draft.status!=='draft'||!canWrite} errorMessage={attempted?appFeedbackTextError(draft.text)??undefined:undefined}/>
    <Text size="xs" muted>{[...draft.text.trim()].length}/2,000 characters. Only your category, message, app version and platform are attached.</Text>
   </>}
   <View className="gap-2"><Button variant="outline" onPress={()=>router.push('/reports/new')}>Report an electricity concern</Button><Button variant="ghost" onPress={()=>router.push('/hotlines')}>View ALECO hotlines</Button></View>
  </>:null}
  {error?<Text accessibilityRole="alert" className="text-destructive" size="sm">{error}</Text>:null}
 </ReportPage>;
}
