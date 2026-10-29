import {useEffect,useMemo,useRef} from 'react';
import type {ConsumerUpdateScope} from '@/services/consumer-update-queue';
import {cacheServiceFeedback} from '@/services/consumer-updates-cache';
import {useAuthSession} from '@/hooks/use-auth-session';
import {useConsumerUpdates} from './use-consumer-updates';
import {ServiceFeedbackSection} from './service-feedback-section';
import type {TicketClosurePolicy} from './consumer-updates-contract';
export function ConsumerRatingAction({ticketId,serviceAccountId,scope,available,ticketNumber,closurePolicy,refreshRequest=false,onClosed}:{ticketId:string;serviceAccountId:string;scope:ConsumerUpdateScope;available:boolean;ticketNumber:string;closurePolicy?:TicketClosurePolicy|null;refreshRequest?:boolean;onClosed?:()=>void}){
 const {page,scope:stable,refresh}=useConsumerUpdates(scope,ticketId,serviceAccountId,available),{session}=useAuthSession();
 const feedbackScope=useMemo(()=>({principalId:stable.principalId,identityUserId:stable.identityUserId,accessRevision:stable.accessRevision,serviceAccountId}),[stable,serviceAccountId]);
 const requested=useRef('');
 const policy=page?.closurePolicy??closurePolicy;
 const policyKey=JSON.stringify([stable.principalId,stable.identityUserId,stable.accessRevision,ticketId,serviceAccountId,closurePolicy?.version]);
 useEffect(()=>{if(available&&closurePolicy?.version===1&&!page?.closurePolicy&&requested.current!==policyKey){requested.current=policyKey;void refresh(true);}},[available,closurePolicy?.version,page?.closurePolicy,policyKey,refresh]);
 useEffect(()=>{if(refreshRequest)void refresh(true);},[refreshRequest,refresh]);
 const check=policy?.cycleId?{cycleId:policy.cycleId,responseVersion:0,answer:null}:page?.resolutionCheck;
 if(!check)return null;
 return <ServiceFeedbackSection key={check.cycleId} ticketId={ticketId} cycleId={check.cycleId} responseVersion={check.responseVersion} confirmed={policy?.version===1||check.answer==='confirmed'} available={available&&page?.serviceFeedbackEnabled===true} canWrite={page?.canRate===true&&(!policy||page.closurePolicy?.version===1)} saved={page?.serviceFeedback??null} scope={feedbackScope} ticketNumber={ticketNumber} firstName={session?.user.name} closurePolicyVersion={policy?.version} onClosed={onClosed} onReceived={feedback=>cacheServiceFeedback(stable,ticketId,serviceAccountId,feedback)}/>;
}
