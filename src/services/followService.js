import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, dbService } from './firebaseService';
import { isApprovedHost } from '../models/userModel';

const requireConsumer = async () => {
  const current = auth.currentUser;
  if (!current?.uid) throw new Error('Sign in required.');
  const profile = await dbService.getUserProfile(current.uid);
  if (profile?.role !== 'consumer') throw new Error('Only consumers can follow hosts.');
  return current.uid;
};
export const followingSnapshotToIds = (snapshot) => snapshot.docs.map((entry) => entry.id);

export const followService = {
  followHost: async (hostId) => {
    const consumerId = await requireConsumer();
    const host = await dbService.getUserProfile(hostId);
    if (!isApprovedHost(host)) throw new Error('Only approved hosts can be followed.');
    await setDoc(doc(db, 'users', consumerId, 'following', hostId), {
      consumerId, hostId, createdAt: serverTimestamp(),
    });
    return true;
  },
  unfollowHost: async (hostId) => {
    const consumerId = await requireConsumer();
    await deleteDoc(doc(db, 'users', consumerId, 'following', hostId));
    return false;
  },
  isFollowing: async (hostId) => {
    const consumerId = auth.currentUser?.uid;
    if (!consumerId) return false;
    return (await getDoc(doc(db, 'users', consumerId, 'following', hostId))).exists();
  },
  getFollowingHostIds: async () => {
    const consumerId = auth.currentUser?.uid;
    if (!consumerId) return [];
    const snapshot = await getDocs(collection(db, 'users', consumerId, 'following'));
    return followingSnapshotToIds(snapshot);
  },
};
