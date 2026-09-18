import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db, dbService } from './firebaseService';
import { isApprovedHost, isConsumer } from '../models/userModel';

export const canFollowProfile = (source, target) => Boolean(
  source && target && source.uid !== target.uid && (
    (isConsumer(source) && isApprovedHost(target)) ||
    (isApprovedHost(source) && isConsumer(target))
  )
);

const requireSource = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required.');
  const profile = await dbService.getUserProfile(uid);
  if (!isConsumer(profile) && !isApprovedHost(profile)) {
    throw new Error('Only consumers and approved hosts can follow people.');
  }
  return { ...profile, uid };
};

export const followingSnapshotToIds = (snapshot) => snapshot.docs.map((entry) => entry.id);
export const resolveFollowLabel = ({ following, followedBy, blocked = false, valid = true }) =>
  blocked || !valid ? 'Follow' : following && followedBy ? 'Friends' : following ? 'Following' : 'Follow';

const follow = async (targetId) => {
  const source = await requireSource();
  const target = await dbService.getUserProfile(targetId);
  if (!canFollowProfile(source, target)) throw new Error('This follow relationship is not supported.');
  const reference = doc(db, 'users', source.uid, 'following', targetId);
  // A transaction makes repeated follows idempotent without resetting createdAt.
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(reference)).exists()) return;
    transaction.set(reference, isConsumer(source) ? {
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
  subscribeRelationship: (targetId, onValue, onError) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !targetId || uid === targetId) return () => {};
    const state = {}, ready = new Set();
    let active = true, synced = false;
    const paths = {
      source: ['users', uid], target: ['users', targetId],
      following: ['users', uid, 'following', targetId], followedBy: ['users', targetId, 'following', uid],
      blockedByMe: ['users', uid, 'blocked', targetId], blockedMe: ['users', targetId, 'blocked', uid],
    };
    const stops = Object.entries(paths).map(([key, path]) => onSnapshot(doc(db, ...path), { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata?.hasPendingWrites) return;
      state[key] = key === 'source' || key === 'target' ? { ...snapshot.data(), uid: key === 'source' ? uid : targetId } : snapshot.exists();
      ready.add(key);
      if (!active || ready.size !== 6) return;
      const value = { following: state.following, followedBy: state.followedBy,
        blocked: state.blockedByMe || state.blockedMe, blockedByMe: state.blockedByMe, blockedMe: state.blockedMe,
        valid: canFollowProfile(state.source, state.target) };
      value.label = resolveFollowLabel(value);
      onValue(value);
      if (value.label === 'Friends' && !synced) {
        synced = true;
        Promise.resolve().then(() => require('./socialBackend').invokeSocial('syncFriendship', { targetUid: targetId }))
          .catch((error) => { synced = false; if (active) onError?.(error); });
      }
    }, onError));
    return () => { active = false; stops.forEach((stop) => stop()); };
  },
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
