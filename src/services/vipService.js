import { toDate } from '../utils/socialDomain';

export const VIP_TIERS = Object.freeze({ FREE: 0, VIP_1: 1, VIP_2: 2, VIP_3: 3 });
export const getVipTier = (user, now = new Date()) => {
  const tier = VIP_TIERS[user?.vip?.tier] == null ? 'FREE' : user.vip.tier;
  const expiry = toDate(user?.vip?.expiresAt);
  return user?.vip?.status === 'active' && (!expiry || expiry > now) ? tier : 'FREE';
};
export const hasVipLevel = (user, required, now) => VIP_TIERS[getVipTier(user, now)] >= VIP_TIERS[required];
export const canSeeProfileVisitors = (user, now) => hasVipLevel(user, 'VIP_1', now);
export const canUseVipInCallMessaging = (user, now) => hasVipLevel(user, 'VIP_2', now);
export const canUseVipCameraSwitch = (user, now) => hasVipLevel(user, 'VIP_2', now);
