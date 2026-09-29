import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AppState } from 'react-native';
import { auth, db } from './firebaseService';
import { isPresenceFresh, PRESENCE_FRESHNESS_MS } from '../utils/socialDomain';
let owner = null;
export const presenceService = {
  freshnessMs: PRESENCE_FRESHNESS_MS, isOnline: isPresenceFresh,
  start: session => {
    owner?.stop();
    const authUser = auth.currentUser;
    if (!authUser || !session?.isCurrent()) return () => {};
    const token = { active: true, subscription: null };
    const current = () => token.active && owner === token && session.isCurrent() && auth.currentUser === authUser;
    const write = state => {
      if (!current()) return;
      // Cleanup never resolves its destination from a replacement account.
      setDoc(doc(db, 'presence', authUser.uid), { uid: authUser.uid, state,
        lastSeenAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    };
    token.stop = () => {
      if (!token.active) return;
      write('offline'); token.active = false; token.subscription?.remove();
      if (owner === token) owner = null;
    };
    owner = token;
    write(AppState.currentState === 'active' ? 'online' : 'offline');
    token.subscription = AppState.addEventListener('change', state => write(state === 'active' ? 'online' : 'offline'));
    return token.stop;
  },
  stop: () => owner?.stop(),
  get: async uid => { const snapshot = await getDoc(doc(db, 'presence', uid)); return snapshot.exists() ? snapshot.data() : null; },
};
