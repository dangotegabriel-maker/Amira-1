import { collection, collectionGroup, query, where, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from './firebaseService';
import { isMessagingBlocked } from '../utils/socialDomain';
const refFor = (ownerUid, blockedUid) => doc(db, 'users', ownerUid, 'blocked', blockedUid);
export const blockService = {
  getRelationship: async (otherUid) => { const uid=auth.currentUser?.uid;if(!uid||!otherUid)return {blockedByMe:false,blockedMe:false,blocked:false};const [mine,theirs]=await Promise.all([getDoc(refFor(uid,otherUid)),getDoc(refFor(otherUid,uid))]);const result={blockedByMe:mine.exists(),blockedMe:theirs.exists()};return {...result,blocked:isMessagingBlocked(result)}; },
  getBlockedIds: async () => { const uid=auth.currentUser?.uid;if(!uid)return[];const [mine,theirs]=await Promise.all([getDocs(collection(db,'users',uid,'blocked')),getDocs(query(collectionGroup(db,'blocked'),where('blockedUid','==',uid)))]);return [...new Set([...mine.docs.map(entry=>entry.id),...theirs.docs.map(entry=>entry.ref.parent.parent.id)])]; },
  block: async (blockedUid) => { const uid=auth.currentUser?.uid;if(!uid||!blockedUid||uid===blockedUid)throw new Error('This user cannot be blocked.');return require('./socialBackend').invokeSocial('blockAndRemoveSocial',{targetUid:blockedUid}); },
  unblock: async (blockedUid) => { const uid=auth.currentUser?.uid;if(!uid)throw new Error('Sign in required.');await deleteDoc(refFor(uid,blockedUid)); },
};
