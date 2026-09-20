'use strict';
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {defineSecret,defineString}=require('firebase-functions/params');
const {RtcTokenBuilder,RtcRole}=require('agora-token');
const crypto=require('node:crypto');
const D=require('./callDomain');
const {isConsumer}=require('./accountRole');
const P=require('./callPaymentLifecycle');
const E=require('./economyDomain');
const F=require('./freeVideoEntitlement');
const {createConsumerRewards}=require('./consumerRewards');
initializeApp(); const db=getFirestore();
const AGORA_APP_CERTIFICATE=defineSecret('AGORA_APP_CERTIFICATE');
const AGORA_APP_ID=defineString('AGORA_APP_ID');
const region='us-central1';
const callable={region,enforceAppCheck:false};
const recovery=require('./callRecovery').createCallRecovery({db,FieldValue,HttpsError});
const paymentLifecycle=P.createCallPaymentLifecycle({db,FieldValue,HttpsError,recovery});
const consumerRewards=createConsumerRewards({db,FieldValue,HttpsError});
const creditService=require('./creditService').createCreditService({db,FieldValue,HttpsError,packages:{}});
const socialMessaging=require('./socialMessaging').createSocialMessaging({db,FieldValue,HttpsError});
const giftService=require('./giftService').createGiftService({db,FieldValue,HttpsError});
const vipService=require('./vipService').createVipService({db,FieldValue,Timestamp,HttpsError});
const quickMatchService=require('./quickMatchService').createQuickMatchService({db,FieldValue,Timestamp,HttpsError,
  createRtc:(callId,consumerUid,hostUid)=>{let consumerRtcUid=randomRtcUid(),hostRtcUid=randomRtcUid();while(hostRtcUid===consumerRtcUid)hostRtcUid=randomRtcUid();return {channelName:`amira_${callId}_${crypto.randomBytes(8).toString('hex')}`,uids:{[consumerUid]:consumerRtcUid,[hostUid]:hostRtcUid}};}});
const requireAuth=(request)=>{if(!request.auth?.uid)throw new HttpsError('unauthenticated','Sign in is required.');return request.auth.uid;};
const textId=(value,name)=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value))throw new HttpsError('invalid-argument',`Invalid ${name}.`);return value;};
const mapError=(error)=>{if(error instanceof HttpsError)return error;const code={
  'self-call':'invalid-argument','unapproved-creator':'failed-precondition','creator-unavailable':'failed-precondition',blocked:'permission-denied','active-call-conflict':'already-exists','not-receiver':'permission-denied','not-ringable':'failed-precondition','not-participant':'permission-denied','demo-profile':'failed-precondition',
}[error.message]||'failed-precondition';return new HttpsError(code,({blocked:'Calls are unavailable for this connection.','active-call-conflict':'A participant is already in another call.','creator-unavailable':'Creator unavailable.','unapproved-creator':'Creator is not approved for calls.','not-ringable':'This call can no longer be answered.','not-participant':'You are not a participant in this call.','self-call':'You cannot call yourself.','demo-profile':'Demo profiles cannot use production calling.'}[error.message]||'The call request could not be completed.'));};
const blockedRefs=(a,b)=>[db.doc(`users/${a}/blocked/${b}`),db.doc(`users/${b}/blocked/${a}`)];
const randomRtcUid=()=>crypto.randomInt(1,2147483647);
const callResult=(id,data)=>({callId:id,status:data.status,callerId:data.callerId,receiverId:data.receiverId,participantIds:data.participantIds,ratePerMinute:data.ratePerMinute,previewEligible:data.previewEligible,billingMode:data.billingMode,expiresAtMs:data.expiresAtMs});

exports.startVideoCall=onCall(callable,async(request)=>{try{const callerId=requireAuth(request),creatorId=textId(request.data?.creatorId,'creatorId');await recovery.recoverLock(callerId);await recovery.recoverLock(creatorId);const callRef=db.collection('calls').doc(),callerRef=db.doc(`users/${callerId}`),creatorRef=db.doc(`users/${creatorId}`),callerLock=db.doc(`activeCallLocks/${callerId}`),creatorLock=db.doc(`activeCallLocks/${creatorId}`),entitlementRef=db.doc(`users/${callerId}/entitlements/dailyPreview`);return await db.runTransaction(async(tx)=>{const [callerSnap,creatorSnap,callerLockSnap,creatorLockSnap,entSnap,rewardsSnap,configSnap,...blocks]=await Promise.all([tx.get(callerRef),tx.get(creatorRef),tx.get(callerLock),tx.get(creatorLock),tx.get(entitlementRef),tx.get(db.doc('consumerRewards/'+callerId)),tx.get(db.doc('economyConfig/current')),...blockedRefs(callerId,creatorId).map((ref)=>tx.get(ref))]);const creator=creatorSnap.data();D.validateStart({authUid:callerId,creatorId,creator,blocked:blocks.some((s)=>s.exists),callerLock:callerLockSnap.exists,creatorLock:creatorLockSnap.exists});if(!callerSnap.exists)throw new Error('caller-missing');if(!isConsumer(callerSnap.data()))throw new HttpsError('permission-denied','Only consumers can start paid host calls.');const rate=creator.hostProfile?.videoRateCredits;if(!Number.isInteger(rate)||rate<=0)throw new Error('invalid-rate');const now=Date.now(),dateKey=D.utcDateKey(),eligible=D.previewEligible(entSnap.data(),dateKey),channelName=`amira_${callRef.id}_${crypto.randomBytes(8).toString('hex')}`;const entry=require('./callPreflight').callPreflight({caller:callerSnap.data(),rate,dailyEligible:eligible,rewards:rewardsSnap.data(),config:configSnap.data()});if(!entry.allowed)throw new HttpsError('resource-exhausted','You need Credits to start this video call.',{reason:'insufficient_call_credits',ratePerMinute:rate,minimumCredits:entry.minimumCredits});let callerRtcUid=randomRtcUid(),creatorRtcUid=randomRtcUid();while(creatorRtcUid===callerRtcUid)creatorRtcUid=randomRtcUid();const data={accountingVersion:2,id:callRef.id,callerId,receiverId:creatorId,participantIds:[callerId,creatorId],status:'ringing',createdAt:FieldValue.serverTimestamp(),createdAtMs:now,expiresAt:Timestamp.fromMillis(now+D.RING_TIMEOUT_SECONDS*1000),expiresAtMs:now+D.RING_TIMEOUT_SECONDS*1000,acceptedAt:null,connectedAt:null,endedAt:null,durationSeconds:0,paidDurationSeconds:0,ratePerMinute:rate,previewEligible:eligible,previewConsumed:false,billingMode:eligible?D.BILLING_MODES.PREVIEW:D.BILLING_MODES.AWAITING_PAID_CONFIRMATION,billedCredits:0,settledIncrements:0,paidStartedAt:null,paidStartedAtMs:null,endedBy:null,endReason:null,rtc:{channelName,uids:{[callerId]:callerRtcUid,[creatorId]:creatorRtcUid}},rtcAcks:{},lastRtcPresenceAt:null};tx.create(callRef,data);const lock={callId:callRef.id,createdAt:FieldValue.serverTimestamp(),expiresAtMs:data.expiresAtMs};tx.create(callerLock,lock);tx.create(creatorLock,lock);return callResult(callRef.id,data);});}catch(e){throw mapError(e);}});

exports.respondToVideoCall=onCall(callable,async(request)=>{try{const uid=requireAuth(request),callId=textId(request.data?.callId,'callId'),action=request.data?.action;if(!['accept','decline'].includes(action))throw new HttpsError('invalid-argument','Action must be accept or decline.');const callRef=db.doc(`calls/${callId}`);return await db.runTransaction(async(tx)=>{const callSnap=await tx.get(callRef);if(!callSnap.exists)throw new HttpsError('not-found','Call not found.');const call=callSnap.data(),creatorRef=db.doc(`users/${call.receiverId}`),creatorSnap=await tx.get(creatorRef);D.validateAcceptance({authUid:uid,call,creator:creatorSnap.data()});const lockRefs=call.participantIds.map(id=>db.doc(`activeCallLocks/${id}`)),lockSnaps=await Promise.all(lockRefs.map(ref=>tx.get(ref)));if(action==='decline'){tx.update(callRef,{status:'rejected',endedAt:FieldValue.serverTimestamp(),endedBy:uid,endReason:'declined',billingMode:D.BILLING_MODES.ENDED});tx.set(db.doc(`callHistory/${callId}`),{callId,participantIds:call.participantIds,callerId:call.callerId,receiverId:call.receiverId,createdAt:call.createdAt,endedAt:FieldValue.serverTimestamp(),durationSeconds:0,paidDurationSeconds:0,ratePerMinute:call.ratePerMinute,billedCredits:0,billingMode:call.billingMode,previewConsumed:false,endReason:'declined',status:'rejected'});lockSnaps.forEach((lock,i)=>{if(lock.data()?.callId===callId)tx.delete(lockRefs[i]);});return {callId,status:'rejected'};}tx.update(db.doc(`activeCallLocks/${call.callerId}`),{expiresAtMs:Date.now()+require('./connectionAccounting').CONNECTING_TIMEOUT_MS});tx.update(db.doc(`activeCallLocks/${call.receiverId}`),{expiresAtMs:Date.now()+require('./connectionAccounting').CONNECTING_TIMEOUT_MS});tx.update(callRef,{status:'connecting',acceptedAt:FieldValue.serverTimestamp(),connectingDeadlineMs:Date.now()+require('./connectionAccounting').CONNECTING_TIMEOUT_MS,expiresAtMs:Date.now()+require('./connectionAccounting').CONNECTING_TIMEOUT_MS});tx.update(creatorRef,{'hostStatus.availability':'busy','hostStatus.preCallAvailability':creatorSnap.data().hostStatus?.availability||'online'});return {callId,status:'connecting'};});}catch(e){throw mapError(e);}});

exports.getVideoCallRtcCredentials=onCall({...callable,secrets:[AGORA_APP_CERTIFICATE]},async(request)=>{try{const uid=requireAuth(request),callId=textId(request.data?.callId,'callId'),appId=AGORA_APP_ID.value(),certificate=AGORA_APP_CERTIFICATE.value();if(!appId||!certificate)throw new HttpsError('failed-precondition','Video calling is temporarily unavailable.');const snap=await db.doc(`calls/${callId}`).get();if(!snap.exists)throw new HttpsError('not-found','Call not found.');const call=snap.data();D.assertParticipant(uid,call);if(!['connecting','connected','reconnecting'].includes(call.status))throw new HttpsError('failed-precondition','RTC access is not authorized for this call.');const rtcUid=D.sanitizeRtcUid(call.rtc?.uids?.[uid]),expiresAt=Math.floor(Date.now()/1000)+D.RTC_TOKEN_SECONDS,token=RtcTokenBuilder.buildTokenWithUid(appId,certificate,call.rtc.channelName,rtcUid,RtcRole.PUBLISHER,D.RTC_TOKEN_SECONDS,D.RTC_TOKEN_SECONDS);return {appId,channelName:call.rtc.channelName,token,rtcUid,expiresAt:expiresAt*1000};}catch(e){throw mapError(e);}});

exports.acknowledgeVideoConnected=onCall(callable,async(request)=>{try{const uid=requireAuth(request),callId=textId(request.data?.callId,'callId');return await db.runTransaction(async(tx)=>{const ref=db.doc(`calls/${callId}`),snap=await tx.get(ref);if(!snap.exists)throw new HttpsError('not-found','Call not found.');const call=snap.data();D.assertParticipant(uid,call);if(!['connecting','connected','reconnecting'].includes(call.status))throw new Error('invalid-state');if(['connected','reconnecting'].includes(call.status))return callResult(callId,call);if(Date.now()>=(call.connectingDeadlineMs||Infinity))throw new HttpsError('deadline-exceeded','Connection deadline expired.');const acks={...(call.rtcAcks||{}),[uid]:{remotePresent:true,atMs:Date.now()}},patch={rtcAcks:acks,lastRtcPresenceAt:FieldValue.serverTimestamp()};if(D.shouldConnect(acks,call.participantIds)&&call.participantIds.every(id=>Date.now()-acks[id].atMs<require('./connectionAccounting').CONNECTION_LEASE_MS)){const entitlementRef=db.doc(`users/${call.callerId}/entitlements/dailyPreview`),entSnap=await tx.get(entitlementRef),dateKey=D.utcDateKey(),eligible=call.source==='quick_match'?false:D.previewEligible(entSnap.data(),dateKey);const [rewardSnap,configSnap]=await Promise.all([tx.get(db.doc('consumerRewards/'+call.callerId)),tx.get(db.doc('economyConfig/current'))]);let allowance=F.selectFreeVideoAllowance({dailyEligible:eligible,rewards:rewardSnap.data(),config:configSnap.data()});if(call.source==='quick_match'){const Q=require('./quickMatchDomain'),requestRef=db.doc(`quickMatchRequests/${call.callerId}/requests/${call.quickMatchRequestId}`),activeRef=db.doc(`quickMatchActive/${call.callerId}`),requestSnap=await tx.get(requestRef);if(!requestSnap.exists||requestSnap.data()?.callId!==callId||requestSnap.data()?.fundingStatus!=='reserved')throw new HttpsError('failed-precondition','Quick Match reservation is unavailable.');const consumed=Q.consume(rewardSnap.data());tx.update(db.doc('consumerRewards/'+call.callerId),{...consumed,updatedAt:FieldValue.serverTimestamp()});tx.update(requestRef,{status:'connected',fundingStatus:'consumed',connectedAt:FieldValue.serverTimestamp()});tx.update(activeRef,{status:'connected',fundingStatus:'consumed',connectedAt:FieldValue.serverTimestamp()});allowance={freeVideoSource:allowance.freeVideoSource==='consumer_rewards'?'quick_match_intro_plus_rewards':'quick_match_intro',freeVideoAllowanceSeconds:Q.INTRO_SECONDS+allowance.freeVideoAllowanceSeconds,freeVideoRewardSeconds:allowance.freeVideoAllowanceSeconds};patch.quickMatchCommitted=true;}Object.assign(patch,allowance,{freeVideoConsumedSeconds:0});patch.status='connected';patch.connectedAt=FieldValue.serverTimestamp();patch.connectedAtMs=Date.now();if(call.accountingVersion===2)patch.connection={state:'connected',epoch:0,segmentStartedAtMs:patch.connectedAtMs,connectedMs:0,freeMs:0,paidMs:0,leaseUntilMs:patch.connectedAtMs+require('./connectionAccounting').CONNECTION_LEASE_MS,participants:Object.fromEntries(call.participantIds.map(id=>[id,{state:'connected',sequence:0,lastSeenAtMs:patch.connectedAtMs}]))};Object.assign(patch,P.connectedPaymentFields(patch.connectedAtMs,eligible,allowance.freeVideoAllowanceSeconds));if(call.accountingVersion===2)patch.expiresAtMs=patch.connection.leaseUntilMs;patch.previewEligible=allowance.freeVideoSource==='daily_preview';patch.previewConsumed=patch.previewEligible;patch.billingMode=allowance.freeVideoAllowanceSeconds>0?D.BILLING_MODES.PREVIEW:D.BILLING_MODES.AWAITING_PAID_CONFIRMATION;if(patch.previewConsumed)tx.set(entitlementRef,{dateKey,consumed:true,consumedAt:FieldValue.serverTimestamp(),callId},{merge:false});}tx.update(ref,patch);return {callId,status:patch.status||'connecting',billingMode:patch.billingMode||call.billingMode,previewEligible:patch.previewEligible??call.previewEligible};});}catch(e){throw mapError(e);}});

exports.syncVideoCallPaymentState=onCall(callable,async(request)=>{
  try { const uid=requireAuth(request),callId=textId(request.data?.callId,'callId');
    return await paymentLifecycle.synchronize(callId,uid);
  } catch(e) { throw mapError(e); }
});

exports.confirmPaidContinuation=onCall(callable,async(request)=>{
  try { const uid=requireAuth(request),callId=textId(request.data?.callId,'callId');
    return await paymentLifecycle.confirm(callId,uid);
  } catch(e) { throw mapError(e); }
});

exports.settleVideoCallIncrement=onCall(callable,async(request)=>{try{const uid=requireAuth(request),callId=textId(request.data?.callId,'callId');const current=await db.doc(`calls/${callId}`).get();if(current.data()?.accountingVersion===2)return await recovery.run(callId,uid,'settle');return await db.runTransaction(async(tx)=>{const callRef=db.doc(`calls/${callId}`),callSnap=await tx.get(callRef);if(!callSnap.exists)throw new HttpsError('not-found','Call not found.');const call=callSnap.data();D.assertParticipant(uid,call);if(call.status!=='connected'||call.billingMode!==D.BILLING_MODES.PAID)throw new HttpsError('failed-precondition','Paid billing is not active.');const next=(call.settledIncrements||0)+1,available=(call.paidSessionStartIncrement||0)+D.payableIncrementCount({paidStartedAtMs:call.paidStartedAtMs});if(next>available)return {settled:false,nextEligibleAtMs:call.paidStartedAtMs+(next-(call.paidSessionStartIncrement||0))*D.BILLING_INCREMENT_SECONDS*1000};const ledgerRef=db.doc(`creditTransactions/${D.settlementId(callId,next)}`),ledgerSnap=await tx.get(ledgerRef);if(ledgerSnap.exists)return {settled:true,idempotent:true,...ledgerSnap.data()};const consumerRef=db.doc(`users/${call.callerId}`),creatorRef=db.doc(`users/${call.receiverId}`),consumerSnap=await tx.get(consumerRef),creatorSnap=await tx.get(creatorRef),configSnap=await tx.get(db.doc('economyConfig/current')),hostAccountingRef=db.doc('hostEarnings/'+call.receiverId),platformAccountingRef=db.doc('platformRevenue/creditsEquivalent'),hostAccounting=await tx.get(hostAccountingRef),platformAccounting=await tx.get(platformAccountingRef),credits=D.incrementCredits(call.ratePerMinute),balance=consumerSnap.data()?.wallet?.creditBalance||0;if(balance<credits){tx.update(callRef,{...P.awaitingPaymentFields(Date.now()),endReason:'insufficient_credits'});return {settled:false,insufficientCredits:true};}const allocation=E.buildInteractionAllocation({grossCreditsSpent:credits,transactionType:'video_call_increment',consumerUid:call.callerId,hostUid:call.receiverId,sourceId:callId,createdAt:FieldValue.serverTimestamp(),idempotencyKey:ledgerRef.id,policy:E.economyPolicy(configSnap.data())});const ledger={...allocation,transactionId:ledgerRef.id,consumerId:call.callerId,creatorId:call.receiverId,callId,type:'video_call_increment',credits,grossCredits:credits,platformFeeCredits:allocation.platformFeeCredits,creatorNetCredits:allocation.hostShareCreditsEquivalent,commissionPolicy:allocation.commissionPolicyVersion,billingIncrement:next,idempotencyKey:ledgerRef.id,createdAt:FieldValue.serverTimestamp()};tx.update(consumerRef,{'wallet.creditBalance':balance-credits});tx.set(hostAccountingRef,{hostUid:call.receiverId,pendingCreditsEquivalent:E.nonnegativeInteger((hostAccounting.data()?.pendingCreditsEquivalent||0)+allocation.hostShareCreditsEquivalent),updatedAt:FieldValue.serverTimestamp()},{merge:true});tx.set(platformAccountingRef,{accruedCreditsEquivalent:E.nonnegativeInteger((platformAccounting.data()?.accruedCreditsEquivalent||0)+allocation.platformFeeCredits),updatedAt:FieldValue.serverTimestamp()},{merge:true});tx.create(ledgerRef,ledger);tx.update(callRef,{settledIncrements:next,billedCredits:(call.billedCredits||0)+credits,lastRtcPresenceAt:FieldValue.serverTimestamp()});return {settled:true,transactionId:ledgerRef.id,incrementNumber:next,credits,balance:balance-credits};});}catch(e){throw mapError(e);}});

exports.endVideoCall=onCall(callable,async(request)=>{try{const uid=requireAuth(request),callId=textId(request.data?.callId,'callId'),reason=String(request.data?.reason||'participant_ended').slice(0,64);const current=await db.doc(`calls/${callId}`).get();if(current.data()?.accountingVersion===2)return await recovery.run(callId,uid,'end',{reason});return await db.runTransaction(async(tx)=>{const callRef=db.doc(`calls/${callId}`),snap=await tx.get(callRef);if(!snap.exists)throw new HttpsError('not-found','Call not found.');const call=snap.data();D.assertParticipant(uid,call);if(D.TERMINAL_STATUSES.has(call.status))return {callId,status:call.status,idempotent:true,durationSeconds:call.durationSeconds||0,paidDurationSeconds:call.paidDurationSeconds||0,billedCredits:call.billedCredits||0};const creatorRef=db.doc(`users/${call.receiverId}`),creatorSnap=await tx.get(creatorRef),now=Date.now(),duration=call.connectedAtMs?Math.max(0,Math.floor((now-call.connectedAtMs)/1000)):0,paidDuration=call.paidStartedAtMs?Math.max(0,Math.floor((now-call.paidStartedAtMs)/1000)):0;const lockRefs=call.participantIds.map(id=>db.doc(`activeCallLocks/${id}`)),lockSnaps=await Promise.all(lockRefs.map(ref=>tx.get(ref)));const consumeFreeVideo=await F.prepareFreeVideoConsumption({tx,db,FieldValue,callRef,call,nowMs:now});consumeFreeVideo();tx.update(callRef,{status:'ended',billingMode:D.BILLING_MODES.ENDED,endedAt:FieldValue.serverTimestamp(),endedAtMs:now,endedBy:uid,endReason:reason,durationSeconds:duration,paidDurationSeconds:paidDuration});tx.set(db.doc(`callHistory/${callId}`),{callId,participantIds:call.participantIds,callerId:call.callerId,receiverId:call.receiverId,createdAt:call.createdAt,acceptedAt:call.acceptedAt,connectedAt:call.connectedAt,endedAt:FieldValue.serverTimestamp(),durationSeconds:duration,paidDurationSeconds:paidDuration,ratePerMinute:call.ratePerMinute,billedCredits:call.billedCredits||0,billingMode:call.billingMode,previewConsumed:call.previewConsumed===true,endReason:reason,status:'ended'},{merge:false});lockSnaps.forEach((lock,i)=>{if(lock.data()?.callId===callId)tx.delete(lockRefs[i]);});if(creatorSnap.exists&&creatorSnap.data().hostStatus?.availability==='busy'&&(!lockSnaps[call.participantIds.indexOf(call.receiverId)]?.exists||lockSnaps[call.participantIds.indexOf(call.receiverId)].data().callId===callId))tx.update(creatorRef,{'hostStatus.availability':creatorSnap.data().hostStatus?.preCallAvailability==='offline'?'offline':'online','hostStatus.preCallAvailability':FieldValue.delete()});return {callId,status:'ended',durationSeconds:duration,paidDurationSeconds:paidDuration,billedCredits:call.billedCredits||0};});}catch(e){throw mapError(e);}});

exports.reportVideoCallConnection=onCall(callable,async(request)=>{
  const uid=requireAuth(request),callId=textId(request.data?.callId,'callId');
  const {callId:ignored,...event}=request.data||{};
  return recovery.run(callId,uid,'event',event);
});
exports.reconcileExpiredVideoCalls=onSchedule({region,schedule:'every 1 minutes'},async()=>{
  const snapshot=await db.collection('calls').where('status','in',['requesting','ringing','connecting','connected','reconnecting']).where('expiresAtMs','<=',Date.now()).limit(200).get();
  for(const entry of snapshot.docs){
    if(entry.data().accountingVersion===2)await recovery.run(entry.id,null,'reconcile');
    else if(entry.data().status==='connected'){await paymentLifecycle.synchronize(entry.id);await recovery.run(entry.id,null,'reconcile');}
    else await recovery.run(entry.id,null,'reconcile');
  }
  // Page all locks: missing legacy expiry fields and healthy earlier pages
  // must not starve orphan recovery. Each deletion rechecks the referenced call.
  let cursor=null;
  do {
    let query=db.collection('activeCallLocks').orderBy('__name__').limit(200);
    if(cursor)query=query.startAfter(cursor);
    const page=await query.get();
    for(const entry of page.docs)await recovery.recoverLock(entry.id);
    cursor=page.docs.length===200?page.docs[page.docs.length-1]:null;
  } while(cursor);
  cursor=null;
  do {
    let query=db.collection('users').where('role','==','host').where('hostStatus.availability','==','busy').orderBy('__name__').limit(200);
    if(cursor)query=query.startAfter(cursor);
    const page=await query.get();
    for(const entry of page.docs)await recovery.recoverLock(entry.id);
    cursor=page.docs.length===200?page.docs[page.docs.length-1]:null;
  } while(cursor);
});

exports.getConsumerRewards=onCall(callable,async(request)=>{
  try { return await consumerRewards.dashboard(requireAuth(request)); } catch(e) { throw mapError(e); }
});
exports.claimDailyCheckIn=onCall(callable,async(request)=>{
  try { return await consumerRewards.claim(requireAuth(request)); } catch(e) { throw mapError(e); }
});
exports.getCreditWallet=onCall(callable,request=>creditService.wallet(requireAuth(request),request.data||{}));
exports.listCreditHistory=onCall(callable,request=>creditService.history(requireAuth(request),request.data||{}));
exports.initializeCreditRecharge=onCall(callable,request=>creditService.initialize(requireAuth(request),request.data||{}));
exports.verifyCreditRecharge=onCall(callable,request=>creditService.verify(requireAuth(request),request.data||{},async()=>{
  throw new HttpsError('failed-precondition','Recharge verification is not configured.');
}));
exports._test={mapError};

const publicIdentity=require('./publicIdentity').createPublicIdentity({db,HttpsError});
exports.getRelationshipCapability=onCall(callable,request=>publicIdentity.relationship(requireAuth(request),request.data));
exports.getMessageIdentity=onCall(callable,request=>publicIdentity.message(requireAuth(request),request.data));
exports.getCallParticipantIdentities=onCall(callable,request=>publicIdentity.calls(requireAuth(request),request.data));
exports.listOwnedBlockedIdentities=onCall(callable,request=>publicIdentity.blockedProfiles(requireAuth(request),request.data));

exports.sendTextMessage=onCall(callable,(request)=>socialMessaging.sendText(requireAuth(request),request.data));
exports.trackProfileView=onCall(callable,async(request)=>{const uid=requireAuth(request),data=request.data;if(!data||data.context!=='full_profile'||Object.keys(data).some(key=>!['ownerUid','context'].includes(key)))throw new HttpsError('invalid-argument','Invalid profile view request.');return socialMessaging.trackProfileView(uid,data.ownerUid);});
exports.listProfileViews=onCall(callable,async(request)=>{const uid=requireAuth(request);if(request.data&&Object.keys(request.data).length)throw new HttpsError('invalid-argument','Profile view information is private.');return socialMessaging.listProfileViews(uid);});
exports.syncFriendship=onCall(callable,(request)=>socialMessaging.syncFriendship(requireAuth(request),request.data?.targetUid));
// Trigger retries and out-of-order deliveries re-read both current follow records.
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
exports.onFollowFriendship=onDocumentWritten({region,document:'users/{uid}/following/{targetUid}',retry:true},async(event)=>{
  try { await socialMessaging.syncFriendship(event.params.uid,event.params.targetUid); }
  catch(error) { if(!['not-found','permission-denied','invalid-argument'].includes(error.code)) throw error; }
});

exports.getChatAccess=onCall(callable,(request)=>socialMessaging.getChatAccess(requireAuth(request),request.data?.otherUid));
exports.getGiftCatalog=onCall(callable,request=>giftService.catalog(requireAuth(request),request.data||{}));
exports.sendGift=onCall(callable,request=>giftService.send(requireAuth(request),request.data||{}));
exports.getPublicHostGifts=onCall(callable,request=>{requireAuth(request);return giftService.publicAggregates(request.data?.hostUid);});
exports.getVipState=onCall(callable,request=>vipService.state(requireAuth(request),request.data||{}));
exports.getVipPlans=onCall(callable,request=>vipService.plans(requireAuth(request),request.data||{}));
exports.initializeVipPurchase=onCall(callable,request=>vipService.initialize(requireAuth(request),request.data||{}));
exports.verifyVipPurchase=onCall(callable,request=>vipService.verify(requireAuth(request),request.data||{},async()=>{throw new HttpsError('failed-precondition','VIP payment verification is not configured.');}));
exports.authorizeVipContent=onCall(callable,request=>vipService.contentAccess(requireAuth(request),request.data||{}));
exports.authorizePhotoMessage=onCall(callable,request=>vipService.photoAccess(requireAuth(request),request.data||{}));
exports.startQuickMatch=onCall(callable,request=>quickMatchService.start(requireAuth(request),request.data||{}));
exports.getQuickMatchState=onCall(callable,request=>quickMatchService.state(requireAuth(request),request.data||{}));
exports.getQuickMatchOffer=onCall(callable,request=>quickMatchService.offer(requireAuth(request),request.data||{}));
exports.respondToQuickMatch=onCall(callable,request=>quickMatchService.respond(requireAuth(request),request.data||{}));
exports.cancelQuickMatch=onCall(callable,request=>quickMatchService.cancel(requireAuth(request),request.data||{}));

const callReviews=require('./callReviews').createCallReviews({db,FieldValue,HttpsError});
exports.getCallReviewStatus=onCall(callable,(request)=>callReviews.status(requireAuth(request),request.data?.callId));
exports.submitCallReview=onCall(callable,(request)=>callReviews.submit(requireAuth(request),request.data));


const consumerLevels=require('./consumerLevels').createConsumerLevels({db,FieldValue,HttpsError});
exports.getMyAmiraLevel=onCall(callable,async(request)=>consumerLevels.snapshot(requireAuth(request)));
exports.claimAmiraLevelMilestone=onCall(callable,async(request)=>consumerLevels.claim(requireAuth(request),request.data));
exports.getConsumerAmiraLevel=onCall(callable,async(request)=>consumerLevels.publicLevel(requireAuth(request),request.data?.consumerUid));

const hostDiscovery=require('./hostDiscovery').createHostDiscovery({db,FieldValue,HttpsError});
exports.getDiscoveryHosts=onCall(callable,async(request)=>hostDiscovery.candidates(requireAuth(request),request.data?.tab));
exports.getPublicHostProfile=onCall(callable,async(request)=>hostDiscovery.profile(requireAuth(request),request.data?.hostId));
exports.setHostLike=onCall(callable,async(request)=>hostDiscovery.setLike(requireAuth(request),request.data));
exports.hideDiscoveryHost=onCall(callable,async(request)=>hostDiscovery.hide(requireAuth(request),request.data?.hostId));
exports.blockAndRemoveSocial=onCall(callable,async(request)=>hostDiscovery.cleanup(requireAuth(request),request.data?.targetUid,true));
// Re-read current blocks so delayed/retried events cannot erase new unblocked follows.
exports.onBlockRemoveSocial=onDocumentWritten({region,document:'users/{uid}/blocked/{blockedUid}',retry:true},async(event)=>{
  await hostDiscovery.cleanup(event.params.uid,event.params.blockedUid);
});

const hostActivity=require('./hostActivity').createHostActivity({db,HttpsError});
exports.getHostActivity=onCall(callable,async(request)=>hostActivity.list(requireAuth(request),request.data));
exports.getPublicConsumerProfile=onCall(callable,async(request)=>hostActivity.consumerProfile(requireAuth(request),request.data?.consumerUid));

const hostConnect=require('./hostConnect').createHostConnect({db,HttpsError});
exports.getHostAvailability=onCall(callable,async request=>hostConnect.availability(requireAuth(request),request.data));
exports.setHostAvailability=onCall(callable,async request=>hostConnect.setAvailability(requireAuth(request),request.data));
exports.getHostConnectConsumers=onCall(callable,async request=>hostConnect.discover(requireAuth(request),request.data));
exports.getHostConnectToday=onCall(callable,async request=>hostConnect.today(requireAuth(request),request.data));

const amiraIdentity=require('./amiraIdentity').createAmiraIdentity({db,FieldValue,HttpsError});
exports.ensureAmiraId=onCall(callable,async request=>{const uid=requireAuth(request);if(request.data!==undefined&&(!request.data||typeof request.data!=='object'||Array.isArray(request.data)||Object.keys(request.data).length))throw new HttpsError('invalid-argument','Invalid identity request.');return amiraIdentity.ensure(uid);});
