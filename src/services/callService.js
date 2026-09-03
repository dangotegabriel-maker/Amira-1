import {
  addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { auth, db, dbService, getWalletBalance } from './firebaseService';
import { blockService } from './blockService';
import { ACTIVE_CALL_STATUSES, CALL_RING_TIMEOUT_SECONDS } from '../config/callConfig';
import { assertCallTransition, getPreviewEligibility, validateCallEligibility } from './callDomain';
import { DEV_FEATURES } from '../config/devFeatures';
import { quoteIncrement } from './billingService';

const activeCallsFor = async (uid) => {
  const snapshot = await getDocs(query(collection(db, 'calls'), where('participantIds', 'array-contains', uid), limit(20)));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).filter((call) => ACTIVE_CALL_STATUSES.includes(call.status));
};

export const callService = Object.freeze({
  prepare: async ({ creatorId, demoHost }) => {
    const callerId = auth.currentUser?.uid;
    if (!callerId) throw new Error('Sign in required.');
    if (demoHost?.isDemo) {
      if (!DEV_FEATURES.enableCallSimulator) throw new Error('Calling this demo profile is unavailable.');
      validateCallEligibility({ callerId, creator: demoHost, relationship: {}, activeCalls: [] });
      return { callId: `demo-${Date.now()}`, creator: demoHost, simulated: true, previewEligible: true, ratePerMinute: demoHost.hostProfile?.videoRateCredits || 25 };
    }
    const [creator, relationship, callerActiveCalls, creatorActiveCalls, entitlement, caller] = await Promise.all([
      dbService.getUserProfile(creatorId), blockService.getRelationship(creatorId), activeCallsFor(callerId), activeCallsFor(creatorId),
      getDoc(doc(db, 'users', callerId, 'entitlements', 'dailyPreview')), dbService.getUserProfile(callerId),
    ]);
    const activeCalls = [...callerActiveCalls, ...creatorActiveCalls].filter((call,index,all)=>all.findIndex((item)=>item.id===call.id)===index);
    validateCallEligibility({ callerId, creator, relationship, activeCalls });
    const ratePerMinute = creator.hostProfile?.videoRateCredits;
    if (!Number.isInteger(ratePerMinute) || ratePerMinute <= 0) throw new Error('Creator pricing is unavailable.');
    const preview = getPreviewEligibility(entitlement.exists() ? entitlement.data() : null);
    if (!preview.eligible && getWalletBalance(caller) < quoteIncrement(ratePerMinute)) throw new Error('Not enough credits to start paid time.');
    return { callerId, creator, ratePerMinute, previewEligible: preview.eligible, dateKey: preview.dateKey };
  },
  request: async (prepared) => {
    if (prepared.simulated) return { ...prepared, status: 'ringing' };
    const createdAtMs = Date.now();
    const ref = await addDoc(collection(db, 'calls'), {
      callerId: prepared.callerId, receiverId: prepared.creator.uid,
      participantIds: [prepared.callerId, prepared.creator.uid], status: 'requesting',
      createdAt: serverTimestamp(), createdAtMs, expiresAtMs: createdAtMs + CALL_RING_TIMEOUT_SECONDS * 1000,
      acceptedAt: null, connectedAt: null, endedAt: null, durationSeconds: 0,
      billingMode: prepared.previewEligible ? 'free_preview' : 'paid_pending',
      ratePerMinute: prepared.ratePerMinute, previewEligible: prepared.previewEligible,
      previewConsumed: false, billedCredits: 0, endedBy: null, endReason: null,
    });
    return { ...prepared, callId: ref.id, status: 'requesting' };
  },
  transition: async (call, nextStatus, extra = {}) => {
    assertCallTransition(call.status, nextStatus);
    if (call.simulated) return { ...call, ...extra, status: nextStatus };
    await updateDoc(doc(db, 'calls', call.callId || call.id), { status: nextStatus, ...extra });
    return { ...call, ...extra, status: nextStatus };
  },
  subscribe: (callId, listener) => onSnapshot(doc(db, 'calls', callId), (snapshot) => {
    if (snapshot.exists()) listener({ id: snapshot.id, callId: snapshot.id, ...snapshot.data() });
  }),
  subscribeIncoming: (uid, listener) => onSnapshot(query(collection(db, 'calls'), where('receiverId', '==', uid), where('status', 'in', ['requesting', 'ringing']), orderBy('createdAt', 'desc'), limit(1)), (snapshot) => listener(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() })),
});
