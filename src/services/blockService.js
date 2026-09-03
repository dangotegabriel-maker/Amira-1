import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseService';
import { isMessagingBlocked } from '../utils/socialDomain';
const refFor = (ownerUid, blockedUid) => doc(db, 'users', ownerUid, 'blocked', blockedUid);
export const blockService = {
  getRelationship: async (otherUid) => { const uid=auth.currentUser?.uid;if(!uid||!otherUid)return {blockedByMe:false,blockedMe:false,blocked:false};const [mine,theirs]=await Promise.all([getDoc(refFor(uid,otherUid)),getDoc(refFor(otherUid,uid))]);const result={blockedByMe:mine.exists(),blockedMe:theirs.exists()};return {...result,blocked:isMessagingBlocked(result)}; },
  getBlockedIds: async () => { const uid=auth.currentUser?.uid;if(!uid)return[];const snapshot=await getDocs(collection(db,'users',uid,'blocked'));return snapshot.docs.map((entry)=>entry.id); },
  block: async (blockedUid) => { const uid=auth.currentUser?.uid;if(!uid||!blockedUid||uid===blockedUid)throw new Error('This user cannot be blocked.');await setDoc(refFor(uid,blockedUid),{blockedUid,createdAt:serverTimestamp()}); },
  unblock: async (blockedUid) => { const uid=auth.currentUser?.uid;if(!uid)throw new Error('Sign in required.');await deleteDoc(refFor(uid,blockedUid)); },
};
