'use strict';
const L=require('./levelDomain'), E=require('./economyDomain'), M=require('./messageEntitlements');
const {isConsumer,isApprovedHost}=require('./accountRole');
const createConsumerLevels=({db,FieldValue,HttpsError})=>{
 const auth=(uid)=>{if(!uid)throw new HttpsError('unauthenticated','Sign in required.');};
 const consumer=(profile)=>{if(!isConsumer(profile))throw new HttpsError('permission-denied','Amira Level is available to Consumers only.');};
 const snapshot=async(uid)=>{auth(uid);return db.runTransaction(async tx=>{
  const [user,account,config]=await Promise.all([tx.get(db.doc(`users/${uid}`)),tx.get(db.doc(`consumerLevels/${uid}`)),tx.get(db.doc('levelConfig/current'))]);
  consumer(user.data());const policy=config.data()||L.DEFAULT_LEVEL_CONFIG,level=L.deriveLevel(account.data(),policy);
  const configured=L.LEVELS.slice(1).flatMap(milestone=>{const reward=L.milestoneReward(policy,milestone);return reward?[{level:milestone,reward}]:[];});
  const claims=await Promise.all(configured.map(item=>tx.get(db.doc(`consumerLevels/${uid}/milestoneClaims/${item.level}`))));
  const milestones=configured.map((item,index)=>({...item,claimed:claims[index].exists,eligible:level>=item.level&&!claims[index].exists}));
  return {level,thresholdsConfigured:L.thresholdsConfigured(policy),milestones};
 });};
 const claim=async(uid,input={})=>{auth(uid);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='level')||!Number.isInteger(input.level)||input.level<1||input.level>10)throw new HttpsError('invalid-argument','Invalid milestone.');return db.runTransaction(async tx=>{
  const level=input.level,accountRef=db.doc(`consumerLevels/${uid}`),claimRef=db.doc(`consumerLevels/${uid}/milestoneClaims/${level}`),rewardRef=db.doc(`consumerRewards/${uid}`);
  const [user,account,config,previous,rewards]=await Promise.all([tx.get(db.doc(`users/${uid}`)),tx.get(accountRef),tx.get(db.doc('levelConfig/current')),tx.get(claimRef),tx.get(rewardRef)]);
  consumer(user.data());if(previous.exists)return {level,idempotent:true,reward:previous.data().reward};
  const policy=config.data()||L.DEFAULT_LEVEL_CONFIG,reward=L.milestoneReward(policy,level);
  if(!reward||L.deriveLevel(account.data(),policy)<level)throw new HttpsError('failed-precondition','This milestone is not available.');
  const balances=E.addRewards(rewards.data(),reward),sourceId=String(level),createdAt=FieldValue.serverTimestamp();
  const messageRef=db.doc(`consumerRewards/${uid}/messageTransactions/${M.eventId('level_milestone',sourceId)}`);
  if(reward.freeMessages>0 && (await tx.get(messageRef)).exists)throw new HttpsError('failed-precondition','Milestone accounting is inconsistent.');
  tx.set(rewardRef,{...balances,updatedAt:createdAt},{merge:true});
  tx.create(claimRef,{consumerUid:uid,level,reward,createdAt,configurationVersion:policy.version||null});
  if(reward.freeMessages>0)tx.create(messageRef,M.transactionData({uid,delta:reward.freeMessages,balance:balances.freeMessages,source:'level_milestone',sourceId,policyVersion:policy.version||'level',createdAt}));
  return {level,reward,idempotent:false};
 });};
 const publicLevel=async(uid,target)=>{auth(uid);if(typeof target!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(target))throw new HttpsError('invalid-argument','Invalid Consumer.');return db.runTransaction(async tx=>{
  const [viewer,person,account,config,left,right]=await Promise.all([tx.get(db.doc(`users/${uid}`)),tx.get(db.doc(`users/${target}`)),tx.get(db.doc(`consumerLevels/${target}`)),tx.get(db.doc('levelConfig/current')),tx.get(db.doc(`users/${uid}/blocked/${target}`)),tx.get(db.doc(`users/${target}/blocked/${uid}`))]);
  if(!person.exists)throw new HttpsError('not-found','Consumer not found.');consumer(person.data());
  if((uid!==target&&!isApprovedHost(viewer.data()))||left.exists||right.exists)throw new HttpsError('permission-denied','Level is unavailable.');
  return {level:L.deriveLevel(account.data(),config.data()||L.DEFAULT_LEVEL_CONFIG)};
 });};
 return {snapshot,claim,publicLevel};
};
module.exports={createConsumerLevels};
