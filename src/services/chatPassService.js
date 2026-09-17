import { invokeSocial } from './socialBackend';

// Compatibility: freeMessages is the stored Chat Pass balance, not a text quota.
export const CHAT_PASS_COPY = '1 Chat Pass unlocks a conversation for 24 hours.';
export const chatPassService = { getAccess: (otherUid) => invokeSocial('getChatAccess', { otherUid }) };
export const chatAccessLabel = (access) => {
  if (!access) return 'Checking chat access...';
  if (access.friends) return 'Friends - messaging is free';
  if (access.source === 'vip') return 'Messaging included with your membership';
  if (access.expiresAtMs > access.serverNowMs) return `Chat unlocked until ${new Date(access.expiresAtMs).toLocaleString()}`;
  return access.balance > 0 ? 'Your next message uses 1 Chat Pass for 24 hours' : 'A Chat Pass is needed to continue this conversation';
};
