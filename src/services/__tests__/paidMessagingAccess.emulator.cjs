// Local Firestore emulator only; never contacts production.
const assert=require('node:assert/strict'),Module=require('node:module');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const backendRequire=Module.createRequire(require.resolve('../../../functions/package.json'));
const admin=backendRequire('firebase-admin/app'),{getFirestore:adminFirestore,FieldValue}=backendRequire('firebase-admin/firestore'),{HttpsError}=backendRequire('firebase-functions/v2/https');
const {initializeApp,deleteApp}=require('firebase/app'),{getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc}=require('firebase/firestore');
const {createSocialMessaging}=require('../../../functions/src/socialMessaging');
const projectId=`demo-paid-messaging-${Date.now()}`,serverApp=admin.initializeApp({projectId},projectId),db=adminFirestore(serverApp),apps=[];let checks=0,nowMs=Date.parse('2026-09-19T12:00:00Z');
const client=uid=>{const app=initializeApp({projectId,apiKey:'emulator-only'},uid||'anon');apps.push(app);const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8289,uid?{mockUserToken:{sub:uid,user_id:uid}}:{});return store;};
const denied=async promise=>{await assert.rejects(promise,e=>e.code==='permission-denied');checks++;};
const consumer={uid:'c',role:'consumer',isProfileComplete:true,isDemo:false,wallet:{creditBalance:20},hostStatus:{isApproved:false},vip:{status:'inactive',tier:'FREE'}};
const host={uid:'h',role:'host',isProfileComplete:true,isDemo:false,wallet:{creditBalance:0},hostStatus:{isApproved:true},vip:{status:'inactive',tier:'FREE'}};
async function main(){
 await db.doc('users/c').set(consumer);await db.doc('users/o').set({...consumer,uid:'o'});await db.doc('users/h').set(host);await db.doc('consumerRewards/c').set({freeMessages:0});await db.doc('economyConfig/current').set({paidMessaging:{enabled:true,priceCredits:4,version:'emulator'}});
 const api=createSocialMessaging({db,FieldValue,HttpsError,now:()=>nowMs});
 const [a,b]=await Promise.all([api.sendText('c',{receiverId:'h',messageId:'race_a',text:'A'}),api.sendText('c',{receiverId:'h',messageId:'race_b',text:'B'})]);
 assert.equal(a.chargedCredits+b.chargedCredits,4);assert.equal((await db.doc('users/c').get()).data().wallet.creditBalance,16);checks+=2;
 assert.equal((await db.collection('messageAccess/c__h/unlocks').get()).size,1);assert.equal((await db.collection('creditWallets/c/ledger').where('type','==','message_access_unlock').get()).size,1);assert.equal((await db.collection('conversations/c__h/messages').get()).size,2);checks+=3;
 const retried=await api.sendText('c',{receiverId:'h',messageId:'race_a',text:'A'});assert.equal(retried.idempotent,true);assert.equal((await db.doc('users/c').get()).data().wallet.creditBalance,16);checks+=2;
 nowMs+=10*60*1000;await Promise.all([api.reconcileNoReply('c','h',nowMs),api.reconcileNoReply('c','h',nowMs)]);assert.equal((await db.doc('users/c').get()).data().wallet.creditBalance,20);assert.equal((await db.collection('creditWallets/c/ledger').where('type','==','message_access_refund').get()).size,1);checks+=2;
 const window=(await db.doc('consumerRewards/c/chatWindows/c__h').get()).data();assert.ok(window.expiresAt.toMillis()>nowMs);checks++;
 const c=client('c'),o=client('o'),h=client('h'),anon=client(null),access='messageAccess/c__h',unlock=`${access}/unlocks/${window.unlockId}`;
 for(const store of [c,o,h,anon])await denied(getDoc(doc(store,unlock)));
 for(const patch of [{expiresAt:new Date(nowMs+999999999)},{source:'friends'},{status:'replied'},{status:'refunded'},{chargeCredits:1},{refundDeadline:new Date(nowMs+999999999)}])await denied(updateDoc(doc(c,unlock),patch));
 await denied(setDoc(doc(c,`${access}/unlocks/forged`),{source:'paid',status:'active'}));
 await denied(setDoc(doc(c,'conversations/c__h/messages/forged'),{senderId:'c',receiverId:'h',type:'text',text:'bypass'}));
 await denied(setDoc(doc(c,'conversations/c__h/messages/impersonate'),{senderId:'h',receiverId:'c',type:'text',text:'fake'}));
 await denied(setDoc(doc(h,'conversations/c__h/messages/impersonate2'),{senderId:'c',receiverId:'h',type:'text',text:'fake'}));
 await denied(updateDoc(doc(c,'users/c'),{'wallet.creditBalance':999}));await denied(setDoc(doc(c,'creditWallets/c/ledger/forged'),{credits:999}));await denied(setDoc(doc(c,'consumerLevels/c'),{lifetimeQualifyingPurchasedCredits:999}));await denied(getDoc(doc(c,'users/h')));await denied(setDoc(doc(c,'amiraIds/AMR-FORGED'),{uid:'c'}));await denied(updateDoc(doc(h,'users/h'),{'hostStatus.isApproved':false}));
 await db.doc('users/c/blocked/h').set({blockedUid:'h'});await assert.rejects(api.sendText('c',{receiverId:'h',messageId:'blocked',text:'blocked'}),e=>e.code==='permission-denied');checks++;
 await denied(setDoc(doc(c,'conversations/c__h/messages/blocked'),{senderId:'c',receiverId:'h',type:'text',text:'bypass'}));
 console.log(`Authoritative paid messaging access: ${checks} checks passed.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await Promise.all(apps.map(deleteApp));await admin.deleteApp(serverApp);});
