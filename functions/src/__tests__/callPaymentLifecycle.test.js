// Execute the actual exported callable handlers with transactional Firestore
// doubles. No emulator, credentials, network, or dependency changes required.
const mockDocs = new Map();
let mockQueue = Promise.resolve(), mockSequence = 0;
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const ref = (path) => ({ path, id: path.split('/').pop() });
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
    let max = Infinity;
    const query = {
      doc: () => ref(`${path}/generated-${++mockSequence}`),
      where: (key, op, expected) => { filters.push([key, op, expected]); return query; },
      limit: (count) => { max = count; return query; },
      get: async () => ({ docs: [...mockDocs.entries()]
        .filter(([key, value]) => key.startsWith(path + '/') && key.split('/').length === 2
          && filters.every(([field, op, expected]) => op === 'in' ? expected.includes(value[field])
            : op === '<=' ? typeof value[field] === 'number' && value[field] <= expected : value[field] === expected))
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
const start = () => invoke('startVideoCall', 'consumer', { creatorId: 'host' });
const connect = async () => {
  const { callId } = await start();
  await invoke('respondToVideoCall', 'host', { callId, action: 'accept' });
  await invoke('acknowledgeVideoConnected', 'consumer', { callId });
  await invoke('acknowledgeVideoConnected', 'host', { callId });
  return callId;
};
const expirePreview = async (callId) => {
  jest.setSystemTime(callData(callId).previewEndsAtMs);
  return invoke('syncVideoCallPaymentState', 'consumer', { callId });
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
  jest.setSystemTime(connectedAt + 29999);
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
  jest.setSystemTime(callData(callId).previewEndsAtMs);
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
  jest.setSystemTime(Date.now() + 10000);
  await invoke('settleVideoCallIncrement', 'consumer', { callId, credits: 0, duration: 9999 });
  expect(balance()).toBe(95);
  expect(callData(callId)).toMatchObject({ ratePerMinute: 25, billedCredits: 5, settledIncrements: 1 });
  expect(mockDocs.get(`creditTransactions/${callId}_1`)).toMatchObject({ credits: 5, type: 'video_call_increment' });
});

test('concurrent expiry requests are idempotent and do not extend the deadline', async () => {
  const callId = await connect();
  const deadline = callData(callId).paymentDecisionDeadlineMs;
  jest.setSystemTime(callData(callId).previewEndsAtMs);
  await Promise.all(['consumer', 'host', 'consumer'].map((uid) => invoke('syncVideoCallPaymentState', uid, { callId })));
  jest.setSystemTime(Date.now() + 5000);
  await invoke('syncVideoCallPaymentState', 'host', { callId });
  expect(callData(callId)).toMatchObject({ billingMode: 'awaiting_paid_confirmation', paymentDecisionDeadlineMs: deadline });
});

test('repeated consent and synchronization cannot reset paid start or revert paid mode', async () => {
  const callId = await connect(); await expirePreview(callId);
  const first = await invoke('confirmPaidContinuation', 'consumer', { callId });
  jest.setSystemTime(Date.now() + 15000);
  const retry = await invoke('confirmPaidContinuation', 'consumer', { callId });
  await invoke('syncVideoCallPaymentState', 'host', { callId });
  expect(retry).toMatchObject({ idempotent: true, paidStartedAtMs: first.paidStartedAtMs });
  expect(callData(callId).billingMode).toBe('paid');
});

test('expired decision cannot become paid; cleanup commits even though consent fails', async () => {
  const callId = await connect(); await expirePreview(callId);
  jest.setSystemTime(callData(callId).paymentDecisionDeadlineMs);
  await expect(invoke('confirmPaidContinuation', 'consumer', { callId })).rejects.toMatchObject({ code: 'failed-precondition' });
  expect(callData(callId)).toMatchObject({ status: 'ended', endReason: 'payment_decision_timeout', billedCredits: 0 });
  expect(mockDocs.has('activeCallLocks/consumer')).toBe(false);
  expect(mockDocs.has('activeCallLocks/host')).toBe(false);
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('online');
  expect(mockDocs.get(`callHistory/${callId}`)).toMatchObject({ billedCredits: 0, status: 'ended' });
  expect(balance()).toBe(100);
});

test('scheduled reconciliation expires an abandoned preview without client requests', async () => {
  const callId = await connect();
  jest.setSystemTime(callData(callId).previewEndsAtMs);
  await api.reconcileExpiredVideoCalls();
  expect(callData(callId).billingMode).toBe('awaiting_paid_confirmation');
  jest.setSystemTime(callData(callId).paymentDecisionDeadlineMs + 10000);
  await api.reconcileExpiredVideoCalls();
  expect(callData(callId).status).toBe('ended');
  expect(balance()).toBe(100);
});

test('delayed reconciliation ends an untouched preview at its original deadline', async () => {
  const callId = await connect();
  const deadline = callData(callId).paymentDecisionDeadlineMs;
  jest.setSystemTime(deadline + 300000);
  await api.reconcileExpiredVideoCalls();
  expect(callData(callId)).toMatchObject({ status: 'ended', endedAtMs: deadline });
});

test('timeout never deletes another call lock or resets its host busy state', async () => {
  const callId = await connect();
  mockDocs.set('activeCallLocks/host', { callId: 'another-call' });
  jest.setSystemTime(callData(callId).paymentDecisionDeadlineMs);
  await invoke('syncVideoCallPaymentState', 'consumer', { callId });
  expect(mockDocs.get('activeCallLocks/host')).toEqual({ callId: 'another-call' });
  expect(mockDocs.get('users/host').hostStatus.availability).toBe('busy');
});

test('scheduled reconciliation cannot end a paid call after the old decision deadline', async () => {
  const callId = await connect(); const deadline = callData(callId).paymentDecisionDeadlineMs;
  await expirePreview(callId); await invoke('confirmPaidContinuation', 'consumer', { callId });
  jest.setSystemTime(deadline + 1);
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
  else if (outcome === 'missed') { jest.setSystemTime(Date.now() + 31000); await api.reconcileExpiredVideoCalls(); }
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
  const second = await invoke('startVideoCall', 'consumer', { creatorId: 'other-host' });
  await invoke('respondToVideoCall', 'other-host', { callId: second.callId, action: 'accept' });
  await invoke('acknowledgeVideoConnected', 'consumer', { callId: second.callId });
  await invoke('acknowledgeVideoConnected', 'other-host', { callId: second.callId });
  expect(callData(second.callId)).toMatchObject({ previewConsumed: false, billingMode: 'awaiting_paid_confirmation',
    paymentDecisionDeadlineMs: Date.now() + D.PAID_DECISION_SECONDS * 1000 });
  await invoke('endVideoCall', 'consumer', { callId: second.callId });
  jest.setSystemTime(new Date('2026-09-09T00:00:00Z'));
  const third = await connect();
  expect(callData(third).previewConsumed).toBe(true);
  expect(mockDocs.get('users/consumer/entitlements/dailyPreview').dateKey).toBe('2026-09-09');
});

test('non-consumer caller and changed/unapproved host cannot authorize paid interaction', async () => {
  mockDocs.set('users/other-host', clone(mockDocs.get('users/host')));
  await expect(invoke('startVideoCall', 'host', { creatorId: 'other-host' })).rejects.toMatchObject({ code: 'permission-denied' });
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
  jest.setSystemTime(Date.now() + 10000);
  await invoke('settleVideoCallIncrement', 'consumer', { callId });
  mockDocs.get('users/consumer').wallet.creditBalance = 0;
  jest.setSystemTime(Date.now() + 10000);
  expect(await invoke('settleVideoCallIncrement', 'consumer', { callId })).toMatchObject({ insufficientCredits: true });
  expect(callData(callId)).toMatchObject({ billingMode: 'awaiting_paid_confirmation',
    paymentDecisionDeadlineMs: Date.now() + D.PAID_DECISION_SECONDS * 1000 });
  // Test fixture credit; no client wallet-write API is introduced.
  mockDocs.get('users/consumer').wallet.creditBalance = 20;
  await invoke('confirmPaidContinuation', 'consumer', { callId });
  expect(callData(callId).paidSessionStartIncrement).toBe(1);
  jest.setSystemTime(Date.now() + 9999);
  expect(await invoke('settleVideoCallIncrement', 'consumer', { callId })).toMatchObject({ settled: false });
  jest.setSystemTime(Date.now() + 1);
  await invoke('settleVideoCallIncrement', 'consumer', { callId });
  expect(ledger()).toEqual([`creditTransactions/${callId}_1`, `creditTransactions/${callId}_2`]);
  expect(balance()).toBe(15);
});
