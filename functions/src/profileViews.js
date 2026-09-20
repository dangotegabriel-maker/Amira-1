'use strict';
const {isConsumer,isApprovedHost}=require('./accountRole');
const D=require('./hostActivityDomain');
const V=require('./vipDomain');
const createProfileViews=({db,FieldValue,HttpsError,clock=()=>Date.now()})=>{
 const id=value=>{if(!D.validId(value))throw new HttpsError('invalid-argument','Invalid profile.');return value;};
 const track=async(viewerUid,ownerUid)=>{
  id(viewerUid);id(ownerUid);if(viewerUid===ownerUid)return {counted:false};
  return db.runTransaction(async tx=>{
   const [viewer,owner,left,right,previous]=await Promise.all([tx.get(db.doc(`users/${viewerUid}`)),tx.get(db.doc(`users/${ownerUid}`)),tx.get(db.doc(`users/${viewerUid}/blocked/${ownerUid}`)),tx.get(db.doc(`users/${ownerUid}/blocked/${viewerUid}`)),tx.get(db.doc(`users/${ownerUid}/profileViews/${viewerUid}`))]);
   if(!viewer.exists||!owner.exists||left.exists||right.exists)throw new HttpsError('permission-denied','Profile view unavailable.');
   const direction=D.viewDirection(viewer.data(),owner.data());
   if(!direction)throw new HttpsError('permission-denied','This profile view is unavailable.');
   if([viewer.data(),owner.data()].some(profile=>profile.isDemo||profile.isProfileComplete===false))return {counted:false};
   const nowMs=clock(),record=previous.data(),verified=D.verifiedView(record,direction,viewerUid,nowMs);
   if(verified&&nowMs-D.timestampMs(record.lastViewedAt)<D.VIEW_DEDUP_MS)return {counted:false};
   const now=FieldValue.serverTimestamp();
   tx.set(db.doc(`users/${ownerUid}/profileViews/${viewerUid}`),{viewerUid,ownerUid,direction,profileViewVersion:1,firstViewedAt:verified&&D.validTime(record.firstViewedAt,nowMs)!==null?record.firstViewedAt:now,lastViewedAt:now,viewCount:verified&&Number.isSafeInteger(record.viewCount)&&record.viewCount>0&&record.viewCount<Number.MAX_SAFE_INTEGER?record.viewCount+1:1});
   if(!previous.exists)tx.update(db.doc(`users/${ownerUid}`),{'profileViewStats.recentCount':(owner.data().profileViewStats?.recentCount||0)+1});
   return {counted:true};
  });
 };
 const list=async uid=>{
  id(uid);const owner=await db.doc(`users/${uid}`).get();if(!owner.exists)throw new HttpsError('permission-denied','Profile views unavailable.');
  if(!isConsumer(owner.data()))throw new HttpsError('permission-denied','Who Viewed Me is available to Consumers only.');
  const now=clock(),entitlement=await db.doc(`vipMemberships/${uid}`).get();
  const direction='host_to_consumer',reveal=V.active(entitlement.data(),owner.data(),now);
  const snapshot=await db.collection(`users/${uid}/profileViews`).orderBy('lastViewedAt','desc').limit(D.VIEW_LIMIT).get();
  const views=(await Promise.all(snapshot.docs.map(async entry=>{
   const record=entry.data();if(record.ownerUid!==uid||!D.validId(entry.id)||!D.verifiedView(record,direction,entry.id,now))return null;
   const [person,left,right]=await Promise.all([db.doc(`users/${entry.id}`).get(),db.doc(`users/${uid}/blocked/${entry.id}`).get(),db.doc(`users/${entry.id}/blocked/${uid}`).get()]);
   if(!person.exists||person.data().isDemo||left.exists||right.exists)return null;
   const eligibleViewer=direction==='consumer_to_host'?isConsumer(person.data()):isApprovedHost(person.data());
   if(!eligibleViewer)return null;
   return reveal?{viewerUid:entry.id,identity:D.publicIdentity(entry.id,person.data()),lastViewedAtMs:D.timestampMs(record.lastViewedAt),viewCount:record.viewCount}:{eligible:true};
  }))).filter(Boolean);
  if(reveal)views.sort((a,b)=>b.lastViewedAtMs-a.lastViewedAtMs||a.viewerUid.localeCompare(b.viewerUid));
  return {vipActive:reveal,locked:!reveal,count:views.length,countIsBounded:true,sourceLimit:D.VIEW_LIMIT,reveal,views:reveal?views:[]};
 };
 return {track,list};
};
module.exports={createProfileViews};
