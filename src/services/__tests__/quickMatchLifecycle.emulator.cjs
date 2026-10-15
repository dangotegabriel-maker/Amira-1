// Local Firestore emulator only. No production Quick Match price exists.
const assert=require('node:assert/strict'),Module=require('node:module');process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const req=Module.createRequire(require.resolve('../../../functions/package.json')),admin=req('firebase-admin/app'),{getFirestore:adminDb,FieldValue,Timestamp}=req('firebase-admin/firestore'),{HttpsError}=req('firebase-functions/v2/https');
const {initializeApp,deleteApp}=require('firebase/app'),{getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc}=require('firebase/firestore');
const {createQuickMatchService}=require('../../../functions/src/quickMatchService'),Q=require('../../../functions/src/quickMatchDomain');
const projectId=`demo-quick-match-${Date.now()}`,server=admin.initializeApp({projectId},projectId),db=adminDb(server),apps=[];let checks=0,now=1700000000000,seq=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++},reject=async(p,code)=>{await assert.rejects(p,e=>e.code===code);checks++};
const consumer=(uid,extra={})=>({uid,role:'consumer',isDemo:false,username:uid,countryCode:'GH',wallet:{creditBalance:91},level:7,lifetimeQualifyingPurchasedCredits:900,...extra});
const host=(uid,availability='online')=>({uid,role:'host',isDemo:false,username:uid,countryCode:'GH',hostStatus:{isApproved:true,availability},hostProfile:{videoRateCredits:30,interests:['music']}});
const client=uid=>{const app=initializeApp({projectId,apiKey:'emulator-only'},`qm-${uid}`);apps.push(app);const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8289,{mockUserToken:{sub:uid,user_id:uid}});return store};
const service=createQuickMatchService({db,FieldValue,Timestamp,HttpsError,clock:()=>now,createId:()=>`call_${++seq}`,createRtc:(id,c,h)=>({channelName:`test_${id}`,uids:{[c]:1,[h]:2}})});
async function main(){for(const value of [consumer('c'),consumer('p',{creatorApplication:{status:'pending'}}),consumer('demo',{isDemo:true}),consumer('stale'),host('h1'),host('h2'),host('h3'),host('h4'),host('off','offline'),host('busy','busy')])await db.doc(`users/${value.uid}`).set(value);for(const uid of ['c','p','demo','stale'])await db.doc(`consumerRewards/${uid}`).set({quickMatchCount:2,quickMatchReserved:0,freeVideoSeconds:12});
 const before=(await db.doc('users/c').get()).data();const [a,b]=await Promise.all([service.start('c',{requestId:'request_001',termsVersion:'automatic-paid-v3'}),service.start('c',{requestId:'request_001',termsVersion:'automatic-paid-v3'})]);check(a.requestId,'request_001');check(b.requestId,'request_001');check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,1);check((await db.collection('quickMatchRequests/c/requests').get()).size,1);check(a.host,null);check(a.fundingSource,'entitlement');check(a.introSeconds,20);
 const second=await service.start('c',{requestId:'request_002',termsVersion:'automatic-paid-v3'});check(second.requestId,'request_001');check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,1);
 const raw=(await db.doc('quickMatchRequests/c/requests/request_001').get()).data();check(raw.candidateIds.length,3);check(raw.candidateIds.includes('off'),false);check(raw.candidateIds.includes('busy'),false);
 const offer=await service.offer(raw.offeredHostId,{});check(offer.offer.context,'quick_match');check(offer.offer.consumerUid,'c');check(Object.hasOwn(offer.offer.identity,'wallet'),false);
 await reject(service.respond('h4',{consumerUid:'c',requestId:'request_001',action:'accept'}),'permission-denied');const blockedNext=raw.candidateIds[1];await db.doc(`users/c/blocked/${blockedNext}`).set({blockedUid:blockedNext});const declined=await service.respond(raw.offeredHostId,{consumerUid:'c',requestId:'request_001',action:'decline'});check(declined.status,'offering');check((await db.doc('quickMatchRequests/c/requests/request_001').get()).data().offeredHostId,raw.candidateIds[2]);await db.doc(`users/c/blocked/${blockedNext}`).delete();check((await db.doc('consumerRewards/c').get()).data().quickMatchCount,2);check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,1);
 const current=(await db.doc('quickMatchRequests/c/requests/request_001').get()).data(),accepted=await service.respond(current.offeredHostId,{consumerUid:'c',requestId:'request_001',action:'accept'});check(accepted.status,'connecting');check(Boolean(accepted.callId),true);const acceptRetry=await service.respond(current.offeredHostId,{consumerUid:'c',requestId:'request_001',action:'accept'});check(acceptRetry.idempotent,true);check(acceptRetry.callId,accepted.callId);check((await db.doc('consumerRewards/c').get()).data().quickMatchCount,2);check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,1);const call=(await db.doc(`calls/${accepted.callId}`).get()).data();check(call.source,'quick_match');check(call.quickMatchIntroSeconds,20);check(call.billingMode,'preview');check((await db.doc(`activeCallLocks/${current.offeredHostId}`).get()).exists,true);
 const cancelled=await service.cancel('c',{requestId:'request_001'});check(cancelled.status,'cancelled');check((await db.doc('consumerRewards/c').get()).data().quickMatchCount,2);check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,0);check((await db.doc(`activeCallLocks/${current.offeredHostId}`).get()).exists,false);check((await db.doc('users/c').get()).data().wallet,before.wallet);check((await db.doc('users/c').get()).data().level,before.level);check((await db.doc('users/c').get()).data().lifetimeQualifyingPurchasedCredits,before.lifetimeQualifyingPurchasedCredits);
 check((await service.start('p',{requestId:'pending_001',termsVersion:'automatic-paid-v3'})).status,'offering');await reject(service.start('h1',{requestId:'host_req1',termsVersion:'automatic-paid-v3'}),'permission-denied');await reject(service.start('demo',{requestId:'demo_req',termsVersion:'automatic-paid-v3'}),'permission-denied');check(Q.consume({quickMatchCount:2,quickMatchReserved:1}),{quickMatchCount:1,quickMatchReserved:0});check(Q.release({quickMatchCount:2,quickMatchReserved:1}),{quickMatchCount:2,quickMatchReserved:0});check(Object.hasOwn(Q,'PRICE'),false);
 // Delayed polling must not issue a fresh offer after the request deadline.
 const expiring=await service.start('c',{requestId:'expired_poll',termsVersion:'automatic-paid-v3'});
 const expiredRaw=(await db.doc('quickMatchRequests/c/requests/expired_poll').get()).data();
 now=expiredRaw.expiresAtMs+1;
 const expiredResult=await service.state('c',{});check(expiredResult.status,'expired');
 check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,0);
 check((await db.doc('consumerRewards/c').get()).data().quickMatchCount,2);
 check((await db.doc('quickMatchActive/c').get()).exists,false);
 // An offer deadline extending past overall expiry cannot authorize acceptance.
 await service.start('c',{requestId:'expired_accept',termsVersion:'automatic-paid-v3'});
 const acceptRef=db.doc('quickMatchRequests/c/requests/expired_accept'),acceptRaw=(await acceptRef.get()).data();
 await acceptRef.update({offerDeadlineMs:acceptRaw.expiresAtMs+20000});
 now=acceptRaw.expiresAtMs+1;
 check((await service.offer(acceptRaw.offeredHostId,{})).offer,null);
 check((await service.respond(acceptRaw.offeredHostId,{consumerUid:'c',requestId:'expired_accept',action:'accept'})).status,'expired');
 check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,0);
 check((await db.doc('consumerRewards/c').get()).data().quickMatchCount,2);
 // Review regressions use real transaction contention and a spare reservation
 // sentinel, so a second release cannot be hidden by the zero clamp.
 await service.cancel('p',{requestId:'pending_001'});
 const beginReview=async id=>{
   await db.doc('consumerRewards/c').set({quickMatchCount:3,quickMatchReserved:0,freeVideoSeconds:12});
   await service.start('c',{requestId:id,termsVersion:'automatic-paid-v3'});
   const ref=db.doc(`quickMatchRequests/c/requests/${id}`);
   return {ref,raw:(await ref.get()).data()};
 };
 for(const path of ['poll','accept','cancel','reconcile']){
   const {ref,raw}=await beginReview(`expiry_${path}`);
   await ref.update({offerDeadlineMs:raw.expiresAtMs+20000});
   await db.doc('quickMatchActive/c').update({offerDeadlineMs:raw.expiresAtMs+20000});
   await db.doc('consumerRewards/c').update({quickMatchReserved:2});
   now=raw.expiresAtMs;
   const result=path==='poll'?await service.state('c'):path==='accept'?await service.respond(raw.offeredHostId,{consumerUid:'c',requestId:raw.requestId,action:'accept'}):await service[path]('c',{requestId:raw.requestId});
   check(result.status,'expired');
   const expired=(await ref.get()).data();
   check([expired.status,expired.endReason,expired.fundingStatus,expired.attemptIndex,expired.callId],['expired','request_expired','released',0,null]);
   check((await db.doc('quickMatchActive/c').get()).exists,false);
   await Promise.all([service.state('c'),service.cancel('c',{requestId:raw.requestId}),service.reconcile('c',{requestId:raw.requestId})]);
   const reward=(await db.doc('consumerRewards/c').get()).data();
   check([reward.quickMatchCount,reward.quickMatchReserved],[3,1]);
 }
 {
   const {ref,raw}=await beginReview('concurrent_expiry');
   await ref.update({offerDeadlineMs:raw.expiresAtMs+20000});
   await db.doc('quickMatchActive/c').update({offerDeadlineMs:raw.expiresAtMs+20000});
   await db.doc('consumerRewards/c').update({quickMatchReserved:2});
   now=raw.expiresAtMs;
   const callsBefore=(await db.collection('calls').get()).size;
   const results=await Promise.all(Array.from({length:8},()=>service.state('c')));
   check(results.every(result=>['expired','idle'].includes(result.status)),true);
   check(results.some(result=>result.status==='expired'),true);
   const expired=(await ref.get()).data(),reward=(await db.doc('consumerRewards/c').get()).data();
   check([expired.status,expired.endReason,expired.attemptIndex],['expired','request_expired',0]);
   check([reward.quickMatchCount,reward.quickMatchReserved],[3,1]);
   check((await db.collection('calls').get()).size,callsBefore);
   check((await db.doc('quickMatchActive/c').get()).exists,false);
   // A terminal request must not release a later request's reservation.
   await service.start('c',{requestId:'after_expiry',termsVersion:'automatic-paid-v3'});
   await Promise.all([service.cancel('c',{requestId:raw.requestId}),service.reconcile('c',{requestId:raw.requestId})]);
   check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,2);
   check((await db.doc('quickMatchActive/c').get()).data().requestId,'after_expiry');
   await service.cancel('c',{requestId:'after_expiry'});
 }
 for(const path of ['poll','decline','timed_out_accept']){
   const {ref,raw}=await beginReview(`deadline_${path}`);
   now=raw.expiresAtMs-1000;
   if(path==='poll')await service.state('c');
   else await service.respond(raw.offeredHostId,{consumerUid:'c',requestId:raw.requestId,action:path==='decline'?'decline':'accept'});
   const next=(await ref.get()).data();
   check([next.status,next.attemptIndex,next.offerDeadlineMs],['offering',1,raw.expiresAtMs]);
   check((await db.doc('quickMatchActive/c').get()).data().offerDeadlineMs,raw.expiresAtMs);
   check((await service.offer(next.offeredHostId)).offer.deadlineMs,raw.expiresAtMs);
   await service.cancel('c',{requestId:raw.requestId});
 }
 {
   const {ref,raw}=await beginReview('stale_poll_accept');
   const callOptions={db,FieldValue,Timestamp,HttpsError,clock:()=>now};
   let release,observed;
   const held=new Promise(resolve=>{release=resolve;}),ready=new Promise(resolve=>{observed=resolve;});
   const heldDb={runTransaction:db.runTransaction.bind(db)};
   // Only the initial nontransactional read is held; transaction reads need
   // genuine DocumentReferences for Firestore's concurrency/version checks.
   let firstRead=true;
   heldDb.doc=path=>{const reference=db.doc(path);if(path==='quickMatchActive/c'&&firstRead){firstRead=false;return {get:async()=>{const snap=await reference.get();observed();await held;return snap;}};}return reference;};
   now=raw.offerDeadlineMs;
   const poll=createQuickMatchService({...callOptions,db:heldDb}).state('c');
   await ready;
   await service.respond(raw.offeredHostId,{consumerUid:'c',requestId:raw.requestId,action:'decline'});
   const next=(await ref.get()).data(),accepted=await service.respond(next.offeredHostId,{consumerUid:'c',requestId:raw.requestId,action:'accept'});
   now=raw.expiresAtMs+1;release();
   check((await poll).status,'connecting');
   for(const status of ['accepted','connecting','connected']){
     await db.doc(`calls/${accepted.callId}`).update({status:status==='accepted'?'connecting':status});
     const callBefore=(await db.doc(`calls/${accepted.callId}`).get()).data();
     await ref.update({status,fundingStatus:status==='connected'?'consumed':'reserved'});
     await db.doc('quickMatchActive/c').update({status,fundingStatus:status==='connected'?'consumed':'reserved'});
     await db.doc('consumerRewards/c').update({quickMatchCount:status==='connected'?2:3,quickMatchReserved:status==='connected'?0:1});
     const rewardBefore=(await db.doc('consumerRewards/c').get()).data();
     check((await service.reconcile('c',{requestId:raw.requestId})).status,status);
     check((await service.state('c')).status,status);
     const replay=await service.respond(next.offeredHostId,{consumerUid:'c',requestId:raw.requestId,action:'accept'});
     check([replay.status,replay.callId,replay.idempotent],[status,accepted.callId,true]);
     if(status==='connected')await reject(service.cancel('c',{requestId:raw.requestId}),'failed-precondition');
     check((await db.doc(`calls/${accepted.callId}`).get()).data(),callBefore);
     check((await db.doc('consumerRewards/c').get()).data(),rewardBefore);
     check((await db.doc('activeCallLocks/c').get()).data().callId,accepted.callId);
   }
   // Restore the real connecting state solely to use ordinary explicit cleanup.
   await db.doc(`calls/${accepted.callId}`).update({status:'connecting'});
   await ref.update({status:'connecting',fundingStatus:'reserved'});
   await db.doc('quickMatchActive/c').update({status:'connecting',fundingStatus:'reserved'});
   await db.doc('consumerRewards/c').update({quickMatchReserved:1});
   check((await service.cancel('c',{requestId:raw.requestId})).status,'cancelled');
 }
 {
   const {ref,raw}=await beginReview('not_yet_expired');
   check((await service.reconcile('c',{requestId:raw.requestId})).status,'offering');
   check((await ref.get()).data().fundingStatus,'reserved');
   check((await db.doc('consumerRewards/c').get()).data().quickMatchReserved,1);
   await service.cancel('c',{requestId:raw.requestId});
 }
 const staleStart=await service.start('stale',{requestId:'stale_001',termsVersion:'automatic-paid-v3'});check(staleStart.status,'offering');const staleRaw=(await db.doc('quickMatchRequests/stale/requests/stale_001').get()).data();now=staleRaw.expiresAtMs+1;for(const uid of ['h1','h2','h3','h4'])await db.doc(`users/${uid}`).update({'hostStatus.availability':'offline'});const staleRetry=await service.start('stale',{requestId:'stale_002',termsVersion:'automatic-paid-v3'});check(staleRetry.status,'no_match');check((await db.doc('consumerRewards/stale').get()).data().quickMatchReserved,0);check((await db.doc('quickMatchRequests/stale/requests/stale_001').get()).data().status,'expired');check((await db.doc('quickMatchActive/stale').get()).exists,false);
 const c=client('c');for(const path of ['quickMatchConfig/current','quickMatchActive/c','quickMatchRequests/c/requests/forged']){await reject(getDoc(doc(c,path)),'permission-denied');await reject(setDoc(doc(c,path),{status:'connected',candidateIds:['h1'],price:1}),'permission-denied')}await reject(updateDoc(doc(c,'consumerRewards/c'),{quickMatchCount:99,quickMatchReserved:0}),'permission-denied');await reject(setDoc(doc(c,'activeCallLocks/c'),{callId:'forged'}),'permission-denied');
 console.log(`Authoritative Quick Match lifecycle: ${checks} checks passed (${projectId}, localhost only).`);
}
main().finally(()=>Promise.all([...apps.map(deleteApp),admin.deleteApp(server)])).catch(e=>{console.error(e);process.exitCode=1});
