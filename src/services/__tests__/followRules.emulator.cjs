// Run against an isolated emulator loaded with firestore.rules:
// node src/services/__tests__/followRules.emulator.cjs
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const {
  getFirestore, connectFirestoreEmulator, doc, setDoc, deleteDoc, getDocs,
  collectionGroup, query, where, serverTimestamp, onSnapshot,
} = require('firebase/firestore');

const projectId = 'demo-amira-follow';
const base = `http://127.0.0.1:8189/v1/projects/${projectId}/databases/(default)/documents`;
const apps = [];
const client = (uid) => {
  const app = initializeApp({ projectId, apiKey: 'emulator-only' }, uid || 'anonymous');
  apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8189, uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
  return db;
};
const seed = async (uid, role, approved = false) => {
  const response = await fetch(`${base}/users/${uid}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      uid: { stringValue: uid }, role: { stringValue: role },
      hostStatus: { mapValue: { fields: { isApproved: { booleanValue: approved } } } },
    } }),
  });
  assert.equal(response.ok, true, await response.text());
};
const consumerFollow = (consumerId, hostId) => ({ consumerId, hostId, createdAt: serverTimestamp() });
const hostFollow = (sourceId, targetId) => ({ sourceId, targetId, sourceRole: 'host', targetRole: 'consumer', createdAt: serverTimestamp() });
const denied = (operation) => assert.rejects(operation, (error) => error.code === 'permission-denied');

async function main() {
  await Promise.all([seed('h', 'host', true), seed('h2', 'host', true), seed('c', 'consumer'), seed('c2', 'consumer'), seed('pending', 'host')]);
  const host = client('h');
  const consumer = client('c');
  const pending = client('pending');
  const anonymous = client(null);
  const outbound = doc(host, 'users/h/following/c');
  const incoming = doc(consumer, 'users/c/following/h');
  await setDoc(outbound, hostFollow('h', 'c'));
  await setDoc(incoming, consumerFollow('c', 'h'));
  await denied(setDoc(doc(consumer, 'users/c/following/c2'), consumerFollow('c', 'c2')));
  await denied(setDoc(doc(host, 'users/h/following/h2'), hostFollow('h', 'h2')));
  await denied(setDoc(doc(pending, 'users/pending/following/c'), hostFollow('pending', 'c')));
  await denied(setDoc(doc(host, 'users/h/following/h'), hostFollow('h', 'h')));
  await denied(setDoc(doc(host, 'users/c2/following/h'), consumerFollow('c2', 'h')));
  await denied(setDoc(doc(anonymous, 'users/c2/following/h'), consumerFollow('c2', 'h')));
  await denied(setDoc(doc(host, 'users/h/following/c2'), { ...hostFollow('h', 'c2'), wallet: 100 }));
  await denied(setDoc(doc(host, 'users/h/following/c2'), { ...hostFollow('h', 'c2'), targetId: 'c' }));
  await denied(setDoc(outbound, hostFollow('h', 'c'))); // Updates remain forbidden.
  await denied(deleteDoc(doc(consumer, 'users/h/following/c')));

  const incomingQuery = query(collectionGroup(host, 'following'), where('hostId', '==', 'h'));
  assert.equal((await getDocs(incomingQuery)).size, 1); // Outbound host follows do not inflate count.
  await denied(getDocs(query(collectionGroup(consumer, 'following'), where('hostId', '==', 'h'))));
  await denied(getDocs(query(collectionGroup(host, 'following'), where('hostId', '==', 'h2'))));

  await new Promise((resolve, reject) => {
    let removed = false;
    const timeout = setTimeout(() => { stop(); reject(new Error('Live count did not update')); }, 10000);
    const stop = onSnapshot(incomingQuery, async (snapshot) => {
      if (snapshot.size === 1 && !removed) {
        removed = true;
        try { await deleteDoc(incoming); } catch (error) { clearTimeout(timeout); stop(); reject(error); }
      } else if (snapshot.size === 0 && removed) {
        clearTimeout(timeout); stop(); resolve();
      }
    }, (error) => { clearTimeout(timeout); reject(error); });
  });
  await deleteDoc(outbound);
  await setDoc(doc(consumer, 'users/c/blocked/h'), { blockedUid: 'h', createdAt: serverTimestamp() });
  await denied(setDoc(outbound, hostFollow('h', 'c')));
  await denied(setDoc(incoming, consumerFollow('c', 'h')));
  console.log('Follow rules passed: both directions, denied role/ownership/schema cases, blocking, recipient-only query, live count and unfollow.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await Promise.all(apps.map(deleteApp)); });
