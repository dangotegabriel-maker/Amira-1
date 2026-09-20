'use strict';
const T=require('./rewardTaskDomain');
const E=require('./economyDomain');
const C=require('./creditDomain');
const {isConsumer}=require('./accountRole');
const {utcDateKey}=require('./callDomain');
const rewardEvidence=require('./rewardEvidence');
const M=require('./messageEntitlements');
const createConsumerRewardTasks=({db,FieldValue,HttpsError,clock=()=>Date.now()})=>{
 const fail=(code,message)=>{throw new HttpsError(code,message);};
 const eligible=user=>{if(!user.exists||!isConsumer(user.data())||user.data().isDemo)fail('permission-denied','Consumer tasks are unavailable.');return user.data();};
 const load=async uid=>{const [user,configSnap]=await Promise.all([db.doc(`users/${uid}`).get(),db.doc('consumerRewardConfig/current').get()]);const profile=eligible(user);let policy;try{policy=T.config(configSnap.exists?configSnap.data():null);}catch(_){policy={version:null,gettingStarted:[],daily:[],available:false};}
  const dateKey=utcDateKey(new Date(clock())),tasks=[...policy.gettingStarted,...policy.daily];
  const claims=await Promise.all(tasks.map(task=>db.doc(`consumerRewardClaims/${T.claimId(uid,task,dateKey)}`).get()));
  const states=await Promise.all(tasks.map(async(task,i)=>{const progress=await progressFor(uid,profile,task,dateKey);return safeTask(task,progress,claims[i].exists); }));
  return {dateKey,serverNowMs:clock(),configAvailable:policy.available,gettingStarted:states.filter(x=>x.scope==='getting_started'),daily:states.filter(x=>x.scope==='daily')};
 };
 const progressFor=async(uid,profile,task,dateKey)=>{
  const observe=async eventId=>db.runTransaction(async tx=>rewardEvidence.record(tx,db,FieldValue,{consumerUid:uid,criterion:task.criterion,eventId,occurredAtMs:clock()}));
  if(task.criterion==='COMPLETE_PROFILE'&&profile.isProfileComplete===true)await observe('profile_complete');
  if(task.criterion==='ADD_BIO'&&typeof profile.bio==='string'&&profile.bio.trim().length>0)await observe('bio_added');
  if(task.criterion==='FOLLOW_HOST'){
   const follows=await db.collection(`users/${uid}/following`).limit(100).get();
   for(const entry of follows.docs){const value=entry.data(),host=await db.doc(`users/${entry.id}`).get();if(value.consumerId===uid&&value.hostId===entry.id&&host.exists&&host.data()?.hostStatus?.isApproved===true&&!host.data()?.isDemo)await observe(entry.id);}
  }
  const period=task.scope==='daily'?dateKey:'all';
  const snap=await db.collection(`consumerRewardEvidence/${uid}/events`).where('period','==',period).limit(500).get();
  return Math.min(task.target,snap.docs.filter(entry=>entry.data().criterion===task.criterion).length);
 };
 const safeTask=(task,progress,claimed)=>({id:task.id,title:task.title,description:task.description,scope:task.scope,version:task.version,target:task.target,progress,claimed,claimable:!claimed&&progress>=task.target,reward:{...task.reward,description:T.rewardDescription(task.reward)}});
 const claim=async(uid,input={})=>{
  if(!input||typeof input.taskId!=='string'||!['getting_started','daily'].includes(input.scope)||Object.keys(input).some(k=>!['taskId','scope'].includes(k)))fail('invalid-argument','Invalid task claim.');
  const nowMs=clock(),dateKey=utcDateKey(new Date(nowMs)),configSnap=await db.doc('consumerRewardConfig/current').get();let policy;try{policy=T.config(configSnap.exists?configSnap.data():null);}catch(_){fail('failed-precondition','Reward configuration is unavailable.');}
  const task=[...(input.scope==='daily'?policy.daily:policy.gettingStarted)].find(x=>x.id===input.taskId);if(!task)fail('failed-precondition','Reward task is unavailable.');
  const userSnap=await db.doc(`users/${uid}`).get(),profile=eligible(userSnap),progress=await progressFor(uid,profile,task,dateKey);if(progress<task.target)fail('failed-precondition','Task is not complete.');
  const claimId=T.claimId(uid,task,dateKey),claimRef=db.doc(`consumerRewardClaims/${claimId}`);
  return db.runTransaction(async tx=>{const liveDateKey=utcDateKey(new Date(clock()));if(task.scope==='daily'&&liveDateKey!==dateKey)fail('failed-precondition','The Daily Task period changed. Refresh and try again.');const configNow=await tx.get(db.doc('consumerRewardConfig/current')),user=await tx.get(db.doc(`users/${uid}`)),existing=await tx.get(claimRef);eligible(user);let current;try{current=T.config(configNow.exists?configNow.data():null);}catch(_){fail('failed-precondition','Reward configuration is unavailable.');}const live=[...(task.scope==='daily'?current.daily:current.gettingStarted)].find(x=>x.id===task.id&&x.version===task.version);if(!live)fail('failed-precondition','Reward task changed before claim.');if(existing.exists)return {claimed:true,idempotent:true,task:safeTask(task,task.target,true)};
   const rewardRef=db.doc(`consumerRewards/${uid}`),rewardSnap=await tx.get(rewardRef),balances=E.normalizeRewards(rewardSnap.data());const next={...balances};
   if(task.reward.type==='FREE_MESSAGES')next.freeMessages+=task.reward.amount;
   else if(task.reward.type==='FREE_VIDEO_SECONDS')next.freeVideoSeconds+=task.reward.amount;
   else if(task.reward.type==='QUICK_MATCH_ENTITLEMENT')next.quickMatchCount+=task.reward.amount;
   else if(task.reward.type==='BONUS_CREDITS'){
    const walletRef=db.doc(`creditWallets/${uid}`),walletSnap=await tx.get(walletRef),total=C.integer(user.data()?.wallet?.creditBalance,'Compatibility balance'),wallet=C.readWallet(walletSnap.exists?walletSnap.data():null,uid,total),granted=C.grant(wallet,'bonus',task.reward.amount),ledgerRef=db.doc(`creditWallets/${uid}/ledger/reward_${claimId}`),ledger=await tx.get(ledgerRef);if(ledger.exists)fail('failed-precondition','Reward accounting is inconsistent.');const timestamp=FieldValue.serverTimestamp();tx.set(walletRef,{...granted,updatedAt:timestamp});tx.update(db.doc(`users/${uid}`),{'wallet.creditBalance':granted.totalBalance});tx.create(ledgerRef,{ownerUid:uid,type:'consumer_task_reward',direction:'credit',credits:task.reward.amount,bucket:'bonus',status:'succeeded',sourceReference:claimId,idempotencyKey:`consumer_reward:${claimId}`,balanceAfter:{total:granted.totalBalance,purchased:granted.purchasedCredits,bonus:granted.bonusCredits,legacy:granted.legacyCredits,unallocatedSpent:granted.unallocatedSpentCredits},createdAt:timestamp,version:1});
   }
   if(task.reward.type!=='BONUS_CREDITS'&&task.reward.type!=='NONE')tx.set(rewardRef,{...E.normalizeRewards(next),updatedAt:FieldValue.serverTimestamp()},{merge:true});
   if(task.reward.type==='FREE_MESSAGES')tx.create(db.doc(`consumerRewards/${uid}/messageTransactions/${M.eventId('task_reward',claimId)}`),M.transactionData({uid,delta:task.reward.amount,balance:next.freeMessages,source:'task_reward',sourceId:claimId,policyVersion:current.version,createdAt:FieldValue.serverTimestamp()}));
   tx.create(claimRef,{claimId,consumerUid:uid,taskId:task.id,scope:task.scope,taskVersion:task.version,configVersion:current.version,period:T.period(task.scope,dateKey),reward:task.reward,createdAt:FieldValue.serverTimestamp()});
   return {claimed:true,idempotent:false,task:safeTask(task,task.target,true),balances:next};
  });
 };
 return {dashboard:load,claim};
};
module.exports={createConsumerRewardTasks};
