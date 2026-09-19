import { invokeSocial } from './socialBackend';

// Compatibility: freeMessages is the stored Chat Pass balance, not a text quota.
export const CHAT_PASS_COPY = '1 Chat Pass unlocks a conversation for 24 hours.';
export const chatPassService = { getAccess: (otherUid) => invokeSocial('getChatAccess', { otherUid }) };
export const chatAccessLabel = (access) => {
  if (!access) return 'Checking chat access...';
  if (access.friends) return 'Friends - messaging is free';
  if (access.source === 'vip') return 'Messaging included with your membership';
  if (access.expiresAtMs > access.serverNowMs) return `Chat unlocked until ${new Date(access.expiresAtMs).toLocaleString()}`;
  if (access.balance > 0) return 'Your next message uses 1 Free Message and opens 24-hour access';
  if (access.paidMessaging?.enabled) return `Your next message unlocks 24-hour access for ${access.paidMessaging.priceCredits} Credits`;
  return 'Messaging access is unavailable right now';
};
