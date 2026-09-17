import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseService';
import { invokeSocial } from './socialBackend';
export const callReviewService = {
  status: (callId) => invokeSocial('getCallReviewStatus', { callId }),
  submit: (callId, rating) => invokeSocial('submitCallReview', { callId, rating }),
  subscribeReputation: (hostUid, callback, onError) => onSnapshot(doc(db, 'hostReputation', hostUid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null), onError),
};
