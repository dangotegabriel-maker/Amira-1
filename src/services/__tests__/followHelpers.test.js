import { canFollowProfile, followingSnapshotToIds, followService } from '../followService';
import { publicIdentityService } from '../publicIdentityService';
import { auth, dbService } from '../firebaseService';
import { deleteDoc, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), collectionGroup: jest.fn(), deleteDoc: jest.fn(),
  doc: jest.fn(), getDoc: jest.fn(), getDocs: jest.fn(), onSnapshot: jest.fn(),
  query: jest.fn(), runTransaction: jest.fn(), serverTimestamp: jest.fn(), where: jest.fn(),
}));
jest.mock('../firebaseService', () => ({ auth: { currentUser: null }, db: {}, dbService: { getUserProfile: jest.fn() } }));

jest.mock('../publicIdentityService',()=>({publicIdentityService:{relationship:jest.fn()}}));
jest.mock('../socialBackend',()=>({invokeSocial:jest.fn(async()=>({}))}));
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
  publicIdentityService.relationship.mockResolvedValue({valid:canFollowProfile(source,target)});
  doc.mockReturnValue('follow-reference');
  serverTimestamp.mockReturnValue('server-time');
  const transaction = { get: jest.fn().mockResolvedValue({ exists: () => exists }), set: jest.fn() };
  runTransaction.mockImplementation(async (_db, callback) => callback(transaction));
  return transaction;
};

test('host follows a consumer in the existing owned subcollection', async () => {
  const transaction = prepareFollow(host, consumer);
  await expect(followService.follow(consumer.uid)).resolves.toBe(true);
  expect(dbService.getUserProfile).toHaveBeenCalledTimes(1);
  expect(dbService.getUserProfile).toHaveBeenCalledWith(host.uid);
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

test('relationship subscription uses only owner raw profile plus authorized subdocuments and preserves live breakup',async()=>{
 auth.currentUser={uid:consumer.uid};
 publicIdentityService.relationship.mockResolvedValue({valid:true});
 doc.mockImplementation((_db,...parts)=>parts.join('/'));
 const listeners=new Map(),stops=[];
 const snapshot=(exists,data={})=>({exists:()=>exists,data:()=>data,metadata:{hasPendingWrites:false}});
 onSnapshot.mockImplementation((path,_options,next)=>{listeners.set(path,next);const stop=jest.fn();stops.push(stop);return stop;});
 const value=jest.fn(),stop=followService.subscribeRelationship(host.uid,value,jest.fn());
 expect(listeners.has(`users/${host.uid}`)).toBe(false);
 expect(listeners.size).toBe(5);
 listeners.get(`users/${consumer.uid}`)(snapshot(true,consumer));
 listeners.get(`users/${consumer.uid}/following/${host.uid}`)(snapshot(true));
 listeners.get(`users/${host.uid}/following/${consumer.uid}`)(snapshot(true));
 listeners.get(`users/${consumer.uid}/blocked/${host.uid}`)(snapshot(false));
 listeners.get(`users/${host.uid}/blocked/${consumer.uid}`)(snapshot(false));
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 expect(value.mock.calls.at(-1)[0].label).toBe('Friends');
 listeners.get(`users/${host.uid}/following/${consumer.uid}`)(snapshot(false));
 expect(value.mock.calls.at(-1)[0].label).toBe('Following');
 listeners.get(`users/${host.uid}/blocked/${consumer.uid}`)(snapshot(true));
 expect(value.mock.calls.at(-1)[0]).toMatchObject({blocked:true,label:'Follow'});
 expect(dbService.getUserProfile).not.toHaveBeenCalled();
 stop();expect(stops.every(fn=>fn.mock.calls.length===1)).toBe(true);
});

test('unsubscribed relationship cannot display a late capability response',async()=>{
 auth.currentUser={uid:consumer.uid};let resolve;
 publicIdentityService.relationship.mockImplementation(()=>new Promise(done=>{resolve=done;}));
 doc.mockImplementation((_db,...parts)=>parts.join('/'));
 onSnapshot.mockImplementation((path,_options,next)=>{next({exists:()=>false,data:()=>consumer,metadata:{}});return ()=>{};});
 const value=jest.fn(),stop=followService.subscribeRelationship(host.uid,value,jest.fn());
 const calls=value.mock.calls.length;stop();resolve({valid:true});await Promise.resolve();
 expect(value).toHaveBeenCalledTimes(calls);
});
