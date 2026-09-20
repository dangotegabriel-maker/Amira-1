'use strict';
const crypto=require('node:crypto');
const INVITE_SECONDS=60,SPONSORED_SECONDS=30,DECAY_MS=6*60*60*1000,BASE_COOLDOWN_MS=60*60*1000,THRESHOLD=3;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(value);
const fingerprint=terms=>crypto.createHash('sha256').update(JSON.stringify({version:'sponsored-invite-v1',sponsoredSeconds:SPONSORED_SECONDS,baseRatePerMinute:terms.baseRatePerMinute,consumerRatePerMinute:terms.consumerRatePerMinute,vipPolicyVersion:terms.vipPolicyVersion||null,billingIncrementSeconds:10,automaticPaidContinuation:true})).digest('hex');
const decayed=(state={},now=Date.now())=>Math.max(0,(state.score||0)-Math.floor(Math.max(0,now-(state.lastSignalAtMs||now))/DECAY_MS));
const suppression=(state,now=Date.now())=>{const score=decayed(state,now),until=state?.suppressedUntilMs||0;return {score,suppressed:score>=THRESHOLD&&now<until,suppressedUntilMs:until};};
const signal=(state={},weight,now=Date.now())=>{const score=decayed(state,now)+weight;return {score,lastSignalAtMs:now,suppressedUntilMs:score>=THRESHOLD?now+Math.min(24*BASE_COOLDOWN_MS,score*BASE_COOLDOWN_MS):0,version:1};};
module.exports={INVITE_SECONDS,SPONSORED_SECONDS,DECAY_MS,BASE_COOLDOWN_MS,THRESHOLD,id,fingerprint,decayed,suppression,signal};
