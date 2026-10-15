const assert=require('node:assert/strict');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore');
const {HttpsError}=require('firebase-functions/v2/https');
const {createCallRecovery}=require('../callRecovery');
const app=initializeApp({projectId:`demo-amira-transactions-${Date.now()}`});
const db=getFirestore(app),recovery=createCallRecovery({db,FieldValue,HttpsError});
async function main(){
 const now=Date.now(),callId='race';
 await db.doc('users/c').set({role:'consumer',wallet:{creditBalance:100}});
 await db.doc('creditWallets/c').set({ownerUid:'c',purchasedCredits:60,bonusCredits:40,legacyCredits:0,unallocatedSpentCredits:0,totalBalance:100,accountingVersion:1});
 await db.doc('users/h').set({role:'host',hostStatus:{isApproved:true,availability:'busy',preCallAvailability:'online'}});
 const call={accountingVersion:3,economicsSnapshot:{version:'call-economics-v3',baseRatePerMinute:25,consumerRatePerMinute:25,hostEarningBasisPerMinute:25,platformAbsorptionPerMinute:0,vipPolicyVersion:null,billingIncrementSeconds:10,rateUnit:'credits_per_minute',automaticPaidContinuation:true,disclosureAccepted:true},status:'reconnecting',callerId:'c',receiverId:'h',participantIds:['c','h'],createdAt:Timestamp.now(),createdAtMs:now-22000,ratePerMinute:25,billingMode:'paid',settledIncrements:0,billedCredits:0,freeVideoAllowanceSeconds:0,freeVideoConsumedSeconds:0,
 connection:{state:'reconnecting',epoch:1,segmentStartedAtMs:null,connectedMs:22000,freeMs:0,paidMs:22000,reconnectDeadlineMs:now+10000,leaseUntilMs:now+12000,participants:{c:{state:'disconnected',sequence:1,lastSeenAtMs:now},h:{state:'disconnected',sequence:1,lastSeenAtMs:now}}}};
 await db.doc(`calls/${callId}`).set(call);
 for(const uid of ['c','h'])await db.doc(`activeCallLocks/${uid}`).set({callId});
 await Promise.allSettled([recovery.run(callId,'c','settle'),recovery.run(callId,'h','end'),recovery.run(callId,null,'reconcile'),recovery.run(callId,'c','event',{state:'connected',sequence:2,epoch:1})]);
 await recovery.run(callId,'c','end');
 const ended=(await db.doc(`calls/${callId}`).get()).data();
 assert.equal(ended.status,'ended');assert.equal(ended.settledIncrements,3);assert.equal(ended.billedCredits,12);assert.equal(ended.durationSeconds,22);
 assert.equal((await db.doc('users/c').get()).data().wallet.creditBalance,88);
 assert.equal((await db.collection('creditTransactions').get()).size,3);
 const wallet=(await db.doc('creditWallets/c').get()).data();assert.equal(wallet.totalBalance,88);assert.equal(wallet.unallocatedSpentCredits,12);
 assert.equal((await db.collection('callHistory').get()).size,1);
 assert.equal((await db.collection('activeCallLocks').get()).size,0);
 assert.equal((await db.doc('users/h').get()).data().hostStatus.availability,'online');
 console.log('Real Firestore transaction race: 11 assertions passed (v3 settle/end/reconcile/reconnect/duplicate end and P/B/L/U invariant).');
 // Frozen connected evidence isolates reward accounting from emulator latency.
 const sponsoredId='sponsored-rewards',sponsoredNow=Date.now();
 await db.doc('consumerRewards/c').set({freeVideoSeconds:7});
 await db.doc('sponsoredCallInvites/invite').set({status:'connected'});
 await db.doc(`calls/${sponsoredId}`).set({...call,source:'sponsored_invite',sponsoredInviteId:'invite',
   sponsoredSeconds:30,freeVideoSource:'sponsored_invite_plus_rewards',freeVideoAllowanceSeconds:37,
   freeVideoRewardSeconds:7,billingMode:'preview',connection:{...call.connection,
     connectedMs:34000,freeMs:34000,paidMs:0,reconnectDeadlineMs:sponsoredNow+120000}});
 await Promise.all([recovery.run(sponsoredId,'c','sync'),recovery.run(sponsoredId,'h','sync')]);
 assert.equal((await db.doc('consumerRewards/c').get()).data().freeVideoSeconds,3);
 assert.equal((await db.doc(`calls/${sponsoredId}`).get()).data().freeVideoConsumedSeconds,4);
 await Promise.all([recovery.run(sponsoredId,'c','end'),recovery.run(sponsoredId,'h','end')]);
 assert.equal((await db.doc('consumerRewards/c').get()).data().freeVideoSeconds,3);
 assert.equal((await db.doc('sponsoredCallInvites/invite').get()).data().status,'completed');
 assert.equal((await db.doc(`calls/${sponsoredId}`).get()).data().billedCredits,0);
 console.log('Sponsored earned FVT: 5 assertions passed (concurrent sync/end, 30-second intro excluded, no duplicate debit).');
}
main().finally(()=>deleteApp(app)).catch(error=>{console.error(error);process.exitCode=1;});
