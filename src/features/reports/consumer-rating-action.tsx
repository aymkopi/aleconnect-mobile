import {useMemo} from 'react';
import type {ConsumerUpdateScope} from '@/services/consumer-update-queue';
import {cacheServiceFeedback} from '@/services/consumer-updates-cache';
import {useAuthSession} from '@/hooks/use-auth-session';
import {useConsumerUpdates} from './use-consumer-updates';
import {ServiceFeedbackSection} from './service-feedback-section';
export function ConsumerRatingAction({ticketId,serviceAccountId,scope,available,ticketNumber}:{ticketId:string;serviceAccountId:string;scope:ConsumerUpdateScope;available:boolean;ticketNumber:string}){
 const {page,scope:stable}=useConsumerUpdates(scope,ticketId,serviceAccountId,available),{session}=useAuthSession();
 const feedbackScope=useMemo(()=>({principalId:stable.principalId,identityUserId:stable.identityUserId,accessRevision:stable.accessRevision,serviceAccountId}),[stable,serviceAccountId]);
 const check=page?.resolutionCheck;
 if(!check)return null;
 return <ServiceFeedbackSection key={check.cycleId} ticketId={ticketId} cycleId={check.cycleId} responseVersion={check.responseVersion} confirmed={check.answer==='confirmed'} available={available&&page.serviceFeedbackEnabled===true} canWrite={page.canRate===true} saved={page.serviceFeedback??null} scope={feedbackScope} ticketNumber={ticketNumber} firstName={session?.user.name} onReceived={feedback=>cacheServiceFeedback(stable,ticketId,serviceAccountId,feedback)}/>;
}
