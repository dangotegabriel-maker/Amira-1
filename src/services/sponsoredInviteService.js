import {invokeSocial} from './socialBackend';
const requestId=()=>`invite_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
export const sponsoredInviteService={
 send:(consumerUid,source='consumer_profile',stableId=requestId())=>invokeSocial('sendSponsoredCallInvite',{consumerUid,source,requestId:stableId}),
 pending:()=>invokeSocial('getSponsoredCallInvites',{}),
 respond:(inviteId,action,termsFingerprint)=>invokeSocial('respondToSponsoredCallInvite',{inviteId,action,...(action==='accept'?{termsFingerprint}:{})}),
};
