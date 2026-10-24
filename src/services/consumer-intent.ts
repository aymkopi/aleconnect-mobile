import {apiRequest,getAuthToken,getAuthTokenRevision,type AuthSession} from '@/services/api';
import {normalizeConsumerIdentity} from '@/features/accounts/contract';
export type ConsumerIntentScope={principalId:string;identityUserId:string;serviceAccountId:string;accessRevision:number};
export async function consumerIntentToken(scope:ConsumerIntentScope){
 const revision=getAuthTokenRevision(),token=await getAuthToken();if(!token)throw new Error('Sign in to send this saved choice.');
 const session=await apiRequest<AuthSession>('/api/auth/get-session',{},{authToken:token,phase:'metadata'});
 if(session?.user.id!==scope.principalId)throw new Error('The signed-in account changed. Your original choice is kept.');
 const identity=normalizeConsumerIdentity(await apiRequest<unknown>('/api/mobile/consumer-identity',{},{authToken:token,phase:'metadata'}),session.user);
 if(identity.identityUserId!==scope.identityUserId || identity.accessRevision!==scope.accessRevision || !identity.authorizedServiceAccountIds.includes(scope.serviceAccountId) || revision!==getAuthTokenRevision() || await getAuthToken()!==token)throw new Error('Account access changed. Review your original saved choice.');
 return token;
}
