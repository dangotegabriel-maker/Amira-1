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
 await db.doc('users/h').set({role:'host',hostStatus:{isApproved:true,availability:'busy',preCallAvailability:'online'}});
 const call={accountingVersion:2,status:'reconnecting',callerId:'c',receiverId:'h',participantIds:['c','h'],createdAt:Timestamp.now(),createdAtMs:now-22000,ratePerMinute:25,billingMode:'paid',settledIncrements:0,billedCredits:0,freeVideoAllowanceSeconds:0,freeVideoConsumedSeconds:0,
 connection:{state:'reconnecting',epoch:1,segmentStartedAtMs:null,connectedMs:22000,freeMs:0,paidMs:22000,reconnectDeadlineMs:now+10000,leaseUntilMs:now+12000,participants:{c:{state:'disconnected',sequence:1,lastSeenAtMs:now},h:{state:'disconnected',sequence:1,lastSeenAtMs:now}}}};
 await db.doc(`calls/${callId}`).set(call);
 for(const uid of ['c','h'])await db.doc(`activeCallLocks/${uid}`).set({callId});
 await Promise.all([recovery.run(callId,'c','settle'),recovery.run(callId,'h','end'),recovery.run(callId,null,'reconcile'),recovery.run(callId,'c','event',{state:'connected',sequence:2,epoch:1})]);
 await recovery.run(callId,'c','end');
 const ended=(await db.doc(`calls/${callId}`).get()).data();
 assert.equal(ended.status,'ended');assert.equal(ended.settledIncrements,2);assert.equal(ended.billedCredits,10);assert.equal(ended.durationSeconds,22);
 assert.equal((await db.doc('users/c').get()).data().wallet.creditBalance,90);
 assert.equal((await db.collection('creditTransactions').get()).size,2);
 assert.equal((await db.collection('callHistory').get()).size,1);
 assert.equal((await db.collection('activeCallLocks').get()).size,0);
 assert.equal((await db.doc('users/h').get()).data().hostStatus.availability,'online');
 console.log('Real Firestore transaction race: 9 assertions passed (settle/end/reconcile/reconnect/duplicate end).');
}
main().finally(()=>deleteApp(app)).catch(error=>{console.error(error);process.exitCode=1;});
