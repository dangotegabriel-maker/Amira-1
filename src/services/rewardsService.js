import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from './firebaseService';
// Reuse the existing app/region emulator connection configured by callService.
import './callService';

const functions = getFunctions(app, 'us-central1');
const invoke = async (name) => (await httpsCallable(functions, name)({})).data;
export const rewardsService = {
  getDashboard: () => invoke('getConsumerRewards'),
  claimDailyCheckIn: () => invoke('claimDailyCheckIn'),
  subscribe: (onValue, onError) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    return onSnapshot(doc(db, 'consumerRewards', uid),
      (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null), onError);
  },
};
