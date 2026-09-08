'use strict';
const D = require('./callDomain');

// Persist deadlines once. Client ticks only display these server-owned times.
const connectedPaymentFields = (nowMs, previewEligible) => {
  const previewEndsAtMs = nowMs + (previewEligible ? D.PREVIEW_SECONDS * 1000 : 0);
  const paymentDecisionDeadlineMs = previewEndsAtMs + D.PAID_DECISION_SECONDS * 1000;
  return { previewEndsAtMs, paymentDecisionDeadlineMs,
    expiresAtMs: previewEligible ? previewEndsAtMs : paymentDecisionDeadlineMs };
};
const awaitingPaymentFields = (nowMs) => ({
  billingMode: D.BILLING_MODES.AWAITING_PAID_CONFIRMATION,
  paymentDecisionDeadlineMs: nowMs + D.PAID_DECISION_SECONDS * 1000,
  expiresAtMs: nowMs + D.PAID_DECISION_SECONDS * 1000,
});

const createCallPaymentLifecycle = ({ db, FieldValue, HttpsError }) => {
  const result = (callId, call, nowMs) => ({
    callId, status: call.status, billingMode: call.billingMode,
    previewEndsAtMs: call.previewEndsAtMs ?? null,
    paymentDecisionDeadlineMs: call.paymentDecisionDeadlineMs ?? null,
    paidStartedAtMs: call.paidStartedAtMs ?? null,
    ratePerMinute: call.ratePerMinute, serverNowMs: nowMs,
  });

  // Shared by the participant callable and the scheduled reconciler. Re-read
  // inside the transaction so a stale query cannot end a newly paid call.
  const synchronize = (callId, uid) => db.runTransaction(async (tx) => {
    const ref = db.doc(`calls/${callId}`), snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Call not found.');
    const call = snap.data(), nowMs = Date.now();
    if (uid) D.assertParticipant(uid, call);
    if (call.status !== 'connected' || !['preview', 'awaiting_paid_confirmation'].includes(call.billingMode)) {
      return result(callId, call, nowMs);
    }
    // Compatibility for calls connected by the previous emulator code.
    const previewEndsAtMs = call.previewEndsAtMs ?? (call.connectedAtMs + D.PREVIEW_SECONDS * 1000);
    const deadline = call.paymentDecisionDeadlineMs ?? (
      (call.billingMode === 'preview' ? previewEndsAtMs : call.connectedAtMs) + D.PAID_DECISION_SECONDS * 1000
    );
    if (!Number.isFinite(deadline) || !Number.isFinite(previewEndsAtMs)) {
      throw new HttpsError('failed-precondition', 'Call timing is unavailable. End this call and try again.');
    }
    if (nowMs >= deadline) {
      const hostRef = db.doc(`users/${call.receiverId}`);
      const locks = [db.doc(`activeCallLocks/${call.callerId}`), db.doc(`activeCallLocks/${call.receiverId}`)];
      const [host, ...lockSnaps] = await Promise.all([tx.get(hostRef), ...locks.map((lock) => tx.get(lock))]);
      const patch = {
        status: 'ended', billingMode: D.BILLING_MODES.ENDED,
        endedAt: FieldValue.serverTimestamp(), endedAtMs: deadline,
        endedBy: 'system', endReason: 'payment_decision_timeout',
        durationSeconds: Math.max(0, Math.floor((deadline - call.connectedAtMs) / 1000)),
        paidDurationSeconds: call.paidDurationSeconds || 0,
      };
      tx.update(ref, patch);
      tx.set(db.doc(`callHistory/${callId}`), {
        callId, participantIds: call.participantIds, callerId: call.callerId, receiverId: call.receiverId,
        createdAt: call.createdAt, acceptedAt: call.acceptedAt ?? null, connectedAt: call.connectedAt ?? null,
        endedAt: patch.endedAt, durationSeconds: patch.durationSeconds, paidDurationSeconds: patch.paidDurationSeconds,
        ratePerMinute: call.ratePerMinute, billedCredits: call.billedCredits || 0,
        billingMode: call.billingMode, previewConsumed: call.previewConsumed === true,
        endReason: patch.endReason, status: patch.status,
      });
      lockSnaps.forEach((lock, index) => { if (lock.data()?.callId === callId) tx.delete(locks[index]); });
      if (host.exists && host.data().hostStatus?.availability === 'busy'
          && (!lockSnaps[1].exists || lockSnaps[1].data().callId === callId)) {
        tx.update(hostRef, {
          'hostStatus.availability': host.data().hostStatus?.preCallAvailability === 'offline' ? 'offline' : 'online',
          'hostStatus.preCallAvailability': FieldValue.delete(),
        });
      }
      return result(callId, { ...call, ...patch }, nowMs);
    }
    const mode = call.billingMode === 'preview' && nowMs >= previewEndsAtMs
      ? D.BILLING_MODES.AWAITING_PAID_CONFIRMATION : call.billingMode;
    const patch = { billingMode: mode, previewEndsAtMs, paymentDecisionDeadlineMs: deadline,
      expiresAtMs: mode === 'preview' ? previewEndsAtMs : deadline };
    if (Object.entries(patch).some(([key, value]) => call[key] !== value)) tx.update(ref, patch);
    return result(callId, { ...call, ...patch }, nowMs);
  });

  const confirm = async (callId, uid) => {
    // Commit expiry independently: throwing from the following transaction
    // must not roll back cleanup when consent arrived after the deadline.
    await synchronize(callId, uid);
    return db.runTransaction(async (tx) => {
      const ref = db.doc(`calls/${callId}`), snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Call not found.');
      const call = snap.data();
      D.assertParticipant(uid, call);
      if (uid !== call.callerId) throw new HttpsError('permission-denied', 'Only the consumer can confirm paid time.');
      const [consumer, host] = await Promise.all([
        tx.get(db.doc(`users/${call.callerId}`)), tx.get(db.doc(`users/${call.receiverId}`)),
      ]);
      const nowMs = Date.now();
      if (consumer.data()?.role !== 'consumer' || host.data()?.role !== 'host'
          || host.data()?.hostStatus?.isApproved !== true || call.receiverId === uid
          || call.participantIds.length !== 2 || !call.participantIds.includes(call.receiverId)) {
        throw new HttpsError('permission-denied', 'Paid continuation requires the consumer and approved host participants.');
      }
      if (call.status !== 'connected') throw new HttpsError('failed-precondition', 'This call can no longer continue.', { reason: 'call_ended' });
      // A retry of successful consent must not reset the paid clock.
      if (call.billingMode === D.BILLING_MODES.PAID) return { ...result(callId, call, nowMs), idempotent: true };
      if (call.billingMode !== D.BILLING_MODES.AWAITING_PAID_CONFIRMATION) {
        throw new HttpsError('failed-precondition', 'Paid continuation is not available.');
      }
      if (!Number.isFinite(call.paymentDecisionDeadlineMs) || nowMs >= call.paymentDecisionDeadlineMs) {
        throw new HttpsError('deadline-exceeded', 'The payment decision has expired.', { reason: 'payment_decision_timeout' });
      }
      const charge = D.incrementCredits(call.ratePerMinute);
      const balance = consumer.data()?.wallet?.creditBalance;
      if (!Number.isSafeInteger(balance) || balance < charge) {
        throw new HttpsError('resource-exhausted', 'Not enough credits to continue.', {
          reason: 'insufficient_credits', requiredCredits: charge,
          availableCredits: Number.isSafeInteger(balance) ? balance : 0,
        });
      }
      const patch = {
        billingMode: D.BILLING_MODES.PAID, paidStartedAt: FieldValue.serverTimestamp(), paidStartedAtMs: nowMs,
        // Keep lifetime transaction IDs while starting this paid segment at zero elapsed time.
        paidSessionStartIncrement: call.settledIncrements || 0,
        paymentDecisionDeadlineMs: null, expiresAtMs: FieldValue.delete(),
        endReason: null, lastRtcPresenceAt: FieldValue.serverTimestamp(),
      };
      tx.update(ref, patch);
      return { ...result(callId, { ...call, ...patch }, nowMs),
        incrementSeconds: D.BILLING_INCREMENT_SECONDS, incrementCredits: charge };
    });
  };
  return { synchronize, confirm };
};

module.exports = { connectedPaymentFields, awaitingPaymentFields, createCallPaymentLifecycle };
