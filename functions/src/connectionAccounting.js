'use strict';
const C = require('./callRecoveryConfig');

const totals = (call, nowMs) => {
  const state = call.connection || {};
  const end = Math.min(nowMs, state.leaseUntilMs || nowMs);
  const elapsed = state.state === 'connected' && Number.isFinite(state.segmentStartedAtMs)
    ? Math.max(0, end - state.segmentStartedAtMs) : 0;
  return { connectedMs: (state.connectedMs || 0) + elapsed,
    freeMs: (state.freeMs || 0) + (call.billingMode === 'preview' ? elapsed : 0),
    paidMs: (state.paidMs || 0) + (call.billingMode === 'paid' ? elapsed : 0) };
};
const checkpoint = (call, nowMs) => ({ ...call.connection, ...totals(call, nowMs),
  segmentStartedAtMs: call.connection?.state === 'connected' ? nowMs : null });
const deadline = (call, nowMs) => {
  if (['requesting', 'ringing'].includes(call.status)) return call.expiresAtMs;
  if (call.status === 'connecting') return call.connectingDeadlineMs || (call.createdAtMs || 0) + C.CONNECTING_TIMEOUT_MS;
  if (call.connection?.state === 'reconnecting') return call.connection.reconnectDeadlineMs;
  if (call.connection?.state === 'connected') return call.connection.leaseUntilMs;
  return call.expiresAtMs;
};
module.exports = { totals, checkpoint, deadline, ...C };
