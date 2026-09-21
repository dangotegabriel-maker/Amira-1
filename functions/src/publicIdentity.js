'use strict';
const {isApprovedHost, isConsumer} = require('./accountRole');
const {publicPhotos} = require('./hostDiscoveryDomain');
const LIMIT = 30, BLOCK_LIMIT = 50;
// This identity is deliberately smaller than either full-profile projection.
const identity = (uid, p) => ({uid, username: typeof p.username === 'string' ? p.username : '',
  profilePic: publicPhotos(p)[0] || ''});
const createPublicIdentity = ({db, HttpsError}) => {
  const fail = (code, message) => { throw new HttpsError(code, message); };
  const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const validate = (uid, input, keys) => {
    if (!id(uid)) fail('unauthenticated', 'Sign in required.');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k))) fail('invalid-argument', 'Invalid identity request.');
  };
  const profile = async uid => { const snap = await db.doc(`users/${uid}`).get();
    return snap.exists && snap.data().isDemo !== true ? snap.data() : null; };
  const blocked = async (a,b) => (await Promise.all([db.doc(`users/${a}/blocked/${b}`).get(), db.doc(`users/${b}/blocked/${a}`).get()])).some(s => s.exists);
  const pair = async (uid, targetUid) => {
    if (!id(targetUid) || targetUid === uid) fail('invalid-argument', 'Choose another user.');
    const [a,b] = await Promise.all([profile(uid), profile(targetUid)]);
    if (!a || !b) fail('not-found', 'Profile unavailable.');
    return {a,b, supported: (isConsumer(a) && isApprovedHost(b)) || (isApprovedHost(a) && isConsumer(b)), blocked: await blocked(uid,targetUid)};
  };
  const relationship = async (uid, input = {}) => {
    validate(uid,input,['targetUid']); const p = await pair(uid,input.targetUid);
    // Capability only: unsupported or blocked pairs reveal no target identity.
    return {valid: p.supported && !p.blocked};
  };
  const message = async (uid, input = {}) => {
    validate(uid,input,['targetUid']); const targetUid=input.targetUid, p=await pair(uid,targetUid);
    if (p.blocked) fail('permission-denied', 'Interaction unavailable because of a block.');
    const conversation = await db.doc(`conversations/${[uid,targetUid].sort().join('__')}`).get();
    const participants = conversation.data()?.participantIds;
    const historical = conversation.exists && Array.isArray(participants) && participants.length === 2 && participants.includes(uid) && participants.includes(targetUid);
    if (!p.supported && !historical) fail('permission-denied', 'Recipient unavailable.');
    // Only the protected approval truth is needed for existing header actions.
    return {identity: identity(targetUid,p.b), canInteract:p.supported,
      hostStatus:{isApproved:p.supported && isConsumer(p.a) && isApprovedHost(p.b)}};
  };
  const call = async (uid, callId) => {
    if (!id(callId)) fail('invalid-argument','Invalid call identifier.');
    let snap=await db.doc(`calls/${callId}`).get(), live=snap.exists;
    if (!live) snap=await db.doc(`callHistory/${callId}`).get();
    const c=snap.data(), participants=c?.participantIds;
    if (!snap.exists || !id(c.callerId) || !id(c.receiverId) || c.callerId===c.receiverId || !Array.isArray(participants) || participants.length!==2 || !participants.includes(c.callerId) || !participants.includes(c.receiverId) || !participants.includes(uid)) fail('permission-denied','Call identity is participant-only.');
    const targetUid=c.callerId===uid?c.receiverId:c.callerId;
    const [a,b]=await Promise.all([profile(uid),profile(targetUid)]);
    if (!a || !b) return {callId,identity:null,canInteract:false};
    // Historical participants may retain tiny identity after role changes/block.
    // A block always disables navigation into a new interaction.
    const isBlocked=await blocked(uid,targetUid);
    const normalIncoming = live && c.status === 'ringing' && c.receiverId === uid
      && !c.source && !isBlocked && isApprovedHost(a) && isConsumer(b);
    let presentation={};
    if(normalIncoming){
      const [vip,account,config]=await Promise.all([db.doc(`vipMemberships/${targetUid}`).get(),db.doc(`consumerLevels/${targetUid}`).get(),db.doc('levelConfig/current').get()]);
      presentation={vipActive:require('./vipDomain').active(vip.data(),b,Date.now()),level:require('./levelDomain').deriveLevel(account.data(),config.data()||require('./levelDomain').DEFAULT_LEVEL_CONFIG)};
    }
    return {callId,identity:{...identity(targetUid,b),...presentation},canInteract:!isBlocked};
  };
  const calls = async (uid,input={}) => {
    validate(uid,input,['callIds']);
    if (!Array.isArray(input.callIds) || input.callIds.length<1 || input.callIds.length>LIMIT || new Set(input.callIds).size!==input.callIds.length) fail('invalid-argument','Choose 1–30 distinct calls.');
    return {participants:await Promise.all(input.callIds.map(callId=>call(uid,callId)))};
  };
  const blockedProfiles = async (uid,input={}) => {
    validate(uid,input,[]); if (!(await profile(uid))) fail('not-found','Account unavailable.');
    // Derive targets only from this owner's blocks. Incoming blockers are private.
    const snapshot=await db.collection(`users/${uid}/blocked`).orderBy('__name__').limit(BLOCK_LIMIT).get();
    const people=(await Promise.all(snapshot.docs.map(async entry=>{
      if (!id(entry.id) || entry.id===uid || entry.data().blockedUid!==entry.id) return null;
      const p=await profile(entry.id); return p?identity(entry.id,p):null;
    }))).filter(Boolean);
    return {people,bounded:true,sourceLimit:BLOCK_LIMIT};
  };
  return {relationship,message,calls,blockedProfiles};
};
module.exports={createPublicIdentity,identity,LIMIT,BLOCK_LIMIT};
