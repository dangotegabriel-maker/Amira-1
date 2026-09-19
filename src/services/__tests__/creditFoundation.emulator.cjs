// Local Firestore emulator only: FIRESTORE_EMULATOR_HOST=127.0.0.1:8289 node this-file
const assert=require('node:assert/strict');
const {initializeApp:adminApp,deleteApp:deleteAdmin}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {HttpsError}=require('firebase-functions/v2/https');
const {initializeApp,deleteApp}=require('firebase/app');
const {getFirestore:getClient,connectFirestoreEmulator,doc,getDoc,setDoc}=require('firebase/firestore');
const {createCreditService}=require('../../../functions/src/creditService');
const projectId=`demo-credit-${Date.now()}`; process.env.GCLOUD_PROJECT=projectId;
const admin=adminApp({projectId},'credit-admin'),db=getFirestore(admin);let checks=0;
const profile=uid=>({uid,role:'consumer',isDemo:false,wallet:{creditBalance:12},hostStatus:{isApproved:false}});
const denied=async promise=>{await assert.rejects(promise,e=>e.code==='permission-denied');checks++;};
async function main(){
 await db.doc('users/c1').set(profile('c1'));await db.doc('users/c2').set(profile('c2'));
 let sequence=0;const service=createCreditService({db,FieldValue,HttpsError,packages:{starter:{credits:50,amountMinor:1000,currency:'GHS',label:'Starter'}},createReference:()=>`ref_${++sequence}`});
 const legacy=await service.wallet('c1',{});assert.deepEqual({total:legacy.totalCredits,purchased:legacy.purchasedCredits,legacy:legacy.legacyCredits},{total:12,purchased:0,legacy:12});checks++;
 const initialized=await service.initialize('c1',{packageId:'starter'});assert.equal(initialized.status,'pending');checks++;
 const proof=async({reference})=>({success:true,reference,providerTransactionId:'provider_1',amountMinor:1000,currency:'GHS'});
 const settled=await Promise.all([service.verify('c1',{reference:initialized.reference},proof),service.verify('c1',{reference:initialized.reference},proof)]);
 assert.equal(settled.filter(x=>x.idempotent===false).length,1);assert.equal((await db.doc('users/c1').get()).data().wallet.creditBalance,62);checks+=2;
 assert.equal((await db.collection('creditWallets/c1/ledger').get()).size,1);assert.equal((await db.collection('consumerLevels/c1/qualifyingPurchases').get()).size,1);checks+=2;
 const after=await service.wallet('c1',{});assert.equal(after.purchasedCredits,50);assert.equal(after.legacyCredits,12);checks+=2;
 const other=await service.initialize('c2',{packageId:'starter'});await assert.rejects(service.verify('c2',{reference:other.reference},async({reference})=>({...await proof({reference}),providerTransactionId:'provider_1'})),e=>['permission-denied','failed-precondition'].includes(e.code));checks++;
 await service.reverse({reference:initialized.reference,reversalId:'reversal_1',verified:true,credits:50});await service.reverse({reference:initialized.reference,reversalId:'reversal_1',verified:true,credits:50});
 const reversed=await service.wallet('c1',{});assert.equal(reversed.totalCredits,62);assert.equal(reversed.purchasedCredits,0);assert.equal(reversed.legacyCredits,62);checks+=3;
 const app=initializeApp({projectId,apiKey:'emulator-only'},'credit-client'),client=getClient(app);connectFirestoreEmulator(client,'127.0.0.1',8289,{mockUserToken:{sub:'c1',user_id:'c1'}});
 for(const path of ['creditWallets/c1','creditWallets/c1/ledger/recharge_ref_1','paymentAttempts/ref_1','paymentReferences/provider_1']){await denied(getDoc(doc(client,path)));await denied(setDoc(doc(client,path),{forged:true}));}
 await deleteApp(app);console.log(`Authoritative credit foundation: ${checks} checks passed.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>deleteAdmin(admin));
