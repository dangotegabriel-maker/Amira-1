import { invokeSocial } from './socialBackend';
const requestId=()=>`qm_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
export const quickMatchService=Object.freeze({
  start:(id=requestId())=>invokeSocial('startQuickMatch',{requestId:id,termsVersion:'automatic-paid-v3'}),
  state:()=>invokeSocial('getQuickMatchState',{}),
  offer:()=>invokeSocial('getQuickMatchOffer',{}),
  respond:(offer,action)=>invokeSocial('respondToQuickMatch',{consumerUid:offer.consumerUid,requestId:offer.requestId,action}),
  cancel:(id)=>invokeSocial('cancelQuickMatch',{requestId:id}),
});
