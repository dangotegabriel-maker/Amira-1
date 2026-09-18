import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseService';

export const readPendingEarnings = (data) => {
  if (!data) return { pendingCreditsEquivalent: 0 };
  const amount = data.pendingCreditsEquivalent;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('Invalid earnings record.');
  // Do not pass accounting splits or unsupported balances to the presentation.
  return { pendingCreditsEquivalent: amount };
};
export const hostEarningsService = {
  subscribe: (onValue, onError) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    return onSnapshot(doc(db, 'hostEarnings', uid), (snapshot) => {
      try { onValue(readPendingEarnings(snapshot.exists() ? snapshot.data() : null)); }
      catch (error) { onError?.(error); }
    }, onError);
  },
};
