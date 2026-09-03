export const CALL_STATUSES = Object.freeze({
  REQUESTING: 'requesting', RINGING: 'ringing', ACCEPTED: 'accepted',
  CONNECTING: 'connecting', CONNECTED: 'connected', ENDED: 'ended',
  REJECTED: 'rejected', MISSED: 'missed', CANCELLED: 'cancelled', FAILED: 'failed',
});

export const ACTIVE_CALL_STATUSES = Object.freeze([
  'requesting', 'ringing', 'accepted', 'connecting', 'connected',
]);
export const TERMINAL_CALL_STATUSES = Object.freeze(['ended', 'rejected', 'missed', 'cancelled', 'failed']);
export const CALL_RING_TIMEOUT_SECONDS = 30;
export const DAILY_FREE_PREVIEW_SECONDS = 30;
export const BILLING_INCREMENT_SECONDS = 10;
export const CALL_ENTITLEMENT_TIMEZONE = 'UTC';

export const ALLOWED_CALL_TRANSITIONS = Object.freeze({
  requesting: Object.freeze(['ringing', 'cancelled', 'failed']),
  ringing: Object.freeze(['accepted', 'rejected', 'missed', 'cancelled', 'failed']),
  accepted: Object.freeze(['connecting', 'cancelled', 'failed']),
  connecting: Object.freeze(['connected', 'cancelled', 'failed']),
  connected: Object.freeze(['ended', 'failed']),
  ended: Object.freeze([]), rejected: Object.freeze([]), missed: Object.freeze([]),
  cancelled: Object.freeze([]), failed: Object.freeze([]),
});
