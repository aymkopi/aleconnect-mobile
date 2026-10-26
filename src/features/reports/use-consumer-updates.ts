import {useCallback,useEffect,useMemo,useState} from 'react';
import {peekConsumerUpdateHead,readConsumerUpdateHead,subscribeConsumerUpdateHeads} from '@/services/consumer-updates-cache';
import type {ConsumerUpdateScope} from '@/services/consumer-update-queue';
import type {ConsumerUpdatesPage} from './consumer-updates-contract';
export function useConsumerUpdates(scope:ConsumerUpdateScope,ticketId:string,accountId:string,enabled:boolean){
 const accounts=scope.authorizedServiceAccountIds.join('\0');
 const stable=useMemo(()=>({principalId:scope.principalId,identityUserId:scope.identityUserId,accessRevision:scope.accessRevision,authorizedServiceAccountIds:accounts.split('\0')}),[scope.principalId,scope.identityUserId,scope.accessRevision,accounts]);
 const scopeKey=JSON.stringify([stable.principalId,stable.identityUserId,stable.accessRevision,ticketId,accountId]);
 const [snapshot,setSnapshot]=useState<{key:string;page:ConsumerUpdatesPage}|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const page=snapshot?.key===scopeKey?snapshot.page:peekConsumerUpdateHead(stable,ticketId,accountId);
 const refresh=useCallback(async(force=true)=>{
  if(!enabled)return;
  setLoading(true);setError('');
  try{const next=await readConsumerUpdateHead(stable,ticketId,accountId,force);setSnapshot({key:scopeKey,page:next});}
  catch(failure){setError(failure instanceof Error?failure.message:'Updates unavailable.');}
  finally{setLoading(false);}
 },[enabled,stable,ticketId,accountId,scopeKey]);
 useEffect(()=>subscribeConsumerUpdateHeads(()=>{const next=peekConsumerUpdateHead(stable,ticketId,accountId);if(next)setSnapshot({key:scopeKey,page:next});}),[stable,ticketId,accountId,scopeKey]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Cache miss is the only automatic head read; revisits reuse the scoped snapshot.
 useEffect(()=>{void refresh(false);},[refresh]);
 return {page,loading,error,refresh,scope:stable};
}
