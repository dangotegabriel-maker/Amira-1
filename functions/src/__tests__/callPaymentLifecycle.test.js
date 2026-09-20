// Execute the actual exported callable handlers with transactional Firestore
// doubles. No emulator, credentials, network, or dependency changes required.
const mockDocs = new Map();
let mockQueue = Promise.resolve(), mockSequence = 0;
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const ref = (path) => ({ path, id: path.split('/').pop(), get: async () => snapshot(ref(path)) });
const snapshot = (reference) => ({ ...reference, ref: reference, exists: mockDocs.has(reference.path), data: () => clone(mockDocs.get(reference.path)) });
const apply = (operation, reference, data, options) => {
  if (operation === 'delete') return mockDocs.delete(reference.path);
  if (operation === 'create' && mockDocs.has(reference.path)) throw new Error('already-exists');
  if (operation === 'update' && !mockDocs.has(reference.path)) throw new Error('not-found');
  const value = operation === 'update' || options?.merge ? clone(mockDocs.get(reference.path) || {}) : {};
  for (const [key, entry] of Object.entries(data)) {
    const parts = key.split('.');
    let target = value;
    for (const part of parts.slice(0, -1)) target = target[part] ||= {};
    if (entry?.__delete) delete target[parts.at(-1)];
    else target[parts.at(-1)] = clone(entry);
  }
  mockDocs.set(reference.path, value);
};
const writer = () => {
  const writes = [];
  const transaction = {
    get: async (reference) => {
      if (writes.length) throw new Error('Firestore reads must precede writes');
      return snapshot(reference);
    },
    commit: () => writes.forEach((args) => apply(...args)),
  };
  for (const op of ['set', 'create', 'update', 'delete']) {
    transaction[op] = (...args) => { writes.push([op, ...args]); return transaction; };
  }
  return transaction;
};
const mockDb = {
  doc: ref,
  collection: (path) => {
    const filters = [];
    let max = Infinity, after = '';
    const query = {
      doc: () => ref(`${path}/generated-${++mockSequence}`),
      where: (key, op, expected) => { filters.push([key, op, expected]); return query; },
      orderBy: () => query,
      startAfter: (cursor) => {after=cursor.path;return query;},
      limit: (count) => { max = count; return query; },
      get: async () => ({ docs: [...mockDocs.entries()]
        .filter(([key, value]) => key>after && key.startsWith(path + '/') && key.split('/').length === 2
          && filters.every(([field, op, expected]) => op === 'in' ? expected.includes(field.split('.').reduce((x,k)=>x?.[k],value))
            : op === '<=' ? typeof value[field] === 'number' && value[field] <= expected : field.split('.').reduce((x,k)=>x?.[k],value) === expected))
        .slice(0, max).map(([key]) => snapshot(ref(key))) }),
    };
    return query;
  },
  batch: writer,
  runTransaction: (callback) => {
    const pending = mockQueue.then(async () => {
      const tx = writer();
      const value = await callback(tx);
      tx.commit();
      return value;
    });
    mockQueue = pending.catch(() => {});
    return pending;
  },
};

jest.mock('firebase-admin/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: () => Date.now(), delete: () => ({ __delete: true }) },
  Timestamp: { fromMillis: (value) => value },
}));
jest.mock('firebase-functions/v2/https', () => ({
  onCall: (_options, handler) => handler,
  HttpsError: class extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } },
}));
jest.mock('firebase-functions/v2/scheduler', () => ({ onSchedule: (_options, handler) => handler }));
jest.mock('firebase-functions/params', () => ({ defineSecret: () => ({ value: () => 'server-secret' }), defineString: () => ({ value: () => 'app-id' }) }));
jest.mock('agora-token', () => ({ RtcTokenBuilder: { buildTokenWithUid: jest.fn() }, RtcRole: { PUBLISHER: 1 } }));

const api = require('../index');
const D = require('../callDomain');
const invoke = (name, uid, data) => api[name]({ auth: uid ? { uid } : null, data });
const callData = (callId) => mockDocs.get(`calls/${callId}`);
const balance = () => mockDocs.get('users/consumer').wallet.creditBalance;
const ledger = () => [...mockDocs.keys()].filter((key) => key.startsWith('creditTransactions/'));
const start = async ({modern=false}={}) => { const result=await invoke('startVideoCall', 'consumer', { creatorId: 'host',termsVersion:'automatic-paid-v3' });
  if(!modern){const call=callData(result.callId);call.accountingVersion=2;delete call.economicsSnapshot;}
  return result; };
const connect = async () => {
  const { callId } = await start();
  await invoke('respondToVideoCall', 'host', { callId, action: 'accept' });
  await invoke('acknowledgeVideoConnected', 'consumer', { callId });
  await invoke('acknowledgeVideoConnected', 'host', { callId });
  return callId;
};
const connectModern = async () => {
  const { callId } = await start({modern:true});
  await invoke('respondToVideoCall', 'host', { callId, action: 'accept' });
  await invoke('acknowledgeVideoConnected', 'consumer', { callId });
  await invoke('acknowledgeVideoConnected', 'host', { callId });
  return callId;
};
// Model both live devices renewing their RTC evidence as time advances.
// Tests that exercise crashes intentionally use jest.setSystemTime directly.
const advanceTo = async (value) => {
  const target = value instanceof Date ? value.getTime() : value;
  while(Date.now() < target) {
    jest.setSystemTime(Math.min(target, Date.now()+3000));
    for(const [path, call] of [...mockDocs.entries()]) {
      if(path.startsWith('calls/') && [2,3].includes(call.accountingVersion) && call.connection?.state==='connected') {
        for(const uid of call.participantIds) {
          const current=callData(call.id);
          if(current.connection.state!=='connected')break;
          await invoke('reportVideoCallConnection',uid,{callId:call.id,state:'connected',epoch:current.connection.epoch,
            sequence:(current.connection.participants[uid]?.sequence||0)+1});
        }
      }
    }
  }
};
const expirePreview = async (callId) => {
  await advanceTo(callData(callId).connectedAtMs + callData(callId).freeVideoAllowanceSeconds*1000);
  return invoke('syncVideoCallPaymentState','consumer',{callId});
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-08T12:00:00Z'));
  mockDocs.clear(); mockQueue = Promise.resolve(); mockSequence = 0;
  mockDocs.set('users/consumer', { role: 'consumer', wallet: { creditBalance: 100 } });
  mockDocs.set('users/host', { role: 'host', hostStatus: { isApproved: true, availability: 'online' },
    hostProfile: { videoRateCredits: 25 }, earnings: { pending: 0, available: 0 } });
});
afterEach(() => jest.useRealTimers());

test('connected preview expires authoritatively, then explicit consent starts paid time without charging', async () => {
  const callId = await connect();
  const connectedAt = callData(callId).connectedAtMs;
  expect(callData(callId)).toMatchObject({ billingMode: 'preview', previewConsumed: true,
    previewEndsAtMs: connectedAt + 30000, paymentDecisionDeadlineMs: connectedAt + 30000 + D.PAID_DECISION_SECONDS * 1000 });
  await advanceTo(connectedAt + 29999);
  await invoke('syncVideoCallPaymentState', 'host', { callId });
  expect(callData(callId).billingMode).toBe('preview');
  await expirePreview(callId);
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
  const result = await invoke('confirmPaidContinuation', 'consumer', { callId });
  expect(result).toMatchObject({ billingMode: 'paid', paidStartedAtMs: Date.now(), incrementSeconds: 10, incrementCredits: 5 });
  expect(balance()).toBe(100); expect(ledger()).toEqual([]);
});

test('confirmation itself commits overdue preview expiry before authorizing paid mode', async () => {
  const callId = await connect();
  await advanceTo(callData(callId).connectedAtMs + callData(callId).freeVideoAllowanceSeconds*1000);
  await invoke('confirmPaidContinuation', 'consumer', { callId });
  expect(callData(callId).billingMode).toBe('paid');
});

test.each(['host', 'stranger', null])('%s cannot authorize consumer spending', async (uid) => {
  const callId = await connect(); await expirePreview(callId);
  await expect(invoke('confirmPaidContinuation', uid, { callId })).rejects.toMatchObject({
    code: uid === null ? 'unauthenticated' : 'permission-denied',
  });
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
  expect(balance()).toBe(100);
});

test('consent before preview expiry is rejected', async () => {
  const callId = await connect();
  await expect(invoke('confirmPaidContinuation', 'consumer', { callId })).rejects.toMatchObject({ code: 'failed-precondition' });
  expect(callData(callId).billingMode).toBe('preview');
});

test('insufficient credits produces structured details and no paid or financial writes', async () => {
  const callId = await connect(); await expirePreview(callId);
  mockDocs.get('users/consumer').wallet.creditBalance = 4;
  await expect(invoke('confirmPaidContinuation', 'consumer', { callId, balance: 9999 })).rejects.toMatchObject({
    code: 'resource-exhausted', details: { reason: 'insufficient_credits', requiredCredits: 5, availableCredits: 4 },
  });
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
  expect(balance()).toBe(4); expect(ledger()).toEqual([]);
  expect(mockDocs.get('users/host').earnings.pending).toBe(0);
});

test('continuation and settlement ignore new host/client prices and all client financial values', async () => {
  const callId = await connect(); await expirePreview(callId);
  mockDocs.get('users/host').hostProfile.videoRateCredits = 6000;
  const response = await invoke('confirmPaidContinuation', 'consumer', { callId, ratePerMinute: 1, paidStartedAtMs: 1, hostEarnings: 999 });
  expect(response.incrementCredits).toBe(5);
  await advanceTo(Date.now() + 10000);
  await invoke('settleVideoCallIncrement', 'consumer', { callId, credits: 0, duration: 9999 });
  expect(balance()).toBe(95);
  expect(callData(callId)).toMatchObject({ ratePerMinute: 25, billedCredits: 5, settledIncrements: 1 });
  expect(mockDocs.get(`creditTransactions/${callId}_1`)).toMatchObject({ credits: 5, type: 'video_call_increment' });
});

test('concurrent expiry requests are idempotent and do not extend the deadline', async () => {
  const callId = await connect();
  const deadline = callData(callId).paymentDecisionDeadlineMs;
  await advanceTo(callData(callId).connectedAtMs + callData(callId).freeVideoAllowanceSeconds*1000);
  await Promise.all(['consumer', 'host', 'consumer'].map((uid) => invoke('syncVideoCallPaymentState', uid, { callId })));
  await advanceTo(Date.now() + 5000);
  await invoke('syncVideoCallPaymentState', 'host', { callId });
  expect(callData(callId)).toMatchObject({ billingMode: 'awaiting_paid_confirmation', paymentDecisionDeadlineMs: deadline });
});

test('repeated consent and synchronization cannot reset paid start or revert paid mode', async () => {
  const callId = await connect(); await expirePreview(callId);
  const first = await invoke('confirmPaidContinuation', 'consumer', { callId });
  await advanceTo(Date.now() + 15000);
  const retry = await invoke('confirmPaidContinuation', 'consumer', { callId });
  await invoke('syncVideoCallPaymentState', 'host', { callId });
  expect(retry).toMatchObject({ idempotent: true, paidStartedAtMs: first.paidStartedAtMs });
  expect(callData(callId).billingMode).toBe('paid');
});

test('expired decision cannot become paid; cleanup commits even though consent fails', async () => {
  const callId = await connect(); await expirePreview(callId);
  await advanceTo(callData(callId).paymentDecisionDeadlineMs);
  await expect(invoke('confirmPaidContinuation', 'consumer', { callId })).rejects.toMatchObject({ code: 'failed-precondition' });
  expect(callData(callId)).toMatchObject({ status: 'ended', endReason: 'payment_decision_timeout', billedCredits: 0 });
  expect(mockDocs.has('activeCallLocks/consumer')).toBe(false);
  expect(mockDocs.has('activeCallLocks/host')).toBe(false);
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('online');
  expect(mockDocs.get(`callHistory/${callId}`)).toMatchObject({ billedCredits: 0, status: 'ended' });
  expect(balance()).toBe(100);
});

test('scheduled reconciliation retires an abandoned preview on its connection lease without client requests', async () => {
  const callId=await connect();
  jest.setSystemTime(callData(callId).connection.leaseUntilMs+1);
  await api.reconcileExpiredVideoCalls();
  expect(callData(callId)).toMatchObject({status:'failed',endReason:'connection_lease_expired',durationSeconds:0});
  expect(balance()).toBe(100);
  expect(mockDocs.has('activeCallLocks/consumer')).toBe(false);
});
test('delayed reconciliation does not count its scheduling delay as connected usage', async () => {
  const callId=await connect(), expiry=callData(callId).connection.leaseUntilMs;
  jest.setSystemTime(expiry+300000);
  await api.reconcileExpiredVideoCalls();
  expect(callData(callId)).toMatchObject({status:'failed',endedAtMs:expiry,durationSeconds:0});
});

test('timeout never deletes another call lock or resets its host busy state', async () => {
  const callId = await connect();
  mockDocs.set('activeCallLocks/host', { callId: 'another-call' });
  await advanceTo(callData(callId).paymentDecisionDeadlineMs);
  await invoke('syncVideoCallPaymentState', 'consumer', { callId });
  expect(mockDocs.get('activeCallLocks/host')).toEqual({ callId: 'another-call' });
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('busy');
});

test('scheduled reconciliation cannot end a paid call after the old decision deadline', async () => {
  const callId = await connect(); const deadline = callData(callId).paymentDecisionDeadlineMs;
  await expirePreview(callId); await invoke('confirmPaidContinuation', 'consumer', { callId });
  await advanceTo(deadline + 1);
  await api.reconcileExpiredVideoCalls();
  expect(callData(callId).billingMode).toBe('paid');
  expect(mockDocs.get('activeCallLocks/host').callId).toBe(callId);
});

test('acceptance and a single RTC acknowledgement do not consume preview', async () => {
  const { callId } = await start();
  await invoke('respondToVideoCall', 'host', { callId, action: 'accept' });
  await invoke('acknowledgeVideoConnected', 'consumer', { callId });
  expect(callData(callId).status).toBe('connecting');
  expect(mockDocs.has('users/consumer/entitlements/dailyPreview')).toBe(false);
});

test.each(['rejected', 'missed', 'rtc_failure', 'cancelled'])('%s pre-connect call does not consume preview', async (outcome) => {
  const { callId } = await start();
  if (outcome === 'rejected') await invoke('respondToVideoCall', 'host', { callId, action: 'decline' });
  else if (outcome === 'missed') { await advanceTo(Date.now() + 31000); await api.reconcileExpiredVideoCalls(); }
  else {
    if (outcome === 'rtc_failure') await invoke('respondToVideoCall', 'host', { callId, action: 'accept' });
    await invoke('endVideoCall', 'consumer', { callId, reason: outcome });
  }
  expect(mockDocs.has('users/consumer/entitlements/dailyPreview')).toBe(false);
  expect(balance()).toBe(100);
});

test('preview belongs to consumer UTC day, not host; next UTC day restores eligibility', async () => {
  const first = await connect();
  await invoke('endVideoCall', 'consumer', { callId: first });
  mockDocs.set('users/other-host', clone(mockDocs.get('users/host')));
  const second = await invoke('startVideoCall', 'consumer', { creatorId: 'other-host',termsVersion:'automatic-paid-v3' });
  await invoke('respondToVideoCall', 'other-host', { callId: second.callId, action: 'accept' });
  await invoke('acknowledgeVideoConnected', 'consumer', { callId: second.callId });
  await invoke('acknowledgeVideoConnected', 'other-host', { callId: second.callId });
  expect(callData(second.callId)).toMatchObject({ previewConsumed: false, billingMode: 'awaiting_paid_confirmation',
    paymentDecisionDeadlineMs: Date.now() + D.PAID_DECISION_SECONDS * 1000 });
  await invoke('endVideoCall', 'consumer', { callId: second.callId });
  await advanceTo(new Date('2026-09-09T00:00:00Z'));
  const third = await connect();
  expect(callData(third).previewConsumed).toBe(true);
  expect(mockDocs.get('users/consumer/entitlements/dailyPreview').dateKey).toBe('2026-09-09');
});

test('non-consumer caller and changed/unapproved host cannot authorize paid interaction', async () => {
  mockDocs.set('users/other-host', clone(mockDocs.get('users/host')));
  await expect(invoke('startVideoCall', 'host', { creatorId: 'other-host',termsVersion:'automatic-paid-v3' })).rejects.toMatchObject({ code: 'permission-denied' });
  const callId = await connect(); await expirePreview(callId);
  mockDocs.get('users/host').hostStatus.isApproved = false;
  await expect(invoke('confirmPaidContinuation', 'consumer', { callId })).rejects.toMatchObject({ code: 'permission-denied' });
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
});

test('continuation rejects a mismatched host participant even for the authenticated consumer', async () => {
  const callId = await connect(); await expirePreview(callId);
  callData(callId).participantIds = ['consumer', 'stranger'];
  await expect(invoke('confirmPaidContinuation', 'consumer', { callId })).rejects.toMatchObject({ code: 'permission-denied' });
  expect(balance()).toBe(100);
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
});

test('insufficient-credit pause has a deadline and resumption preserves unique increment IDs', async () => {
  const callId = await connect(); await expirePreview(callId);
  await invoke('confirmPaidContinuation', 'consumer', { callId });
  await advanceTo(Date.now() + 10000);
  await invoke('settleVideoCallIncrement', 'consumer', { callId });
  mockDocs.get('users/consumer').wallet.creditBalance = 0;
  await advanceTo(Date.now() + 10000);
  expect(await invoke('settleVideoCallIncrement', 'consumer', { callId })).toMatchObject({ insufficientCredits: true });
  expect(callData(callId)).toMatchObject({ billingMode: 'awaiting_paid_confirmation',
    paymentDecisionDeadlineMs: Date.now() + D.PAID_DECISION_SECONDS * 1000 });
  // Test fixture credit; no client wallet-write API is introduced.
  mockDocs.get('users/consumer').wallet.creditBalance = 20;
  await invoke('confirmPaidContinuation', 'consumer', { callId });
  expect(callData(callId).paidSessionStartIncrement).toBe(1);
  await advanceTo(Date.now() + 9999);
  expect(await invoke('settleVideoCallIncrement', 'consumer', { callId })).toMatchObject({ settled: false });
  await advanceTo(Date.now() + 1);
  await invoke('settleVideoCallIncrement', 'consumer', { callId });
  expect(ledger()).toEqual([`creditTransactions/${callId}_1`, `creditTransactions/${callId}_2`]);
  expect(balance()).toBe(15);
});

test('consumer Daily Check-In atomically records server-day history and non-monetary reward', async () => {
  const before = clone(mockDocs.get('users/consumer'));
  const result = await invoke('claimDailyCheckIn', 'consumer', { dateKey: '2099-01-01', freeMessages: 9999, balance: 9999 });
  expect(result).toMatchObject({ claimed: true, dateKey: '2026-09-08', reward: { freeMessages: 3 }, balances: { freeMessages: 3, freeVideoSeconds: 0 } });
  expect(mockDocs.get('consumerRewards/consumer/claims/2026-09-08')).toMatchObject({ rewardDay: 1, consumerUid: 'consumer' });
  expect(mockDocs.get('users/consumer')).toEqual(before);
  expect(ledger()).toEqual([]);
});

test('concurrent and repeated same-day check-ins cannot award twice', async () => {
  const results = await Promise.all([1, 2, 3].map(() => invoke('claimDailyCheckIn', 'consumer', {})));
  expect(results.filter((item) => item.claimed)).toHaveLength(1);
  expect(results.filter((item) => item.alreadyClaimed)).toHaveLength(2);
  expect(mockDocs.get('consumerRewards/consumer')).toMatchObject({ freeMessages: 3, checkIn: { totalClaims: 1 } });
});

test.each(['host', null])('%s cannot claim or read a consumer rewards dashboard', async (uid) => {
  for (const name of ['claimDailyCheckIn', 'getConsumerRewards']) {
    await expect(invoke(name, uid, { consumerUid: 'consumer' })).rejects.toMatchObject({ code: uid ? 'permission-denied' : 'unauthenticated' });
  }
  expect(mockDocs.has('consumerRewards/host')).toBe(false);
  expect(mockDocs.has('consumerRewards/consumer')).toBe(false);
});

test('check-in sequence advances through consecutive UTC days and wraps after Day 7', async () => {
  for (let index = 0; index < 8; index++) {
    await advanceTo(new Date(Date.UTC(2026, 8, 8 + index)));
    const result = await invoke('claimDailyCheckIn', 'consumer', {});
    expect(result.checkIn.lastRewardDay).toBe(index % 7 + 1);
  }
  expect(mockDocs.get('consumerRewards/consumer')).toMatchObject({ freeMessages: 14, freeVideoSeconds: 35,
    quickMatchCount: 1, checkIn: { totalClaims: 8 } });
});

test('dashboard does not create balances and claim cannot redirect reward to another user', async () => {
  const empty = await invoke('getConsumerRewards', 'consumer', {});
  expect(empty).toMatchObject({ alreadyClaimed: false, nextDay: 1, balances: { freeMessages: 0 } });
  expect(mockDocs.has('consumerRewards/consumer')).toBe(false);
  await invoke('claimDailyCheckIn', 'consumer', { uid: 'host' });
  expect(mockDocs.has('consumerRewards/host')).toBe(false);
});

test('settlement uses trusted split config, atomically allocates once, and never invents payout money', async () => {
  mockDocs.set('economyConfig/current', { platformCommissionBasisPoints: 4000, version: 'trusted-test' });
  const callId = await connect(); await expirePreview(callId);
  await invoke('confirmPaidContinuation', 'consumer', { callId });
  await advanceTo(Date.now() + 10000);
  await Promise.all(['consumer', 'host', 'consumer'].map((uid) => invoke('settleVideoCallIncrement', uid, {
    callId, platformFeeCredits: 0, hostShareCreditsEquivalent: 999, platformCommissionBasisPoints: 0,
  })));
  expect(ledger()).toHaveLength(1);
  expect(balance()).toBe(95);
  expect(mockDocs.get(`creditTransactions/${callId}_1`)).toMatchObject({ grossCreditsSpent: 5,
    platformFeeCredits: 2, hostShareCreditsEquivalent: 3, consumerUid: 'consumer', hostUid: 'host',
    commissionPolicyVersion: 'trusted-test', transactionType: 'video_call_increment' });
  expect(mockDocs.get('hostEarnings/host').pendingCreditsEquivalent).toBe(3);
  expect(mockDocs.get('platformRevenue/creditsEquivalent').accruedCreditsEquivalent).toBe(2);
  expect(mockDocs.get('users/host').earnings).toEqual({ pending: 0, available: 0 });
});

const enableEarnedVideo = (seconds) => {
  mockDocs.set('economyConfig/current', { enableEarnedVideoSeconds: true, enableLegacyDailyPreview: false });
  mockDocs.set('consumerRewards/consumer', { freeVideoSeconds: seconds, freeMessages: 3 });
};
test('earned video adapter debits only authoritative connected elapsed seconds, idempotently', async () => {
  enableEarnedVideo(15);
  const callId = await connect();
  expect(callData(callId)).toMatchObject({ freeVideoSource: 'consumer_rewards', freeVideoAllowanceSeconds: 15, billingMode: 'preview' });
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(15);
  await advanceTo(Date.now() + 5000);
  await Promise.all(['consumer', 'host'].map((uid) => invoke('syncVideoCallPaymentState', uid, { callId, consumedSeconds: 999 })));
  expect(mockDocs.get('consumerRewards/consumer')).toMatchObject({ freeVideoSeconds: 10, freeMessages: 3 });
  expect(callData(callId).freeVideoConsumedSeconds).toBe(5);
  await advanceTo(Date.now() + 2000);
  await invoke('endVideoCall', 'consumer', { callId });
  await invoke('endVideoCall', 'consumer', { callId });
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(8);
  expect(balance()).toBe(100);
});

test.each(['rejected', 'missed', 'failed'])('earned video adapter consumes nothing for %s before connection', async (outcome) => {
  enableEarnedVideo(15);
  const { callId } = await start();
  if (outcome === 'rejected') await invoke('respondToVideoCall', 'host', { callId, action: 'decline' });
  else if (outcome === 'missed') { await advanceTo(Date.now() + 31000); await api.reconcileExpiredVideoCalls(); }
  else { await invoke('respondToVideoCall', 'host', { callId, action: 'accept' }); await invoke('endVideoCall', 'consumer', { callId, reason: 'rtc_failure' }); }
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(15);
});

test('exhausted earned time preserves explicit paid consent and never silently charges', async () => {
  enableEarnedVideo(10);
  const callId = await connect();
  await expirePreview(callId);
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(0);
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
  expect(balance()).toBe(100); expect(ledger()).toEqual([]);
  await invoke('confirmPaidContinuation', 'consumer', { callId });
  expect(callData(callId).billingMode).toBe('paid');
});

test('default compatibility uses daily preview without spending earned seconds', async () => {
  mockDocs.set('consumerRewards/consumer', { freeVideoSeconds: 15 });
  const callId = await connect(); await expirePreview(callId);
  expect(callData(callId).freeVideoSource).toBe('daily_preview');
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(15);
});

test('check-in earned during a call does not extend its captured allowance', async () => {
  enableEarnedVideo(10);
  mockDocs.get('consumerRewards/consumer').checkIn = { totalClaims: 1, lastClaimDate: '2026-09-07' };
  const callId = await connect();
  await invoke('claimDailyCheckIn', 'consumer', {});
  await expirePreview(callId);
  expect(callData(callId).freeVideoAllowanceSeconds).toBe(10);
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(10);
});


test('new call with exhausted preview and three Credits is rejected before call or lock creation', async () => {
  mockDocs.set('users/consumer/entitlements/dailyPreview', { dateKey: D.utcDateKey(), consumed: true });
  mockDocs.get('users/consumer').wallet.creditBalance = 3;
  await expect(start()).rejects.toMatchObject({ details: { reason: 'insufficient_call_credits', minimumCredits: 4 } });
  expect([...mockDocs.keys()].some((path) => path.startsWith('calls/') || path.startsWith('activeCallLocks/'))).toBe(false);
});
test('new call can start with one increment and charges nothing before connection', async () => {
  mockDocs.set('users/consumer/entitlements/dailyPreview', { dateKey: D.utcDateKey(), consumed: true });
  mockDocs.get('users/consumer').wallet.creditBalance = 5;
  const result = await start();
  expect(result.billingMode).toBe('awaiting_paid_confirmation');
  expect(balance()).toBe(5); expect(ledger()).toHaveLength(0);
});

const connectionEvent = (callId, uid, state = 'connected', overrides = {}) => {
  const call=callData(callId);
  return invoke('reportVideoCallConnection',uid,{callId,state,epoch:call.connection.epoch,
    sequence:(call.connection.participants[uid]?.sequence||0)+1,...overrides});
};
const recoverConnection = async (callId) => {
  await connectionEvent(callId,'consumer'); await connectionEvent(callId,'host');
};
test('shared grace is ten seconds on both backend and client',()=>{
  expect(D.RECONNECT_GRACE_SECONDS).toBe(10);
  expect(require('../../../shared/callRecoveryConfig').RECONNECT_GRACE_SECONDS).toBe(10);
});
test('disconnect freezes earned consumption; both fresh acknowledgements resume the same allowance and call',async()=>{
  enableEarnedVideo(40); const callId=await connect();
  await advanceTo(Date.now()+5000);
  await connectionEvent(callId,'consumer','disconnected');
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(35);
  const saved=clone(callData(callId).connection);
  jest.setSystemTime(Date.now()+8000);
  await invoke('syncVideoCallPaymentState','host',{callId});
  expect(callData(callId).connection.freeMs).toBe(saved.freeMs);
  await connectionEvent(callId,'consumer');
  expect(callData(callId).status).toBe('reconnecting');
  await connectionEvent(callId,'host');
  expect(callData(callId)).toMatchObject({id:callId,status:'connected',freeVideoAllowanceSeconds:40,freeVideoConsumedSeconds:5});
  await advanceTo(Date.now()+3000);
  await invoke('endVideoCall','host',{callId});
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(32);
  expect(callData(callId).durationSeconds).toBe(8);
});
test('failed reconnect settles earned seconds once and does not count the grace or scheduler delay',async()=>{
  enableEarnedVideo(40); const callId=await connect(); await advanceTo(Date.now()+4000);
  await connectionEvent(callId,'host','disconnected');
  jest.setSystemTime(Date.now()+70000);
  await api.reconcileExpiredVideoCalls();
  await invoke('endVideoCall','consumer',{callId});
  expect(callData(callId)).toMatchObject({status:'ended',durationSeconds:4,endReason:'reconnect_timeout'});
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(36);
  expect([...mockDocs.keys()].filter(key=>key.startsWith('callHistory/'))).toHaveLength(1);
});
test('out of order and duplicate disconnect events neither reopen segments nor extend grace',async()=>{
  const callId=await connect(); await advanceTo(Date.now()+5000);
  const event={state:'disconnected',epoch:0,sequence:3};
  await connectionEvent(callId,'consumer','disconnected',event);
  const deadline=callData(callId).connection.reconnectDeadlineMs;
  jest.setSystemTime(Date.now()+1000);
  await connectionEvent(callId,'consumer','disconnected',event);
  await connectionEvent(callId,'consumer','connected',{epoch:0,sequence:99});
  expect(callData(callId).connection.reconnectDeadlineMs).toBe(deadline);
  expect(callData(callId).status).toBe('reconnecting');
  await recoverConnection(callId);
  expect(callData(callId).connection.freeMs).toBe(5000);
});
const paidConnection = async()=>{
  const callId=await connect(); await expirePreview(callId);
  await invoke('confirmPaidContinuation','consumer',{callId});return callId;
};
test('paid partial seconds continue across reconnect without billing the disconnected interval',async()=>{
  const callId=await paidConnection();await advanceTo(Date.now()+7000);
  await connectionEvent(callId,'consumer','disconnected');
  jest.setSystemTime(Date.now()+8000);
  await invoke('settleVideoCallIncrement','host',{callId});
  expect(balance()).toBe(100);expect(callData(callId).connection.paidMs).toBe(7000);
  await recoverConnection(callId);await advanceTo(Date.now()+3000);
  await Promise.all(['consumer','host','consumer'].map(uid=>invoke('settleVideoCallIncrement',uid,{callId})));
  expect(balance()).toBe(95);expect(ledger()).toHaveLength(1);
  await connectionEvent(callId,'host','disconnected');jest.setSystemTime(Date.now()+5000);
  await Promise.all(['consumer','host'].map(uid=>invoke('endVideoCall',uid,{callId})));
  expect(balance()).toBe(95);expect(callData(callId).paidDurationSeconds).toBe(10);
});
test('end settles outstanding full connected increments once even when clients skipped settlement',async()=>{
  const callId=await paidConnection();await advanceTo(Date.now()+22000);
  await Promise.all(['consumer','host','consumer'].map(uid=>invoke('endVideoCall',uid,{callId})));
  await api.reconcileExpiredVideoCalls();
  expect(balance()).toBe(90);expect(ledger()).toHaveLength(2);
  expect(callData(callId).paidDurationSeconds).toBe(22);
});
test('reconcile/end race preserves legitimate paid usage and one history entry',async()=>{
  const callId=await paidConnection();await advanceTo(Date.now()+12000);
  await connectionEvent(callId,'host','disconnected');jest.setSystemTime(Date.now()+10001);
  await Promise.all([api.reconcileExpiredVideoCalls(),invoke('endVideoCall','consumer',{callId})]);
  expect(balance()).toBe(95);expect(ledger()).toHaveLength(1);
  expect(callData(callId).paidDurationSeconds).toBe(12);
  await expect(connectionEvent(callId,'host')).resolves.toMatchObject({idempotent:true,status:'ended'});
});
test.each(['consumer','host'])('%s crash stops an abandoned paid call without undoing settled increments',async(uid)=>{
  const callId=await paidConnection();await advanceTo(Date.now()+10000);
  await invoke('settleVideoCallIncrement','consumer',{callId});
  // Only the surviving participant sends further evidence.
  for(let i=0;i<3;i++){jest.setSystemTime(Date.now()+3000);await connectionEvent(callId,uid==='consumer'?'host':'consumer');}
  jest.setSystemTime(Date.now()+10000);await api.reconcileExpiredVideoCalls();
  expect(callData(callId).status).toBe('ended');expect(balance()).toBe(95);
  expect(mockDocs.has('activeCallLocks/consumer')).toBe(false);
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('online');
  await expect(start()).resolves.toHaveProperty('callId');
});
test('connecting abandonment releases both locks and busy state without consuming earned time',async()=>{
  enableEarnedVideo(40);const {callId}=await start();await invoke('respondToVideoCall','host',{callId,action:'accept'});
  await invoke('acknowledgeVideoConnected','consumer',{callId});
  jest.setSystemTime(callData(callId).connectingDeadlineMs+1);await api.reconcileExpiredVideoCalls();
  expect(callData(callId)).toMatchObject({status:'failed',durationSeconds:0,endReason:'connecting_timeout'});
  expect(mockDocs.get('consumerRewards/consumer').freeVideoSeconds).toBe(40);
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('online');
  await expect(start()).resolves.toHaveProperty('callId');
});
test('lock expiry alone cannot evict a healthy active call',async()=>{
  const callId=await connect();mockDocs.get('activeCallLocks/host').expiresAtMs=0;
  // Busy availability rejects entry before the lock-conflict check.
  await expect(start()).rejects.toMatchObject({code:'failed-precondition'});
  expect(mockDocs.get('activeCallLocks/host').callId).toBe(callId);
});
test('start safely retires stale calls and recovers orphan locks without waiting for scheduler',async()=>{
  const callId=await connect();jest.setSystemTime(callData(callId).connection.leaseUntilMs+1);
  const next=await start();expect(next.callId).not.toBe(callId);
  expect(callData(callId).status).toBe('failed');
  expect(mockDocs.get('activeCallLocks/host').callId).toBe(next.callId);
});
test('orphan lock without expiry and orphan busy host recover safely',async()=>{
  mockDocs.set('activeCallLocks/host',{callId:'missing'});
  mockDocs.get('users/host').hostStatus.availability='busy';
  await api.reconcileExpiredVideoCalls();
  expect(mockDocs.has('activeCallLocks/host')).toBe(false);
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('online');
  await expect(start()).resolves.toHaveProperty('callId');
});
test('reconciliation preserves a replacement lock and its busy state',async()=>{
  const callId=await connect();await advanceTo(Date.now()+5000);await connectionEvent(callId,'host','disconnected');
  const other=clone(callData(callId));other.id='replacement';other.status='connected';other.connection.state='connected';other.connection.leaseUntilMs=Date.now()+600000;
  mockDocs.set('calls/replacement',other);mockDocs.set('activeCallLocks/host',{callId:'replacement'});
  jest.setSystemTime(Date.now()+11000);await api.reconcileExpiredVideoCalls();
  expect(mockDocs.get('activeCallLocks/host').callId).toBe('replacement');
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('busy');
});
test.each([null,'stranger'])('%s cannot report connection lifecycle',async(uid)=>{
  const callId=await connect();await expect(connectionEvent(callId,uid)).rejects.toMatchObject({code:uid?'permission-denied':'unauthenticated'});
});
test('participant cannot submit timing, usage, or arbitrary connection epoch',async()=>{
  const callId=await connect(),before=clone(callData(callId));
  for(const data of [{durationSeconds:999},{connectedMs:999},{epoch:999},{sequence:-1}])
    await expect(connectionEvent(callId,'consumer','connected',data)).rejects.toMatchObject({code:'invalid-argument'});
  expect(callData(callId)).toEqual(before);
});


test('new calls snapshot a trusted changed host rate',async()=>{
  mockDocs.get('users/host').hostProfile.videoRateCredits=50;
  const callId=await connect();expect(callData(callId).ratePerMinute).toBe(50);
  mockDocs.get('users/host').hostProfile.videoRateCredits=100;
  expect(callData(callId).ratePerMinute).toBe(50);
});


test('old submitted applicant can call as Consumer without changing connected accounting',async()=>{
 mockDocs.get('users/consumer').role='host';mockDocs.get('users/consumer').hostStatus={isApproved:false,hasApplied:true,verificationStatus:'submitted',availability:'offline'};
 const callId=await connect();expect(callData(callId).accountingVersion).toBe(2);expect(callData(callId).connection.state).toBe('connected');
 await expirePreview(callId);await expect(invoke('confirmPaidContinuation','consumer',{callId})).resolves.toMatchObject({billingMode:'paid'});
});

describe('accounting version 3 automatic paid continuation',()=>{
 test('snapshots disclosed terms before connection and automatically commits the first increment at free exhaustion',async()=>{
  const {callId}=await start({modern:true}),before=callData(callId);
  expect(before).toMatchObject({accountingVersion:3,economicsSnapshot:{baseRatePerMinute:25,consumerRatePerMinute:25,
   billingIncrementSeconds:10,automaticPaidContinuation:true,disclosureAccepted:true,freeVideoSeconds:30}});
  expect(balance()).toBe(100);expect(ledger()).toHaveLength(0);
  await invoke('respondToVideoCall','host',{callId,action:'accept'});
  await invoke('acknowledgeVideoConnected','consumer',{callId});await invoke('acknowledgeVideoConnected','host',{callId});
  await advanceTo(callData(callId).connectedAtMs+30000);
  expect(callData(callId)).toMatchObject({billingMode:'paid',settledIncrements:1,billedCredits:4});
  expect(balance()).toBe(96);expect(ledger()).toHaveLength(1);
 });
 test('six distributed increments reconcile exactly to an awkward per-minute rate',async()=>{
  const callId=await connectModern();await advanceTo(callData(callId).connectedAtMs+30000);await advanceTo(Date.now()+50000);
  await invoke('settleVideoCallIncrement','consumer',{callId});
  expect(callData(callId)).toMatchObject({settledIncrements:6,billedCredits:25});expect(balance()).toBe(75);
  expect([...mockDocs.values()].filter(x=>x?.type==='video_call_increment'&&x.callId===callId).map(x=>x.credits)).toEqual([4,4,4,4,4,5]);
 });
 test('four paid seconds still has exactly the entry increment and reconnect does not duplicate it',async()=>{
  const callId=await connectModern();await advanceTo(callData(callId).connectedAtMs+30000);await advanceTo(Date.now()+4000);
  await connectionEvent(callId,'consumer','disconnected');jest.setSystemTime(Date.now()+5000);await recoverConnection(callId);
  await invoke('settleVideoCallIncrement','host',{callId});expect(callData(callId).settledIncrements).toBe(1);expect(balance()).toBe(96);
 });
 test('insufficient first increment ends cleanly without debt or ledger',async()=>{
  mockDocs.get('users/consumer').wallet.creditBalance=3;const callId=await connectModern();await advanceTo(callData(callId).connectedAtMs+30000);
  expect(callData(callId)).toMatchObject({status:'ended',endReason:'insufficient_credits',billedCredits:0});expect(balance()).toBe(3);expect(ledger()).toHaveLength(0);
 });
 test('rate and VIP policy are snapshotted while Host basis remains protected',async()=>{
  mockDocs.set('vipMemberships/consumer',{status:'active',startsAt:Date.now()-1000,expiresAt:Date.now()+86400000});
  mockDocs.set('vipConfig/current',{callDiscount:{enabled:true,version:'test-call-v1',consumerDiscountBasisPoints:2000}});
  const callId=await connectModern();mockDocs.get('users/host').hostProfile.videoRateCredits=6000;
  await advanceTo(callData(callId).connectedAtMs+30000);await advanceTo(Date.now()+50000);await invoke('settleVideoCallIncrement','consumer',{callId});
  expect(callData(callId).economicsSnapshot).toMatchObject({baseRatePerMinute:25,consumerRatePerMinute:20,hostEarningBasisPerMinute:25,vipPolicyVersion:'test-call-v1'});
  expect(callData(callId)).toMatchObject({settledIncrements:6,billedCredits:20});expect(balance()).toBe(80);
  expect(mockDocs.get('hostEarnings/host').pendingCreditsEquivalent).toBe(20);
 });
 test('generic call debit updates P/B/L/U without changing Level provenance',async()=>{
  mockDocs.set('creditWallets/consumer',{ownerUid:'consumer',purchasedCredits:60,bonusCredits:40,legacyCredits:0,unallocatedSpentCredits:0,totalBalance:100,accountingVersion:1});
  mockDocs.get('users/consumer').level=7;mockDocs.get('users/consumer').lifetimeQualifyingPurchasedCredits=900;
  const callId=await connectModern();await advanceTo(callData(callId).connectedAtMs+30000);
  expect(mockDocs.get('creditWallets/consumer')).toMatchObject({purchasedCredits:60,bonusCredits:40,unallocatedSpentCredits:4,totalBalance:96});
  expect(mockDocs.get('users/consumer')).toMatchObject({level:7,lifetimeQualifyingPurchasedCredits:900});
 });
});


test('Level callables require authentication and cannot use wallet progress or caller-selected recipient',async()=>{
 await expect(invoke('getMyAmiraLevel',null,{})).rejects.toMatchObject({code:'unauthenticated'});
 await expect(invoke('getMyAmiraLevel','host',{})).rejects.toMatchObject({code:'permission-denied'});
 mockDocs.get('users/consumer').wallet.creditBalance=99999;
 await expect(invoke('getMyAmiraLevel','consumer',{level:10})).resolves.toMatchObject({level:0,milestones:[]});
 await expect(invoke('claimAmiraLevelMilestone','consumer',{level:1,uid:'host'})).rejects.toMatchObject({code:'invalid-argument'});
});

test('Activity callables bind ownership/authentication and reject forged profile-view identity/context/clock',async()=>{await expect(invoke('getHostActivity',null,{tab:'All'})).rejects.toMatchObject({code:'unauthenticated'});await expect(invoke('getHostActivity','consumer',{tab:'All'})).rejects.toMatchObject({code:'permission-denied'});await expect(invoke('getHostActivity','host',{tab:'All',hostUid:'other'})).rejects.toMatchObject({code:'invalid-argument'});for(const data of [{ownerUid:'host',context:'card'},{ownerUid:'host',context:'full_profile',viewerUid:'other'},{ownerUid:'host',context:'full_profile',nowMs:0}])await expect(invoke('trackProfileView','consumer',data)).rejects.toMatchObject({code:'invalid-argument'});await expect(invoke('listProfileViews','consumer',{ownerUid:'host'})).rejects.toMatchObject({code:'invalid-argument'});});

test('Connect callables require auth, approved ownership and cannot forge Busy or overwrite a lock',async()=>{for(const name of ['getHostAvailability','getHostConnectConsumers','getHostConnectToday']){await expect(invoke(name,null,{})).rejects.toMatchObject({code:'unauthenticated'});await expect(invoke(name,'consumer',{})).rejects.toMatchObject({code:'permission-denied'});await expect(invoke(name,'host',{ownerUid:'other'})).rejects.toMatchObject({code:'invalid-argument'});}await expect(invoke('setHostAvailability','host',{availability:'busy'})).rejects.toMatchObject({code:'invalid-argument'});await expect(invoke('setHostAvailability','host',{availability:'offline'})).resolves.toMatchObject({availability:'offline'});mockDocs.set('activeCallLocks/host',{callId:'genuine'});await expect(invoke('setHostAvailability','host',{availability:'online'})).rejects.toMatchObject({code:'failed-precondition'});expect(mockDocs.get('activeCallLocks/host')).toEqual({callId:'genuine'});});

test('identity callable requires authentication and rejects every client allocation parameter',async()=>{await expect(invoke('ensureAmiraId',null,{})).rejects.toMatchObject({code:'unauthenticated'});for(const data of [{uid:'other'},{amiraId:'AMR-123456'},{seed:1},{role:'host'},{createdAt:1},null,[]])await expect(invoke('ensureAmiraId','consumer',data)).rejects.toMatchObject({code:'invalid-argument'});});
