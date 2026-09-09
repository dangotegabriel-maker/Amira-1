// Uses the existing Firestore emulator only; never contacts a production project.
// java -jar <cached-firestore-emulator.jar> --host 127.0.0.1 --port 8189 --rules firestore.rules
// node src/services/__tests__/rewardsRules.emulator.cjs
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } = require('firebase/firestore');
const projectId = 'demo-amira-rewards';
const base = `http://127.0.0.1:8189/v1/projects/${projectId}/databases/(default)/documents`;
const apps = [];
let checks = 0;
const client = (uid) => {
  const app = initializeApp({ projectId, apiKey: 'emulator-only' }, uid || 'anonymous'); apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8189, uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
  return db;
};
const field = (value) => typeof value === 'string' ? { stringValue: value }
  : typeof value === 'boolean' ? { booleanValue: value }
    : typeof value === 'number' ? { integerValue: String(value) }
      : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, field(entry)])) } };
const seed = async (path, data) => {
  const response = await fetch(`${base}/${path}`, { method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, field(value)])) }) });
  assert.equal(response.ok, true, await response.text());
};
const denied = async (operation) => { await assert.rejects(operation, (error) => error.code === 'permission-denied'); checks++; };
const readable = async (db, path) => { assert.equal((await getDoc(doc(db, path))).exists(), true); checks++; };
const profile = (uid, role) => ({ uid, role, username: uid,
  hostStatus: { isApproved: role === 'host', hasApplied: role === 'host', availability: 'offline', verificationStatus: role === 'host' ? 'approved' : 'not_started' },
  wallet: { creditBalance: 0 }, earnings: { pending: 0, available: 0 }, vip: { tier: 'FREE', status: 'inactive' },
  profileViewStats: { recentCount: 0 }, referralStats: { qualifiedCount: 0, pendingCount: 0 } });

async function main() {
  await seed('users/c', profile('c', 'consumer')); await seed('users/c2', profile('c2', 'consumer')); await seed('users/h', profile('h', 'host'));
  await seed('consumerRewards/c', { freeMessages: 3, freeVideoSeconds: 10, quickMatchCount: 1, promotionalGifts: { generic: 1 } });
  await seed('consumerRewards/h', { freeMessages: 3, freeVideoSeconds: 10 });
  await seed('consumerRewards/c/claims/2026-09-08', { consumerUid: 'c', rewardDay: 1 });
  await seed('hostEarnings/h', { pendingCreditsEquivalent: 4 });
  await seed('platformRevenue/creditsEquivalent', { accruedCreditsEquivalent: 1 });
  await seed('economyConfig/current', { platformCommissionBasisPoints: 2000 });
  const consumer = client('c'), other = client('c2'), host = client('h'), anonymous = client(null);
  await readable(consumer, 'consumerRewards/c');
  await readable(consumer, 'consumerRewards/c/claims/2026-09-08');
  assert.equal((await getDocs(collection(consumer, 'consumerRewards/c/claims'))).size, 1); checks++;
  assert.equal((await getDoc(doc(other, 'consumerRewards/c2'))).exists(), false); checks++;
  for (const db of [other, host, anonymous]) {
    await denied(getDoc(doc(db, 'consumerRewards/c')));
    await denied(getDoc(doc(db, 'consumerRewards/c/claims/2026-09-08')));
  }
  await denied(getDoc(doc(host, 'consumerRewards/h')));
  await denied(setDoc(doc(other, 'consumerRewards/c2'), { freeMessages: 999 }));
  await denied(updateDoc(doc(consumer, 'consumerRewards/c'), { freeMessages: 999 }));
  await denied(updateDoc(doc(consumer, 'consumerRewards/c'), { freeVideoSeconds: 9 }));
  await denied(updateDoc(doc(consumer, 'consumerRewards/c'), { freeVideoSeconds: 999 }));
  await denied(deleteDoc(doc(consumer, 'consumerRewards/c')));
  await denied(setDoc(doc(consumer, 'consumerRewards/c/claims/2026-09-09'), { rewardDay: 7 }));
  await denied(setDoc(doc(host, 'consumerRewards/h/claims/2026-09-09'), { rewardDay: 7 }));
  await readable(host, 'hostEarnings/h');
  await denied(getDoc(doc(consumer, 'hostEarnings/h')));
  await denied(updateDoc(doc(host, 'hostEarnings/h'), { pendingCreditsEquivalent: 999 }));
  for (const db of [consumer, host]) {
    await denied(getDoc(doc(db, 'platformRevenue/creditsEquivalent')));
    await denied(setDoc(doc(db, 'platformRevenue/creditsEquivalent'), { accruedCreditsEquivalent: 999 }));
    await denied(setDoc(doc(db, 'economyConfig/current'), { platformCommissionBasisPoints: 0 }));
    await denied(setDoc(doc(db, 'creditTransactions/forged'), { consumerId: 'c', creatorId: 'h', platformFeeCredits: 0, creatorNetCredits: 999 }));
  }
  await updateDoc(doc(consumer, 'users/c'), { username: 'Updated name' }); checks++;
  await denied(updateDoc(doc(consumer, 'users/c'), { 'wallet.creditBalance': 999 }));
  await denied(updateDoc(doc(host, 'users/h'), { 'earnings.available': 999 }));
  console.log(`Rewards/economy security rules: ${checks} checks passed.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await Promise.all(apps.map(deleteApp)); });
