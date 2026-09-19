import {invokeSocial} from './socialBackend';
export const vipService=Object.freeze({
 state:()=>invokeSocial('getVipState',{}),
 plans:()=>invokeSocial('getVipPlans',{}),
 content:contentId=>invokeSocial('authorizeVipContent',{contentId}),
 photo:recipientUid=>invokeSocial('authorizePhotoMessage',{recipientUid}),
});
export const getVipTier=user=>user?.vip?.state==='VIP'&&user?.vip?.status==='active'?'VIP':'FREE';
export const hasVipLevel=user=>getVipTier(user)==='VIP';
export const canSeeProfileVisitors=user=>hasVipLevel(user);
export const canUseVipInCallMessaging=()=>false;
export const canUseVipCameraSwitch=()=>false;
