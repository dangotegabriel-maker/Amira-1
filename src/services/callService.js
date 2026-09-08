import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { app, auth, db } from './firebaseService';
import { DEV_FEATURES } from '../config/devFeatures';
import { validateCallEligibility } from './callDomain';

const functions = getFunctions(app, 'us-central1');

if (
  __DEV__ &&
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
) {
  const emulatorHost =
    process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '10.37.182.53';

  connectFunctionsEmulator(functions, emulatorHost, 5001);

  console.log(`DEV: Functions emulator connected at ${emulatorHost}:5001`);
}
const invoke = async (name, data) => {
  try { return (await httpsCallable(functions, name)(data)).data; }
  catch (error) {
    if (__DEV__) console.warn(`CALL FUNCTION ${name}:`, error?.code, error?.message);
    const known = String(error?.message || '').replace(/^FirebaseError:\s*/,'');
    const failure = new Error(known || 'Video calling is temporarily unavailable.');
    failure.code = error?.code;
    failure.details = error?.details;
    throw failure;
  }
};

export const callService = Object.freeze({
  prepare: async ({ creatorId, demoHost }) => {
    const callerId=auth.currentUser?.uid;
    if(!callerId)throw new Error('Sign in required.');
    if(demoHost?.isDemo){if(!DEV_FEATURES.enableCallSimulator)throw new Error('Calling this demo profile is unavailable.');validateCallEligibility({callerId,creator:demoHost,relationship:{},activeCalls:[]});return {callId:`demo-${Date.now()}`,creator:demoHost,simulated:true,previewEligible:true,ratePerMinute:demoHost.hostProfile?.videoRateCredits||25,status:'ringing',billingMode:'preview'};}
    return {creatorId};
  },
  request: async (prepared) => prepared.simulated ? prepared : invoke('startVideoCall',{creatorId:prepared.creatorId}),
  respond: async ({callId,action}) => invoke('respondToVideoCall',{callId,action}),
  getRtcCredentials: async (callId) => invoke('getVideoCallRtcCredentials',{callId}),
  acknowledgeConnected: async (callId) => invoke('acknowledgeVideoConnected',{callId}),
  syncPaymentState: async (callId) => invoke('syncVideoCallPaymentState',{callId}),
  confirmPaid: async (callId) => invoke('confirmPaidContinuation',{callId}),
  settleIncrement: async (callId) => invoke('settleVideoCallIncrement',{callId}),
  end: async (callId,reason) => invoke('endVideoCall',{callId,reason}),
  subscribe: (callId,listener) => onSnapshot(doc(db,'calls',callId),(snapshot)=>{if(snapshot.exists())listener({id:snapshot.id,callId:snapshot.id,...snapshot.data()});}),
  subscribeIncoming: (uid, listener) =>
  onSnapshot(
    query(
      collection(db, 'calls'),
      where('participantIds', 'array-contains', uid),
      where('receiverId', '==', uid),
      where('status', '==', 'ringing'),
      orderBy('createdAt', 'desc'),
      limit(1),
    ),
    (snapshot) =>
      listener(
        snapshot.empty
          ? null
          : {
              id: snapshot.docs[0].id,
              callId: snapshot.docs[0].id,
              ...snapshot.docs[0].data(),
            },
      ),
  ),
});
