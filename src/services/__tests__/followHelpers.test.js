import { canFollowProfile, followingSnapshotToIds, followService } from '../followService';
import { auth, dbService } from '../firebaseService';
import { deleteDoc, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), collectionGroup: jest.fn(), deleteDoc: jest.fn(),
  doc: jest.fn(), getDoc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(),
  query: jest.fn(), runTransaction: jest.fn(), serverTimestamp: jest.fn(), where: jest.fn(),
}));
jest.mock('../firebaseService', () => ({ auth: { currentUser: null }, db: {}, dbService: { getUserProfile: jest.fn() } }));

const consumer = { uid: 'consumer-a', role: 'consumer' };
const host = { uid: 'host-a', role: 'host', hostStatus: { isApproved: true } };
const pending = { uid: 'pending', role: 'host', hostStatus: { isApproved: false } };

beforeEach(() => { jest.resetAllMocks(); auth.currentUser = null; });

test('following snapshots transform into stable IDs', () => {
  expect(followingSnapshotToIds({ docs: [{ id: 'host-a' }, { id: 'host-b' }] })).toEqual(['host-a', 'host-b']);
});

test.each([
  [consumer, host, true], [host, consumer, true],
  [consumer, { ...consumer, uid: 'consumer-b' }, false],
  [host, { ...host, uid: 'host-b' }, false],
  [pending, consumer, false], [consumer, pending, false],
  [host, { ...consumer, uid: host.uid }, false], [null, host, false],
])('validates the permitted source/target role pair %#', (source, target, expected) => {
  expect(canFollowProfile(source, target)).toBe(expected);
});

const prepareFollow = (source, target, exists = false) => {
  auth.currentUser = { uid: source.uid };
  dbService.getUserProfile.mockImplementation(async (uid) => uid === source.uid ? source : target);
  doc.mockReturnValue('follow-reference');
  serverTimestamp.mockReturnValue('server-time');
  const transaction = { get: jest.fn().mockResolvedValue({ exists: () => exists }), set: jest.fn() };
  runTransaction.mockImplementation(async (_db, callback) => callback(transaction));
  return transaction;
};

test('host follows a consumer in the existing owned subcollection', async () => {
  const transaction = prepareFollow(host, consumer);
  await expect(followService.follow(consumer.uid)).resolves.toBe(true);
  expect(doc).toHaveBeenCalledWith({}, 'users', host.uid, 'following', consumer.uid);
  expect(transaction.set).toHaveBeenCalledWith('follow-reference', {
    sourceId: host.uid, targetId: consumer.uid, sourceRole: 'host', targetRole: 'consumer', createdAt: 'server-time',
  });
});

test('consumer follow keeps the existing hostId schema for old clients and counts', async () => {
  const transaction = prepareFollow(consumer, host);
  await followService.followHost(host.uid);
  expect(transaction.set).toHaveBeenCalledWith('follow-reference', {
    consumerId: consumer.uid, hostId: host.uid, createdAt: 'server-time',
  });
});

test('repeated following does not overwrite the record or timestamp', async () => {
  const transaction = prepareFollow(host, consumer, true);
  await followService.follow(consumer.uid);
  expect(transaction.set).not.toHaveBeenCalled();
});

test('unsupported role pair cannot write', async () => {
  prepareFollow(host, { ...host, uid: 'host-b' });
  await expect(followService.follow('host-b')).rejects.toThrow('not supported');
  expect(runTransaction).not.toHaveBeenCalled();
});

test('unauthenticated follow cannot write', async () => {
  await expect(followService.follow(host.uid)).rejects.toThrow('Sign in');
  expect(runTransaction).not.toHaveBeenCalled();
});

test('unfollow deletes only the signed-in source record, even after target role changes', async () => {
  prepareFollow(host, pending);
  await expect(followService.unfollow(pending.uid)).resolves.toBe(false);
  expect(doc).toHaveBeenCalledWith({}, 'users', host.uid, 'following', pending.uid);
  expect(deleteDoc).toHaveBeenCalledWith('follow-reference');
});

test('following consumers reads real typed follow documents', async () => {
  prepareFollow(host, consumer);
  getDocs.mockResolvedValue({ docs: [{ id: consumer.uid }] });
  await expect(followService.getFollowingConsumerIds()).resolves.toEqual([consumer.uid]);
  expect(where).toHaveBeenCalledWith('targetRole', '==', 'consumer');
});

test('follower listener reports snapshot totals and exposes cleanup and errors', () => {
  const callback = jest.fn();
  const onError = jest.fn();
  const unsubscribe = jest.fn();
  query.mockReturnValue('incoming-query');
  onSnapshot.mockImplementation((_query, next) => { next({ size: 3 }); next({ size: 2 }); return unsubscribe; });
  expect(followService.subscribeFollowerCount(host.uid, callback, onError)).toBe(unsubscribe);
  expect(where).toHaveBeenCalledWith('hostId', '==', host.uid);
  expect(callback.mock.calls).toEqual([[3], [2]]);
  expect(onSnapshot).toHaveBeenCalledWith('incoming-query', expect.any(Function), onError);
});
