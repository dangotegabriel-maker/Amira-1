import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db, dbService } from './firebaseService';
import { isApprovedHost } from '../models/userModel';

export const canFollowProfile = (source, target) => Boolean(
  source && target && source.uid !== target.uid && (
    (source.role === 'consumer' && isApprovedHost(target)) ||
    (isApprovedHost(source) && target.role === 'consumer')
  )
);

const requireSource = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  const profile = await dbService.getUserProfile(uid);
  if (profile?.role !== 'consumer' && !isApprovedHost(profile)) {
    throw new Error('Only consumers and approved hosts can follow people.');
  }
  return { ...profile, uid };
};

export const followingSnapshotToIds = (snapshot) => snapshot.docs.map((entry) => entry.id);

const follow = async (targetId) => {
  const source = await requireSource();
  const target = await dbService.getUserProfile(targetId);
  if (!canFollowProfile(source, target)) throw new Error('This follow relationship is not supported.');
  const reference = doc(db, 'users', source.uid, 'following', targetId);
  // A transaction makes repeated follows idempotent without resetting createdAt.
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(reference)).exists()) return;
    transaction.set(reference, source.role === 'consumer' ? {
      consumerId: source.uid, hostId: targetId, createdAt: serverTimestamp(),
    } : {
      sourceId: source.uid, targetId, sourceRole: 'host', targetRole: 'consumer', createdAt: serverTimestamp(),
    });
  });
  return true;
};

const unfollow = async (targetId) => {
  const source = await requireSource();
  // Allow removal even when the target's role or approval has since changed.
  await deleteDoc(doc(db, 'users', source.uid, 'following', targetId));
  return false;
};

export const followService = {
  follow,
  unfollow,
  followHost: follow,
  unfollowHost: unfollow,
  isFollowing: async (targetId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    return (await getDoc(doc(db, 'users', uid, 'following', targetId))).exists();
  },
  getFollowingHostIds: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    return followingSnapshotToIds(await getDocs(collection(db, 'users', uid, 'following')));
  },
  getFollowingConsumerIds: async () => {
    const source = await requireSource();
    if (!isApprovedHost(source)) throw new Error('Approved host required.');
    const snapshot = await getDocs(query(collection(db, 'users', source.uid, 'following'), where('targetRole', '==', 'consumer')));
    return followingSnapshotToIds(snapshot);
  },
  subscribeFollowerCount: (hostId, onCount, onError) => onSnapshot(
    query(collectionGroup(db, 'following'), where('hostId', '==', hostId)),
    (snapshot) => onCount(snapshot.size),
    onError,
  ),
};
