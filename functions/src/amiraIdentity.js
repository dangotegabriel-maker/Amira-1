'use strict';
const {randomInt}=require('node:crypto');
const {validAmiraId,formatCandidate}=require('./amiraIdDomain');
const MAX_ATTEMPTS=20;
const createAmiraIdentity=({db,FieldValue,HttpsError,candidate=()=>formatCandidate(randomInt(1000000))})=>{
 const conflict=()=>{throw new HttpsError('failed-precondition','Account identity is unavailable. Contact support.');};
 const read=async(tx,uid,profile)=>{
  const reverse=await tx.get(db.collection('amiraIds').where('uid','==',uid).limit(2));
  if(reverse.docs.length>1)conflict();
  const has=Object.prototype.hasOwnProperty.call(profile,'amiraId'),existing=profile.amiraId;
  if(has&&!validAmiraId(existing))conflict();
  if(reverse.docs.length){const entry=reverse.docs[0];if(!validAmiraId(entry.id)||entry.data().uid!==uid||entry.data().version!==1||!Number.isFinite(entry.data().createdAt?.toMillis?.()??(entry.data().createdAt instanceof Date?entry.data().createdAt.getTime():NaN))||(has&&existing!==entry.id))conflict();return {id:entry.id,repair:!has};}
  if(has)conflict();
  return {id:null};
 };
 const ensure=async uid=>{
  if(typeof uid!=='string'||!uid||uid.length>128||uid.includes('/')||['.','..'].includes(uid))throw new HttpsError('invalid-argument','Account identity unavailable.');
  for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
   const next=candidate();if(!validAmiraId(next))throw new Error('Invalid server identity candidate.');
   const result=await db.runTransaction(async tx=>{
    const ref=db.doc(`users/${uid}`),person=await tx.get(ref);if(!person.exists||person.data().isDemo)throw new HttpsError('failed-precondition','Account identity is unavailable.');
    const current=await read(tx,uid,person.data());
    if(current.id){if(current.repair)tx.update(ref,{amiraId:current.id});return current.id;}
    const reservation=db.doc(`amiraIds/${next}`),taken=await tx.get(reservation);if(taken.exists)return null;
    tx.create(reservation,{uid,createdAt:FieldValue.serverTimestamp(),version:1});tx.update(ref,{amiraId:next});return next;
   });
   if(result)return {amiraId:result};
  }
  throw new HttpsError('resource-exhausted','Account identity is temporarily unavailable. Try again later.');
 };
 const publicId=async(uid,profile)=>{if(!validAmiraId(profile.amiraId))return null;try{return await db.runTransaction(async tx=>{const latest=await tx.get(db.doc(`users/${uid}`));if(!latest.exists||latest.data().isDemo||latest.data().amiraId!==profile.amiraId)return null;const current=await read(tx,uid,latest.data());return current.repair?null:current.id;});}catch(error){if(error.code==='failed-precondition')return null;throw error;}};
 return {ensure,publicId};
};
module.exports={createAmiraIdentity,MAX_ATTEMPTS};
