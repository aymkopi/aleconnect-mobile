import type {ConsumerUpdatesPage} from './consumer-updates-contract.ts';
export function newerConsumerUpdates(current:ConsumerUpdatesPage|null,incoming:ConsumerUpdatesPage){
 if(current?.closurePolicy&&!incoming.closurePolicy)return current;
 if(current?.conversation&&incoming.conversation?.cycleId===current.conversation.cycleId&&incoming.conversation.revision<current.conversation.revision)return current;
 if(current?.serviceFeedback&&current.conversation?.cycleId===incoming.conversation?.cycleId&&(!incoming.serviceFeedback||incoming.serviceFeedback.version<current.serviceFeedback.version))return {...incoming,serviceFeedback:current.serviceFeedback,canRate:false};
 return incoming;
}
