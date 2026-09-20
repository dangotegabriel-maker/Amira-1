'use strict';
const {isApprovedHost}=require('./accountRole');
const RING_TIMEOUT_SECONDS=30, PREVIEW_SECONDS=30, BILLING_INCREMENT_SECONDS=10, RTC_TOKEN_SECONDS=900, RECONNECT_GRACE_SECONDS=require('./callRecoveryConfig').RECONNECT_GRACE_SECONDS;
const PAID_DECISION_SECONDS = 60;
const ACTIVE_STATUSES=new Set(['requesting','ringing','accepted','connecting','connected']);
const TERMINAL_STATUSES=new Set(['ended','rejected','missed','cancelled','failed']);
const BILLING_MODES=Object.freeze({PREVIEW:'preview',AWAITING_PAID_CONFIRMATION:'awaiting_paid_confirmation',PAID:'paid',ENDED:'ended'});
const utcDateKey=(date=new Date())=>date.toISOString().slice(0,10);
const validRate=(rate)=>{if(!Number.isSafeInteger(rate)||rate<=0)throw new Error('invalid-rate');return rate;};
// Cumulative integer allocation guarantees that every six 10-second blocks
// equal the disclosed per-minute rate, including rates not divisible by six.
const cumulativeIncrementCredits=(rate,count)=>{validRate(rate);if(!Number.isSafeInteger(count)||count<0)throw new Error('invalid-increment');return Math.floor(rate*count/6);};
const incrementCreditsAt=(rate,index)=>{if(!Number.isSafeInteger(index)||index<1)throw new Error('invalid-increment');return cumulativeIncrementCredits(rate,index)-cumulativeIncrementCredits(rate,index-1);};
const incrementCredits=(rate)=>Math.ceil(validRate(rate)/6);
const validateStart=({authUid,creatorId,creator,blocked,callerLock,creatorLock})=>{if(!authUid)throw new Error('unauthenticated');if(!creatorId||authUid===creatorId)throw new Error('self-call');if(creator?.isDemo)throw new Error('demo-profile');if(!isApprovedHost(creator))throw new Error('unapproved-creator');if(creator?.hostStatus?.availability!=='online')throw new Error('creator-unavailable');if(blocked)throw new Error('blocked');if(callerLock||creatorLock)throw new Error('active-call-conflict');return true;};
const isExpired=(call,nowMs=Date.now())=>Number(call?.expiresAtMs||0)<=nowMs;
const validateAcceptance=({authUid,call,creator,nowMs=Date.now(),otherActiveCall=false})=>{if(!authUid||authUid!==call?.receiverId)throw new Error('not-receiver');if(!['requesting','ringing'].includes(call.status)||isExpired(call,nowMs))throw new Error('not-ringable');if(!isApprovedHost(creator)||creator?.hostStatus?.availability!=='online')throw new Error('creator-unavailable');if(otherActiveCall)throw new Error('active-call-conflict');return true;};
const assertParticipant=(uid,call)=>{if(!uid||!call?.participantIds?.includes(uid))throw new Error('not-participant');return true;};
const previewEligible=(entitlement,dateKey)=>!entitlement||entitlement.dateKey!==dateKey||entitlement.consumed!==true;
const shouldConnect=(acks,participantIds)=>participantIds.every((uid)=>acks?.[uid]?.remotePresent===true);
const payableIncrementCount=({paidStartedAtMs,nowMs=Date.now()})=>paidStartedAtMs?Math.max(0,Math.floor((nowMs-paidStartedAtMs)/1000/BILLING_INCREMENT_SECONDS)):0;
const connectedPaidIncrementCount=(paidMs)=>1+Math.max(0,Math.floor(Number(paidMs||0)/(BILLING_INCREMENT_SECONDS*1000)));
const validDisclosure=(call)=>call?.accountingVersion===3&&call?.economicsSnapshot?.automaticPaidContinuation===true
  && call.economicsSnapshot.disclosureAccepted===true&&Number.isSafeInteger(call.economicsSnapshot.consumerRatePerMinute)
  && call.economicsSnapshot.consumerRatePerMinute>0&&call.economicsSnapshot.billingIncrementSeconds===BILLING_INCREMENT_SECONDS;
const settlementId=(callId,incrementNumber)=>`${callId}_${incrementNumber}`;
const sanitizeRtcUid=(value)=>{const uid=Number(value);if(!Number.isInteger(uid)||uid<=0||uid>4294967295)throw new Error('invalid-rtc-uid');return uid;};
const requireAuthUid=(auth)=>{if(!auth?.uid)throw new Error('unauthenticated');return auth.uid;};
const authoritativeRate=(creator)=>{const rate=creator?.hostProfile?.videoRateCredits;if(!Number.isInteger(rate)||rate<=0)throw new Error('invalid-rate');return rate;};
const canSettle=({status,billingMode})=>status==='connected'&&billingMode===BILLING_MODES.PAID;
const debitWithoutDebt=(balance,credits)=>{if(!Number.isInteger(balance)||balance<credits)throw new Error('insufficient-credits');return balance-credits;};
const idempotentFinalize=(status)=>TERMINAL_STATUSES.has(status);
module.exports={PAID_DECISION_SECONDS,RING_TIMEOUT_SECONDS,PREVIEW_SECONDS,BILLING_INCREMENT_SECONDS,RTC_TOKEN_SECONDS,RECONNECT_GRACE_SECONDS,ACTIVE_STATUSES,TERMINAL_STATUSES,BILLING_MODES,utcDateKey,incrementCredits,incrementCreditsAt,cumulativeIncrementCredits,connectedPaidIncrementCount,validDisclosure,validateStart,isExpired,validateAcceptance,assertParticipant,previewEligible,shouldConnect,payableIncrementCount,settlementId,sanitizeRtcUid,requireAuthUid,authoritativeRate,canSettle,debitWithoutDebt,idempotentFinalize};
