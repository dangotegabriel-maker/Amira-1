'use strict';
const {isApprovedHost,isConsumer}=require('./accountRole');
const D=require('./hostActivityDomain');
const LIMIT=60;
const regions=new Intl.DisplayNames(['en'],{type:'region',fallback:'none'});
const countryCode=value=>typeof value==='string'&&/^[A-Z]{2}$/.test(value)&&!['ZZ','EU','UN','QO','XA','XB'].includes(value)&&regions.of(value)?value:'';
const createHostConnect=({db,HttpsError})=>{
 const deny=()=>{throw new HttpsError('permission-denied','Connect is available to approved Hosts only.');};
 const owner=async(uid,tx)=>{if(!D.validId(uid))deny();const snap=await (tx?tx.get(db.doc(`users/${uid}`)):db.doc(`users/${uid}`).get());if(!snap.exists||!isApprovedHost(snap.data())||snap.data().isDemo)deny();return snap.data();};
 const validate=(input,keys)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))throw new HttpsError('invalid-argument','Invalid Connect request.');};
 const availability=async(uid,input={})=>{validate(input,[]);return db.runTransaction(async tx=>{const profile=await owner(uid,tx),lock=await tx.get(db.doc(`activeCallLocks/${uid}`));const state=profile.hostStatus?.availability;return {availability:['online','offline','busy'].includes(state)?state:null,canToggle:!lock.exists&&['online','offline'].includes(state)};});};
 const setAvailability=async(uid,input)=>{validate(input,['availability']);if(!['online','offline'].includes(input.availability))throw new HttpsError('invalid-argument','Choose Online or Offline.');return db.runTransaction(async tx=>{const profile=await owner(uid,tx),lock=await tx.get(db.doc(`activeCallLocks/${uid}`));if(lock.exists||profile.hostStatus?.availability==='busy')throw new HttpsError('failed-precondition','Availability cannot change during a call.');if(!['online','offline'].includes(profile.hostStatus?.availability))throw new HttpsError('failed-precondition','Availability is unavailable.');tx.update(db.doc(`users/${uid}`),{'hostStatus.availability':input.availability});return {availability:input.availability,canToggle:true};});};
 const discover=async(uid,input={})=>{
  validate(input,['tab']);const host=await owner(uid),tab=input.tab||'For You';if(!['For You','Following'].includes(tab))throw new HttpsError('invalid-argument','Invalid discovery tab.');
  let docs;
  if(tab==='Following'){const follows=await db.collection(`users/${uid}/following`).limit(LIMIT).get();const ids=follows.docs.filter(entry=>D.validId(entry.id)&&entry.data().sourceId===uid&&entry.data().targetId===entry.id&&entry.data().sourceRole==='host'&&entry.data().targetRole==='consumer').map(entry=>entry.id);docs=await Promise.all(ids.map(id=>db.doc(`users/${id}`).get()));}
  else docs=(await db.collection('users').orderBy('__name__').limit(LIMIT).get()).docs;
  const now=Date.now(),people=(await Promise.all(docs.map(async entry=>{
   const p=entry.data();if(!entry.exists||!D.validId(entry.id)||entry.id===uid||!isConsumer(p)||p.isDemo||p.isProfileComplete!==true)return null;
   const [left,right]=await Promise.all([db.doc(`users/${uid}/blocked/${entry.id}`).get(),db.doc(`users/${entry.id}/blocked/${uid}`).get()]);if(left.exists||right.exists)return null;
   const full=D.publicConsumerProfile(entry.id,p,now);if(!full.username.trim())return null;
   return {uid:full.uid,username:full.username,profilePic:full.profilePic,countryCode:countryCode(full.countryCode),age:full.age,bio:full.hostProfile.bio,interests:full.hostProfile.interests};
  }))).filter(Boolean);
  const hostCountry=countryCode(host.countryCode),score=p=>hostCountry&&p.countryCode===hostCountry?1:0;
  people.sort((a,b)=>(tab==='For You'?score(b)-score(a):0)||a.uid.localeCompare(b.uid));
  return {people,bounded:true,candidateLimit:LIMIT};
 };
 const today=async(uid,input={})=>{validate(input,[]);await owner(uid);const now=Date.now(),start=now-now%86400000,snapshot=await db.collection(`users/${uid}/profileViews`).orderBy('lastViewedAt','desc').limit(D.VIEW_LIMIT).get();const eligible=await Promise.all(snapshot.docs.map(async entry=>{const record=entry.data(),time=D.timestampMs(record.lastViewedAt);if(record.ownerUid!==uid||!D.verifiedView(record,'consumer_to_host',entry.id,now)||time<start)return false;const [person,left,right]=await Promise.all([db.doc(`users/${entry.id}`).get(),db.doc(`users/${uid}/blocked/${entry.id}`).get(),db.doc(`users/${entry.id}/blocked/${uid}`).get()]);return person.exists&&isConsumer(person.data())&&!person.data().isDemo&&!left.exists&&!right.exists;}));return {visitors:eligible.filter(Boolean).length,bounded:true,sourceLimit:D.VIEW_LIMIT,dayStartMs:start};};
 return {availability,setAvailability,discover,today};
};
module.exports={createHostConnect,LIMIT};
