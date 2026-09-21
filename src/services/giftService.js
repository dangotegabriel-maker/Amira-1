import { invokeSocial } from './socialBackend';
export const giftService=Object.freeze({
 catalog:()=>invokeSocial('getGiftCatalog',{}),
 send:({hostUid,giftId,source,requestId,callId})=>invokeSocial('sendGift',{hostUid,giftId,source,requestId,...(callId?{callId}:{})}),
 publicHostGifts:(hostUid)=>invokeSocial('getPublicHostGifts',{hostUid}),
 requestId:()=>`gift_${Date.now()}_${Math.random().toString(36).slice(2,12)}`,
});
