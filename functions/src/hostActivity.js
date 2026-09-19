'use strict';
const {isApprovedHost,isConsumer}=require('./accountRole');
const D=require('./hostActivityDomain');
const createHostActivity=({db,HttpsError})=>{
 const id=value=>{if(!D.validId(value))throw new HttpsError('invalid-argument','Invalid profile.');return value;};
 const approved=async uid=>{id(uid);const owner=await db.doc(`users/${uid}`).get();if(!owner.exists||!isApprovedHost(owner.data())||owner.data().isDemo)throw new HttpsError('permission-denied','Activity is available to approved Hosts only.');};
 const consumerProfile=async(uid,target)=>{
  await approved(uid);id(target);if(uid===target)throw new HttpsError('permission-denied','Profile unavailable.');
  const profile=await db.runTransaction(async tx=>{const [person,left,right,vip]=await Promise.all([tx.get(db.doc(`users/${target}`)),tx.get(db.doc(`users/${uid}/blocked/${target}`)),tx.get(db.doc(`users/${target}/blocked/${uid}`)),tx.get(db.doc(`vipMemberships/${target}`))]);if(!person.exists||!isConsumer(person.data())||person.data().isDemo||left.exists||right.exists)throw new HttpsError('permission-denied','Profile unavailable.');return {...D.publicConsumerProfile(target,person.data(),Date.now()),vipActive:require('./vipDomain').active(vip.data(),person.data(),Date.now())};});
  return {...profile,amiraId:await require('./amiraIdentity').createAmiraIdentity({db,HttpsError}).publicId(target,(await db.doc(`users/${target}`).get()).data()||{})};
 };
 const list=async(uid,input={})=>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='tab')||(input.tab!==undefined&&!D.ACTIVITY_TABS.includes(input.tab)))throw new HttpsError('invalid-argument','Invalid activity request.');
  await approved(uid);const tab=input.tab||'All',now=Date.now();
  const types=tab==='All'?['Visitors','Likes','Followers','Gifts','Calls']:[tab];
  const queries={Visitors:()=>db.collection(`users/${uid}/profileViews`).orderBy('lastViewedAt','desc').limit(D.SOURCE_LIMIT).get(),Likes:()=>db.collection(`users/${uid}/likes`).orderBy('createdAt','desc').limit(D.SOURCE_LIMIT).get(),Followers:()=>db.collectionGroup('following').where('hostId','==',uid).limit(D.SOURCE_LIMIT).get(),Gifts:()=>db.collection(`hostEarnings/${uid}/giftTransactions`).limit(D.SOURCE_LIMIT).get(),Calls:()=>db.collection('callHistory').where('participantIds','array-contains',uid).orderBy('createdAt','desc').limit(D.SOURCE_LIMIT).get()};
  const snapshots=await Promise.all(types.map(type=>queries[type]()));
  const candidates=[];
  for(let index=0;index<types.length;index++)for(const entry of snapshots[index].docs){
   const type=types[index],record=entry.data();let actorUid,timestampMs,durationSeconds,giftName,earningCreditsEquivalent;
   if(type==='Visitors'){if(record.ownerUid!==uid||!D.verifiedView(record,'consumer_to_host',entry.id,now))continue;actorUid=entry.id;timestampMs=D.timestampMs(record.lastViewedAt);}
   if(type==='Likes'){if(record.hostId!==uid||record.consumerId!==entry.id)continue;actorUid=entry.id;timestampMs=D.validTime(record.createdAt,now);}
   if(type==='Followers'){const parts=entry.ref.path.split('/');if(parts.length!==4||parts[0]!=='users'||parts[2]!=='following'||parts[3]!==uid||record.consumerId!==parts[1]||record.hostId!==uid)continue;actorUid=parts[1];timestampMs=D.validTime(record.createdAt,now);}
   if(type==='Calls'){const call=await db.doc(`calls/${entry.id}`).get();const proof=D.completedCall(record,call.data(),entry.id,uid,now);if(!proof)continue;({actorUid,timestampMs,durationSeconds}=proof);}
   if(type==='Gifts'){if(record.hostUid!==uid||record.status!=='succeeded'||record.accountingStatus!=='pending_internal')continue;actorUid=record.consumerUid;timestampMs=D.validTime(record.createdAt,now);giftName=typeof record.giftSnapshot?.name==='string'?record.giftSnapshot.name.slice(0,80):'Gift';earningCreditsEquivalent=Number.isSafeInteger(record.hostCreditsEquivalent)&&record.hostCreditsEquivalent>=0?record.hostCreditsEquivalent:null;if(earningCreditsEquivalent===null)continue;}
   if(!D.validId(actorUid)||timestampMs===null||timestampMs===undefined||actorUid===uid)continue;
   candidates.push({id:`${type.toLowerCase()}:${type==='Followers'?actorUid:entry.id}`,type,actorUid,timestampMs,...(durationSeconds!==undefined?{durationSeconds}:{}),...(type==='Gifts'?{giftName,earningCreditsEquivalent}:{})});
  }
  const actors=new Map(await Promise.all([...new Set(candidates.map(event=>event.actorUid))].map(async actorUid=>{
   const [profile,left,right]=await Promise.all([db.doc(`users/${actorUid}`).get(),db.doc(`users/${uid}/blocked/${actorUid}`).get(),db.doc(`users/${actorUid}/blocked/${uid}`).get()]);
   return [actorUid,{profile:profile.data(),blocked:left.exists||right.exists}];
  })));
  const events=candidates.flatMap(event=>{
   const current=actors.get(event.actorUid);if(!current?.profile||current.profile.isDemo)return [];
   const consumer=isConsumer(current.profile);if(event.type!=='Calls'&&(!consumer||current.blocked))return [];
   const actor=D.publicIdentity(event.actorUid,current.profile);if(!actor.username)return [];
   const {actorUid,...publicEvent}=event;
   return [{...publicEvent,actor,canInteract:consumer&&!current.blocked,canOpenProfile:consumer&&!current.blocked}];
  });
  return {events:D.sortEvents(events).slice(0,D.SOURCE_LIMIT),bounded:true,sourceLimit:D.SOURCE_LIMIT};
 };
 return {list,consumerProfile};
};
module.exports={createHostActivity};
