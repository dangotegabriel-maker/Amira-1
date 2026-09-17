'use strict';
const A = require('./connectionAccounting');
const D = require('./callDomain');
const E = require('./economyDomain');

const createCallRecovery = ({ db, FieldValue, HttpsError }) => {
  const result = (callId, call, now) => ({ callId, ...call, serverNowMs: now });
  const run = (callId, uid, action = 'sync', input = {}) => db.runTransaction(async (tx) => {
    const ref = db.doc(`calls/${callId}`), snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Call not found.');
    let call = snap.data();
    if (uid && !call.participantIds?.includes(uid)) throw new HttpsError('permission-denied','You are not a participant in this call.');
    const now = Date.now();
    if (D.TERMINAL_STATUSES.has(call.status)) return { ...result(callId, call, now), idempotent: true };
    // Legacy sessions cannot prove connection segments. Retire them conservatively
    // when their old deadline expires; never retroactively invent connected usage.
    const versioned = call.accountingVersion === 2;
    let ending = action === 'end', reason = input.reason || 'participant_ended';
    const expiry = A.deadline(call, now);
    if (Number.isFinite(expiry) && now >= expiry) {
      ending = true;
      reason = call.status === 'connecting' ? 'connecting_timeout'
        : call.connection?.state === 'reconnecting' ? 'reconnect_timeout'
        : call.connection?.state === 'connected' ? 'connection_lease_expired' : 'ring_timeout';
    }
    if (!versioned && action === 'reconcile' && !ending) {
      const seen=call.lastRtcPresenceAt?.toMillis?.() ?? call.lastRtcPresenceAt ?? call.connectedAtMs ?? call.createdAtMs;
      if(call.status==='connected' && Number.isFinite(seen) && now-seen>120000){ending=true;reason='legacy_connection_stale';}
      else return result(callId,call,now);
    }
    if (!versioned && !ending) throw new HttpsError('failed-precondition', 'Please end this legacy call and start again.');
    const original = call;
    let connection = versioned ? A.checkpoint(call, now) : null;
    if (connection && reason === 'connection_lease_expired') {
      // An unconfirmed tail is discarded on crash recovery. Settled counters are
      // never rolled back, even when they exceed this conservative evidence cutoff.
      connection = A.checkpoint(call, Math.max(call.connection.segmentStartedAtMs || 0,
        Math.min(...call.participantIds.map((id) => call.connection.participants?.[id]?.lastSeenAtMs || 0))));
      connection.connectedMs = Math.max(connection.connectedMs, call.accountedConnectedMs || 0);
      connection.freeMs = Math.max(connection.freeMs, (call.freeVideoConsumedSeconds || 0) * 1000);
      connection.paidMs = Math.max(connection.paidMs, (call.settledIncrements || 0) * 10000);
    }
    if (versioned && !ending && action === 'event') {
      const { state, sequence, epoch } = input;
      if (!['connected', 'disconnected'].includes(state) || !Number.isSafeInteger(sequence) || sequence < 1
        || !Number.isSafeInteger(epoch) || epoch < 0 || epoch > call.connection.epoch
        || Object.keys(input).some((key) => !['state', 'sequence', 'epoch'].includes(key))) {
        throw new HttpsError('invalid-argument', 'Invalid connection event.');
      }
      if (epoch < call.connection.epoch) return { ...result(callId, call, now), idempotent: true };
      const previous = connection.participants?.[uid];
      if (sequence <= (previous?.sequence || 0)) return { ...result(callId, call, now), idempotent: true };
      if (!['connected', 'reconnecting'].includes(call.status)) throw new HttpsError('failed-precondition', 'Call is not connected.');
      connection.participants = { ...connection.participants, [uid]: { state, sequence, lastSeenAtMs: now } };
      if (state === 'disconnected' && connection.state === 'connected') {
        connection.state = 'reconnecting'; connection.segmentStartedAtMs = null;
        connection.reconnectDeadlineMs = now + A.RECONNECT_GRACE_SECONDS * 1000;
        connection.epoch += 1;
        // Each participant must supply fresh evidence for this recovery epoch.
        connection.participants = Object.fromEntries(call.participantIds.map((id) => [id,
          { ...connection.participants[id], state: 'disconnected' }]));
        call = { ...call, status: 'reconnecting' };
      } else if (connection.state === 'reconnecting'
        && call.participantIds.every((id) => connection.participants[id]?.state === 'connected')) {
        connection.state = 'connected'; connection.segmentStartedAtMs = now;
        connection.reconnectDeadlineMs = null; call = { ...call, status: 'connected' };
      }
      if (connection.state === 'connected') connection.leaseUntilMs = Math.min(
        ...call.participantIds.map((id) => connection.participants[id].lastSeenAtMs)) + A.CONNECTION_LEASE_MS;
    }
    if (connection) call = { ...call, connection };
    const freeUsed = connection ? Math.min(call.freeVideoAllowanceSeconds || 0, Math.floor(connection.freeMs / 1000)) : call.freeVideoConsumedSeconds || 0;
    if (call.billingMode === 'preview' && freeUsed >= (call.freeVideoAllowanceSeconds || 0)) {
      call = { ...call, billingMode: 'awaiting_paid_confirmation', paymentDecisionDeadlineMs: now + D.PAID_DECISION_SECONDS * 1000 };
    }
    if (call.billingMode === 'awaiting_paid_confirmation' && now >= call.paymentDecisionDeadlineMs) {
      ending = true; reason = 'payment_decision_timeout';
    }
    // Read all financial and cleanup records before the first write.
    const consumerRef = db.doc(`users/${call.callerId}`), hostRef = db.doc(`users/${call.receiverId}`);
    const rewardRef = db.doc(`consumerRewards/${call.callerId}`), hostMoneyRef = db.doc(`hostEarnings/${call.receiverId}`);
    const platformRef = db.doc('platformRevenue/creditsEquivalent');
    const locks = call.participantIds.map((id) => db.doc(`activeCallLocks/${id}`));
    const [consumer, host, reward, config, hostMoney, platform, ...lockSnaps] = await Promise.all([
      tx.get(consumerRef), tx.get(hostRef), tx.get(rewardRef), tx.get(db.doc('economyConfig/current')),
      tx.get(hostMoneyRef), tx.get(platformRef), ...locks.map((lock) => tx.get(lock)),
    ]);
    if (action === 'confirm' && !ending) {
      if (uid !== call.callerId || consumer.data()?.role !== 'consumer' || host.data()?.role !== 'host'
        || host.data()?.hostStatus?.isApproved !== true || call.participantIds.length !== 2 || !call.participantIds.includes(call.receiverId))
        throw new HttpsError('permission-denied', 'Only the consumer can confirm paid time.');
      if (call.billingMode === 'paid') return { ...result(callId, call, now), idempotent: true };
      if (call.status !== 'connected' || call.billingMode !== 'awaiting_paid_confirmation')
        throw new HttpsError('failed-precondition', 'Paid continuation is not available.');
      if ((consumer.data()?.wallet?.creditBalance || 0) < D.incrementCredits(call.ratePerMinute))
        throw new HttpsError('resource-exhausted', 'Not enough credits to continue.', { reason: 'insufficient_credits', requiredCredits: D.incrementCredits(call.ratePerMinute), availableCredits: consumer.data()?.wallet?.creditBalance || 0 });
      call = { ...call, billingMode: 'paid', paidStartedAtMs: now, paidStartedAt: FieldValue.serverTimestamp(),
        paymentDecisionDeadlineMs: null, paidSessionStartIncrement: call.settledIncrements || 0 };
    }
    let count = call.settledIncrements || 0, balance = consumer.data()?.wallet?.creditBalance || 0;
    const eligible = connection ? Math.floor(connection.paidMs / 10000) : count;
    // Heartbeats also drain a large backlog, keeping final settlement below
    // Firestore's transaction write limit even after a client billing failure.
    const available = connection && (['settle','reconcile','end'].includes(action) || ending || eligible-count>=90) ? eligible : count;
    const credit = D.incrementCredits(call.ratePerMinute), policy = E.economyPolicy(config.data());
    const ledgers = [];
    // Bounded transaction size. Healthy clients checkpoint frequently. Any
    // untrusted/legacy tail is never used to generate new ledger entries.
    for (let n = count + 1; n <= available && ledgers.length < 100; n++) {
      const ledgerRef = db.doc(`creditTransactions/${D.settlementId(callId, n)}`);
      const existing = await tx.get(ledgerRef);
      if (existing.exists) throw new HttpsError('failed-precondition', 'Settlement counters are inconsistent.');
      if (balance < credit) {
        if (!ending) {
          call.billingMode = 'awaiting_paid_confirmation'; call.paymentDecisionDeadlineMs = now + D.PAID_DECISION_SECONDS * 1000;
          // Unfunded tail is not debt and cannot be replayed on a later consent.
          connection.paidMs = count * 10000;
        }
        reason = 'insufficient_credits'; break;
      }
      const allocation = E.buildInteractionAllocation({ grossCreditsSpent: credit, transactionType: 'video_call_increment',
        consumerUid: call.callerId, hostUid: call.receiverId, sourceId: callId, createdAt: FieldValue.serverTimestamp(),
        idempotencyKey: ledgerRef.id, policy });
      ledgers.push([ledgerRef, { ...allocation, transactionId: ledgerRef.id, consumerId: call.callerId,
        creatorId: call.receiverId, callId, type: 'video_call_increment', credits: credit, grossCredits: credit,
        creatorNetCredits: allocation.hostShareCreditsEquivalent, commissionPolicy: allocation.commissionPolicyVersion,
        billingIncrement: n }]); balance -= credit; count = n;
    }
    const deltaFree = Math.max(0, freeUsed - (call.freeVideoConsumedSeconds || 0));
    if (call.freeVideoSource === 'consumer_rewards' && deltaFree) {
      const seconds = reward.data()?.freeVideoSeconds || 0;
      if (seconds < deltaFree) throw new HttpsError('failed-precondition', 'Free video balance is inconsistent.');
      tx.update(rewardRef, { freeVideoSeconds: seconds - deltaFree, updatedAt: FieldValue.serverTimestamp() });
    }
    if (ledgers.length) {
      tx.update(consumerRef, { 'wallet.creditBalance': balance });
      tx.set(hostMoneyRef, { hostUid: call.receiverId, pendingCreditsEquivalent: (hostMoney.data()?.pendingCreditsEquivalent || 0)
        + ledgers.reduce((sum, [, item]) => sum + item.creatorNetCredits, 0), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(platformRef, { accruedCreditsEquivalent: (platform.data()?.accruedCreditsEquivalent || 0)
        + ledgers.reduce((sum, [, item]) => sum + item.platformFeeCredits, 0), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      ledgers.forEach(([ledgerRef, value]) => tx.create(ledgerRef, value));
    }
    call = { ...call, freeVideoConsumedSeconds: Math.max(freeUsed, call.freeVideoConsumedSeconds || 0),
      settledIncrements: count, billedCredits: (call.billedCredits || 0) + ledgers.length * credit,
      accountedConnectedMs: connection?.connectedMs || 0 };
    if (ending) {
      const duration = connection ? Math.floor(connection.connectedMs / 1000) : Math.max(call.durationSeconds || 0,(call.settledIncrements || 0)*10);
      call = { ...call, status: ['requesting', 'ringing'].includes(original.status) && reason === 'ring_timeout' ? 'missed'
        : duration > 0 ? 'ended' : 'failed', billingMode: 'ended', endedAt: FieldValue.serverTimestamp(), endedAtMs: Number.isFinite(expiry) && now >= expiry ? expiry : now,
        endedBy: uid || 'system', endReason: reason, durationSeconds: duration,
        paidDurationSeconds: connection ? Math.floor(connection.paidMs / 1000) : Math.max(call.paidDurationSeconds || 0,(call.settledIncrements || 0)*10) };
      if (connection) call.connection = { ...connection, state: 'ended', segmentStartedAtMs: null };
      tx.set(db.doc(`callHistory/${callId}`), { callId, participantIds: call.participantIds, callerId: call.callerId,
        receiverId: call.receiverId, createdAt: call.createdAt, connectedAt: call.connectedAt || null,
        endedAt: call.endedAt, durationSeconds: call.durationSeconds, paidDurationSeconds: call.paidDurationSeconds,
        billedCredits: call.billedCredits, ratePerMinute: call.ratePerMinute, status: call.status, endReason: reason });
      lockSnaps.forEach((lock, i) => { if (lock.data()?.callId === callId) tx.delete(locks[i]); });
      const hostIndex = call.participantIds.indexOf(call.receiverId);
      if (host.exists && host.data().hostStatus?.availability === 'busy'
        && (!lockSnaps[hostIndex]?.exists || lockSnaps[hostIndex].data().callId === callId))
        tx.update(hostRef, { 'hostStatus.availability': host.data().hostStatus?.preCallAvailability === 'offline' ? 'offline' : 'online',
          'hostStatus.preCallAvailability': FieldValue.delete() });
    } else if (connection) {
      call.previewEndsAtMs = call.billingMode === 'preview' && connection.state === 'connected'
        ? now + Math.max(0, (call.freeVideoAllowanceSeconds || 0) * 1000 - connection.freeMs) : null;
      call.expiresAtMs = A.deadline(call, now);
    }
    if (!ending && connection) lockSnaps.forEach((lock,i) => {
      if(lock.data()?.callId===callId)tx.update(locks[i],{expiresAtMs:call.expiresAtMs});
    });
    call.lifecycleRevision = (original.lifecycleRevision || 0) + 1;
    tx.update(ref, call);
    return { ...result(callId, call, now), settled: ledgers.length > 0, balance,
      insufficientCredits: reason === 'insufficient_credits' };
  });
  const recoverLock = async (uid) => {
    const lockRef = db.doc(`activeCallLocks/${uid}`), initial = await db.runTransaction((tx) => tx.get(lockRef));
    if (initial.data()?.callId) {
      try { await run(initial.data().callId, null, 'reconcile'); }
      catch (error) { if (error.code !== 'not-found') throw error; }
    }
    await db.runTransaction(async (tx) => {
      const lock = await tx.get(lockRef), userRef = db.doc(`users/${uid}`), user = await tx.get(userRef);
      const current = lock.data()?.callId ? await tx.get(db.doc(`calls/${lock.data().callId}`)) : null;
      if (current?.exists && !D.TERMINAL_STATUSES.has(current.data().status)) return;
      if (lock.exists) tx.delete(lockRef);
      if (user.data()?.hostStatus?.availability === 'busy') tx.update(userRef, {
        'hostStatus.availability': user.data().hostStatus?.preCallAvailability === 'offline' ? 'offline' : 'online',
        'hostStatus.preCallAvailability': FieldValue.delete() });
    });
  };
  return { run, recoverLock };
};
module.exports = { createCallRecovery };
