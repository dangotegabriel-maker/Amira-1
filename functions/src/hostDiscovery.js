'use strict';
const {isConsumer,isApprovedHost}=require('./accountRole');
const {projectHost}=require('./hostDiscoveryDomain');
const CANDIDATE_LIMIT=60;
const createHostDiscovery=({db,FieldValue,HttpsError})=>{
 const identifier=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(value))throw new HttpsError('invalid-argument','Invalid profile.');return value;};
 const viewer=async uid=>{identifier(uid);const snap=await db.doc(`users/${uid}`).get();if(!snap.exists||!isConsumer(snap.data()))throw new HttpsError('permission-denied','Consumer discovery is unavailable.');return snap.data();};
 const pairReads=(tx,uid,target)=>Promise.all([tx.get(db.doc(`users/${uid}`)),tx.get(db.doc(`users/${target}`)),tx.get(db.doc(`users/${uid}/blocked/${target}`)),tx.get(db.doc(`users/${target}/blocked/${uid}`))]);
 const eligiblePair=snaps=>{if(!snaps[0].exists||!isConsumer(snaps[0].data())||!snaps[1].exists||!isApprovedHost(snaps[1].data())||snaps[1].data().isDemo||snaps[2].exists||snaps[3].exists)throw new HttpsError('permission-denied','This interaction is unavailable.');};
 const candidates=async(uid,tab='For You')=>{
  await viewer(uid);if(!['For You','New','Following'].includes(tab))throw new HttpsError('invalid-argument','Invalid discovery tab.');
  let docs;
  if(tab==='Following'){
   const follows=await db.collection(`users/${uid}/following`).limit(CANDIDATE_LIMIT).get();
   const ids=follows.docs.filter(entry=>entry.data().consumerId===uid && entry.data().hostId===entry.id).map(entry=>entry.id);
   docs=await Promise.all(ids.map(id=>db.doc(`users/${id}`).get()));
  }else docs=(await db.collection('users').where('hostStatus.isApproved','==',true).limit(CANDIDATE_LIMIT).get()).docs;
  const now=Date.now();
  const result=await Promise.all(docs.filter(entry=>entry.exists&&isApprovedHost(entry.data())&&!entry.data().isDemo).map(async entry=>{
   const [left,right,hidden,application]=await Promise.all([db.doc(`users/${uid}/blocked/${entry.id}`).get(),db.doc(`users/${entry.id}/blocked/${uid}`).get(),db.doc(`users/${uid}/discoveryHidden/${entry.id}`).get(),db.doc(`hostApplications/${entry.id}`).get()]);
   if(left.exists||right.exists||hidden.exists)return null;
   const host=projectHost(entry.id,entry.data(),application.data(),now);
   return tab==='New'&&(!host.hostApprovedAt||now-host.hostApprovedAt>14*86400000)?null:host;
  }));
  return result.filter(Boolean);
 };
 const count=async query=>(await query.count().get()).data().count;
 const profile=async(uid,target)=>{
  identifier(target);await viewer(uid);
  const snaps=await db.runTransaction(tx=>pairReads(tx,uid,target));eligiblePair(snaps);
  const [application,like,following,followers,followingCount,likes]=await Promise.all([
   db.doc(`hostApplications/${target}`).get(),db.doc(`users/${target}/likes/${uid}`).get(),db.doc(`users/${uid}/following/${target}`).get(),
   count(db.collectionGroup('following').where('hostId','==',target)),count(db.collection(`users/${target}/following`)),count(db.collection(`users/${target}/likes`))]);
  return {...projectHost(target,snaps[1].data(),application.data()),social:{liked:like.exists,following:following.exists,followers,followingCount,likes}};
 };
 const setLike=async(uid,input)=>{
  if(!input||Object.keys(input).some(key=>!['hostId','liked'].includes(key))||typeof input.liked!=='boolean')throw new HttpsError('invalid-argument','Invalid Like request.');
  identifier(uid);const target=identifier(input.hostId);if(uid===target)throw new HttpsError('invalid-argument','Choose another profile.');
  return db.runTransaction(async tx=>{
   const snaps=await pairReads(tx,uid,target);eligiblePair(snaps);
   const ref=db.doc(`users/${target}/likes/${uid}`),existing=await tx.get(ref);
   if(input.liked&&!existing.exists)tx.create(ref,{consumerId:uid,hostId:target,createdAt:FieldValue.serverTimestamp()});
   if(!input.liked&&existing.exists)tx.delete(ref);
   return {liked:input.liked,idempotent:existing.exists===input.liked};
  });
 };
 const hide=async(uid,target)=>{identifier(target);return db.runTransaction(async tx=>{const snaps=await pairReads(tx,uid,target);eligiblePair(snaps);tx.set(db.doc(`users/${uid}/discoveryHidden/${target}`),{hostId:target,createdAt:FieldValue.serverTimestamp()});return {hidden:true};});};
 const cleanup=async(uid,target,createBlock=false)=>{
  identifier(uid);identifier(target);if(uid===target)throw new HttpsError('invalid-argument','Choose another profile.');
  return db.runTransaction(async tx=>{
   const [left,right,person,other]=await Promise.all([tx.get(db.doc(`users/${uid}/blocked/${target}`)),tx.get(db.doc(`users/${target}/blocked/${uid}`)),tx.get(db.doc(`users/${uid}`)),tx.get(db.doc(`users/${target}`))]);
   if(createBlock&&(!person.exists||!other.exists))throw new HttpsError('not-found','Profile unavailable.');
   if(!createBlock&&!left.exists&&!right.exists)return {blocked:false};
   if(createBlock)tx.set(db.doc(`users/${uid}/blocked/${target}`),{blockedUid:target,createdAt:FieldValue.serverTimestamp()});
   tx.delete(db.doc(`users/${uid}/following/${target}`));tx.delete(db.doc(`users/${target}/following/${uid}`));
   tx.delete(db.doc(`users/${uid}/likes/${target}`));tx.delete(db.doc(`users/${target}/likes/${uid}`));
   return {blocked:true};
  });
 };
 return {candidates,profile,setLike,hide,cleanup};
};
module.exports={createHostDiscovery,CANDIDATE_LIMIT};
