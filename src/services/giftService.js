import { invokeSocial } from './socialBackend';
export const giftService=Object.freeze({
 catalog:()=>invokeSocial('getGiftCatalog',{}),
 send:({hostUid,giftId,source,requestId})=>invokeSocial('sendGift',{hostUid,giftId,source,requestId}),
 publicHostGifts:(hostUid)=>invokeSocial('getPublicHostGifts',{hostUid}),
 requestId:()=>`gift_${Date.now()}_${Math.random().toString(36).slice(2,12)}`,
});
