import { ACTIVE_CALL_STATUSES, ALLOWED_CALL_TRANSITIONS } from '../config/callConfig';

export const canTransitionCall = (from, to) => Boolean(ALLOWED_CALL_TRANSITIONS[from]?.includes(to));
export const assertCallTransition = (from, to) => {
  if (!canTransitionCall(from, to)) throw new Error(`Invalid call transition: ${from} -> ${to}`);
  return true;
};
export const hasConflictingActiveCall = (calls = [], uid) => calls.some((call) =>
  call.participantIds?.includes(uid) && ACTIVE_CALL_STATUSES.includes(call.status));
export const utcDateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);
export const getPreviewEligibility = (entitlement, now = new Date()) => {
  const dateKey = utcDateKey(now);
  return { dateKey, eligible: !entitlement || entitlement.dateKey !== dateKey || entitlement.consumed !== true };
};
export const shouldConsumePreview = ({ previousStatus, nextStatus, previewEligible, previewConsumed }) =>
  nextStatus === 'connected' && previousStatus === 'connecting' && previewEligible === true && previewConsumed !== true;
export const validateCallEligibility = ({ callerId, creator, relationship, activeCalls = [] }) => {
  if (!callerId) throw new Error('Sign in required.');
  if (!creator?.uid) throw new Error('Creator unavailable.');
  if (callerId === creator.uid) throw new Error('You cannot call yourself.');
  if (creator.role !== 'host' || creator.hostStatus?.isApproved !== true) throw new Error('This creator is not approved for calls.');
  if (creator.hostStatus?.availability !== 'online') throw new Error('This creator is unavailable for calls.');
  if (relationship?.blocked) throw new Error('Calls are unavailable for this connection.');
  if (hasConflictingActiveCall(activeCalls, callerId) || hasConflictingActiveCall(activeCalls, creator.uid)) throw new Error('One participant is already in an active call.');
  return true;
};
