'use strict';
const LEVELS=Object.freeze(Array.from({length:11},(_,level)=>level));
const DEFAULT_LEVEL_CONFIG=Object.freeze({thresholds:null,milestones:{}});
const qualifyingTotal=(account={})=>Number.isSafeInteger(account?.lifetimeQualifyingPurchasedCredits)&&account?.lifetimeQualifyingPurchasedCredits>=0?account?.lifetimeQualifyingPurchasedCredits:0;
const thresholdsConfigured=(config={})=>Array.isArray(config?.thresholds)&&config.thresholds.length===11&&config.thresholds[0]===0&&config.thresholds.every((value,index)=>Number.isSafeInteger(value)&&value>=0&&(index===0||value>config.thresholds[index-1]));
const deriveLevel=(account={},config=DEFAULT_LEVEL_CONFIG)=>{
 if(!thresholdsConfigured(config))return 0;
 const total=qualifyingTotal(account);
 return LEVELS.reduce((level,next)=>total>=config.thresholds[next]?next:level,0);
};
const milestoneReward=(config,level)=>{
 const reward=config.milestones?.[level];
 if(!thresholdsConfigured(config)||!Number.isInteger(level)||level<1||level>10||!reward)return null;
 const keys=Object.keys(reward);
 if(!keys.length||keys.some(key=>!['freeMessages','freeVideoSeconds','quickMatchCount'].includes(key)))throw new Error('Unsupported milestone reward.');
 if(keys.some(key=>!Number.isSafeInteger(reward[key])||reward[key]<0))throw new Error('Invalid milestone reward.');
 return keys.some(key=>reward[key]>0)?reward:null;
};
const storedTotal=(account={})=>{const value=account?.lifetimeQualifyingPurchasedCredits;if(value===undefined)return 0;if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid authoritative qualifying total.');return value;};
// Pure preparation contract, not a payment verifier or callable. Future trusted
// settlement must persist total and purchase receipt together in one transaction.
const recordVerifiedPurchase=(account,existing,{purchaseId,consumerUid,qualifyingCredits,verified})=>{
 if(verified!==true||typeof purchaseId!=='string'||!purchaseId||typeof consumerUid!=='string'||!consumerUid||!Number.isSafeInteger(qualifyingCredits)||qualifyingCredits<=0)throw new Error('Verified purchase required.');
 if(existing){if(existing.purchaseId!==purchaseId||existing.consumerUid!==consumerUid||existing.qualifyingCredits!==qualifyingCredits)throw new Error('Purchase identity mismatch.');return {account,purchase:existing,idempotent:true};}
 if(account?.consumerUid && account.consumerUid!==consumerUid)throw new Error('Account identity mismatch.');
 const total=storedTotal(account)+qualifyingCredits;if(!Number.isSafeInteger(total))throw new Error('Qualifying total overflow.');
 return {account:{...account,consumerUid,lifetimeQualifyingPurchasedCredits:total},purchase:{purchaseId,consumerUid,qualifyingCredits,reversedQualifyingCredits:0,reversals:{}},idempotent:false};
};
const reverseVerifiedPurchase=(account,purchase,{consumerUid,reversalId,qualifyingCredits,verified})=>{
 if(verified!==true||!purchase||purchase.consumerUid!==consumerUid||typeof reversalId!=='string'||!reversalId||!Number.isSafeInteger(qualifyingCredits)||qualifyingCredits<=0)throw new Error('Verified reversal required.');
 if(account?.consumerUid && account.consumerUid!==consumerUid)throw new Error('Account identity mismatch.');
 if(purchase.reversals?.[reversalId]!==undefined){if(purchase.reversals[reversalId]!==qualifyingCredits)throw new Error('Reversal identity mismatch.');return {account,purchase,idempotent:true};}
 if(!Number.isSafeInteger(purchase.qualifyingCredits)||!Number.isSafeInteger(purchase.reversedQualifyingCredits)||qualifyingCredits>purchase.qualifyingCredits-purchase.reversedQualifyingCredits||qualifyingCredits>storedTotal(account))throw new Error('Reversal exceeds purchase qualifying amount.');
 return {account:{...account,lifetimeQualifyingPurchasedCredits:storedTotal(account)-qualifyingCredits},purchase:{...purchase,reversedQualifyingCredits:purchase.reversedQualifyingCredits+qualifyingCredits,reversals:{...(purchase.reversals||{}),[reversalId]:qualifyingCredits}},idempotent:false};
};
module.exports={LEVELS,DEFAULT_LEVEL_CONFIG,qualifyingTotal,thresholdsConfigured,deriveLevel,milestoneReward,recordVerifiedPurchase,reverseVerifiedPurchase};
