// Isolated localhost-only fixtures. No provider/payment verification or production writes.
const assert=require('node:assert/strict'),Module=require('node:module');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const backendRequire=Module.createRequire(require.resolve('../../../functions/package.json'));
const admin=backendRequire('firebase-admin/app'),{getFirestore:adminFirestore,FieldValue}=backendRequire('firebase-admin/firestore'),{HttpsError}=backendRequire('firebase-functions/v2/https');
const {initializeApp,deleteApp}=require('firebase/app');const {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,setLogLevel}=require('firebase/firestore');
const {createConsumerLevels}=require('../../../functions/src/consumerLevels'),{createConsumerRewards}=require('../../../functions/src/consumerRewards');
setLogLevel('silent');const projectId=`demo-amira-level-${Date.now()}`,serverApp=admin.initializeApp({projectId},projectId),db=adminFirestore(serverApp),apps=[];let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const denied=async promise=>{await assert.rejects(promise,error=>error.code==='permission-denied');checks++;};
const client=uid=>{const app=initializeApp({projectId,apiKey:'emulator-only'},uid);apps.push(app);const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8289,{mockUserToken:{sub:uid,user_id:uid}});return store;};
const profile=(uid,approved=false)=>({uid,role:approved?'host':'consumer',hostStatus:{isApproved:approved,hasApplied:approved,verificationStatus:approved?'approved':'not_started',availability:'offline'},wallet:{creditBalance:100},earnings:{pending:0,available:0},hostProfile:{videoRateCredits:25,rateTier:'ENTRY'},vip:{tier:'FREE',status:'inactive'},profileViewStats:{recentCount:0},referralStats:{qualifiedCount:0,pendingCount:0}});
async function main(){
 for(const uid of ['c','other','p','h'])await db.doc(`users/${uid}`).set(profile(uid,uid==='h'));
 await db.doc('users/p').update({role:'host','hostStatus.verificationStatus':'pending'});
 await db.doc('consumerLevels/c').set({consumerUid:'c',lifetimeQualifyingPurchasedCredits:100});
 const c=client('c'),other=client('other'),h=client('h'),p=client('p');
 for(const store of [c,other,h])for(const path of ['consumerLevels/c','consumerLevels/c/qualifyingPurchases/forged','consumerLevels/c/milestoneClaims/1','levelConfig/current'])await denied(setDoc(doc(store,path),{lifetimeQualifyingPurchasedCredits:999999,level:10}));
 await updateDoc(doc(c,'users/c'),{'hostProfile.bio':'Ordinary profile edits still work'});checks++;
 for(const field of ['level','amiraLevel','lifetimeQualifyingPurchasedCredits'])await denied(updateDoc(doc(c,'users/c'),{[field]:999999}));
 await getDoc(doc(c,'consumerLevels/c'));checks++;await denied(getDoc(doc(other,'consumerLevels/c')));await denied(getDoc(doc(h,'consumerLevels/c')));await denied(getDoc(doc(h,'consumerRewards/c')));
 await denied(updateDoc(doc(p,'users/p'),{'hostStatus.isApproved':true}));
 const levels=createConsumerLevels({db,FieldValue,HttpsError});
 check(await levels.snapshot('c'),{level:0,thresholdsConfigured:false,milestones:[]});await assert.rejects(levels.claim('c',{level:1}),error=>error.code==='failed-precondition');checks++;
 // Threshold/reward fixture exists only in this unique test namespace.
 const TEST_CONFIG={version:'isolated-test',thresholds:Array.from({length:11},(_,level)=>level*100),milestones:{1:{freeMessages:2},2:{freeVideoSeconds:3,quickMatchCount:1}}};await db.doc('levelConfig/current').set(TEST_CONFIG);
 await assert.rejects(levels.claim('other',{level:1}),error=>error.code==='failed-precondition');checks++;
 await assert.rejects(levels.claim('c',{level:1,uid:'other'}),error=>error.code==='invalid-argument');checks++;
 await denied(levels.claim('h',{level:1}));await denied(levels.snapshot('h'));
 await Promise.all([levels.claim('c',{level:1}),levels.claim('c',{level:1}),levels.claim('c',{level:1})]);
 check((await db.doc('consumerRewards/c').get()).data().freeMessages,2);check((await db.collection('consumerLevels/c/milestoneClaims').get()).size,1);check((await db.collection('consumerRewards/c/messageTransactions').get()).size,1);check((await db.doc('consumerLevels/c').get()).data().lifetimeQualifyingPurchasedCredits,100);
 await db.doc('consumerLevels/c').update({lifetimeQualifyingPurchasedCredits:1000});check((await levels.claim('c',{level:1})).idempotent,true);check((await db.doc('consumerRewards/c').get()).data().freeMessages,2);
 check(await levels.publicLevel('h','c'),{level:10});await denied(levels.publicLevel('other','c'));await db.doc('users/c/blocked/h').set({blockedUid:'h'});await denied(levels.publicLevel('h','c'));
 await db.doc('consumerLevels/c').update({lifetimeQualifyingPurchasedCredits:0});check((await levels.snapshot('c')).level,0);check((await levels.claim('c',{level:1})).idempotent,true);
 let now=Date.parse('2026-09-01T23:59:59Z');const rewards=createConsumerRewards({db,FieldValue,HttpsError,clock:()=>now});
 await Promise.all([rewards.claim('c'),rewards.claim('c')]);check((await db.doc('consumerRewards/c').get()).data().freeMessages,5);check((await rewards.claim('c')).alreadyClaimed,true);
 now=Date.parse('2026-09-02T00:00:00Z');check((await rewards.claim('c')).checkIn.lastRewardDay,2);
 now=Date.parse('2026-09-04T00:00:00Z');check((await rewards.claim('c')).checkIn.lastRewardDay,1);
 for(let day=5;day<=9;day++){now=Date.parse(`2026-09-${String(day).padStart(2,'0')}T00:00:00Z`);check((await rewards.claim('c')).checkIn.lastRewardDay,day-3);}
 now=Date.parse('2026-09-10T00:00:00Z');check((await rewards.claim('c')).checkIn.lastRewardDay,7);
 now=Date.parse('2026-09-11T00:00:00Z');check((await rewards.claim('c')).checkIn.lastRewardDay,1);
 check((await rewards.claim('p')).claimed,true);await denied(rewards.claim('h'));check((await db.doc('consumerLevels/c').get()).data().lifetimeQualifyingPurchasedCredits,0);check(Object.hasOwn((await db.doc('consumerRewards/c').get()).data(),'promotionalGifts'),false);
 console.log(`Level/rewards backend and security: ${checks} checks passed (${projectId}, localhost only).`);
}
main().finally(()=>Promise.all([...apps.map(deleteApp),admin.deleteApp(serverApp)])).catch(error=>{console.error(error);process.exitCode=1;});
