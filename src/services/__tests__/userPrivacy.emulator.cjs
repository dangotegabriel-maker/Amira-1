// Unique localhost namespace; no deployment or production mutation.
const assert=require('node:assert/strict'),Module=require('node:module');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const backendRequire=Module.createRequire(require.resolve('../../../functions/package.json'));
const admin=backendRequire('firebase-admin/app'),{getFirestore:adminFirestore,FieldValue,Timestamp}=backendRequire('firebase-admin/firestore'),{HttpsError}=backendRequire('firebase-functions/v2/https');
const {initializeApp,deleteApp}=require('firebase/app'),{getFirestore,connectFirestoreEmulator,doc,getDoc,getDocs,collection,updateDoc,onSnapshot,setLogLevel}=require('firebase/firestore');
const {createPublicIdentity}=require('../../../functions/src/publicIdentity'),{createHostDiscovery}=require('../../../functions/src/hostDiscovery'),{createHostConnect}=require('../../../functions/src/hostConnect'),{createHostActivity}=require('../../../functions/src/hostActivity'),{createSocialMessaging}=require('../../../functions/src/socialMessaging'),{createAmiraIdentity}=require('../../../functions/src/amiraIdentity');
setLogLevel('silent');const projectId=`demo-amira-privacy-${Date.now()}`,serverApp=admin.initializeApp({projectId},projectId),db=adminFirestore(serverApp),apps=[];let checks=0;
const deps={db,FieldValue,HttpsError},identity=createPublicIdentity(deps),discovery=createHostDiscovery(deps),connect=createHostConnect(deps),activity=createHostActivity(deps),social=createSocialMessaging(deps),amira=createAmiraIdentity(deps);
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};const denied=async promise=>{await assert.rejects(promise,error=>error.code==='permission-denied');checks++;};
const client=(uid,adminClaim=false)=>{const app=initializeApp({projectId,apiKey:'emulator-only'},uid||'anonymous');apps.push(app);const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8289,uid?{mockUserToken:{sub:uid,user_id:uid,admin:adminClaim}}:{});return store;};
const secrets={email:'PRIVATE_EMAIL_SENTINEL',phone:'PRIVATE_PHONE_SENTINEL',accountId:'123456789',wallet:{creditBalance:87654321},earnings:{pending:87654321,available:0},payoutSetup:{bank:'PRIVATE_PAYOUT_SENTINEL'},verification:{doc:'PRIVATE_VERIFY_SENTINEL'},deviceTokens:['PRIVATE_DEVICE_SENTINEL'],notificationToken:'PRIVATE_PUSH_SENTINEL',settings:{internal:'PRIVATE_SETTINGS_SENTINEL'},authProvider:'PRIVATE_AUTH_SENTINEL',lifetimeQualifyingPurchasedCredits:87654321,level:10};
const profile=(uid,host=false)=>({uid,username:`Actual ${uid}`,isProfileComplete:true,role:host?'host':'consumer',profilePic:'https://example.test/profile.jpg',dob:'2000-01-01',countryCode:'GH',hostStatus:{isApproved:host,hasApplied:host,verificationStatus:host?'approved':'not_started',availability:'offline'},hostProfile:{videoRateCredits:25,rateTier:'ENTRY',bio:'Public bio',interests:['Music']},vip:{tier:'FREE',status:'inactive'},profileViewStats:{recentCount:0},referralStats:{qualifiedCount:0,pendingCount:0},...secrets});
const safe=result=>{assert.doesNotMatch(JSON.stringify(result),/PRIVATE_\w+_SENTINEL|87654321|123456789|2000-01-01/);checks++;};
const tiny=result=>{check(Object.keys(result).sort(),['profilePic','uid','username']);safe(result);};
async function main(){
 for(const uid of ['c','c2','h','h2','pending','demo'])await db.doc(`users/${uid}`).set(profile(uid,uid.startsWith('h')));
 await db.doc('users/pending').update({role:'host','hostStatus.verificationStatus':'pending'});await db.doc('users/demo').update({isDemo:true});
 const c=client('c'),h=client('h'),c2=client('c2'),h2=client('h2'),anon=client(null),privileged=client('trusted',true);
 for(const [store,target]of [[c,'h'],[h,'c'],[c,'c2'],[h,'h2']])await denied(getDoc(doc(store,'users',target)));
 for(const [store,uid]of [[c,'c'],[h,'h']])check((await getDoc(doc(store,'users',uid))).data().email,secrets.email);
 await denied(getDoc(doc(anon,'users/c')));await denied(getDocs(collection(c,'users')));check((await getDoc(doc(privileged,'users/c'))).exists(),true);
 await new Promise((resolve,reject)=>{const stop=onSnapshot(doc(c,'users/h'),()=>reject(Error('Raw cross-user listener leaked')),error=>{try{check(error.code,'permission-denied');stop();resolve();}catch(e){reject(e);}});});
 await updateDoc(doc(c,'users/c'),{username:'Edited name','hostProfile.bio':'Normal edit'});checks++;
 for(const patch of [{amiraId:'AMR-ABC123'},{'hostStatus.isApproved':true},{'hostStatus.availability':'online'},{level:9},{lifetimeQualifyingPurchasedCredits:0},{'wallet.creditBalance':0},{'earnings.pending':0},{'hostProfile.videoRateCredits':100}])await denied(updateDoc(doc(c,'users/c'),patch));
 await denied(updateDoc(doc(h,'users/h'),{'hostStatus.availability':'busy'}));await denied(updateDoc(doc(h,'users/h'),{'hostProfile.videoRateCredits':100}));await denied(updateDoc(doc(h,'users/h'),{role:'consumer'}));
 await amira.ensure('c');await amira.ensure('h');const publicId=(await db.doc('users/h').get()).data().amiraId;
 await denied(getDoc(doc(c,'amiraIds',publicId)));await denied(getDocs(collection(c,'amiraIds')));await denied(getDoc(doc(privileged,'amiraIds',publicId)));
 await db.doc('hostApplications/h').set({ownerUid:'h',status:'approved',approvedAt:Timestamp.now(),verification:secrets.verification,payout:secrets.payoutSetup});
 await denied(getDoc(doc(c,'hostApplications/h')));await denied(getDoc(doc(c,'hostEarnings/h')));
 const fullHost=await discovery.profile('c','h');safe(fullHost);check(Object.keys(fullHost).sort(),['age','amiraId','countryCode','hasActiveStory','hostApprovedAt','hostProfile','hostStatus','languages','moments','profilePic','role','social','stories','storyThumbnail','uid','username']);check(fullHost.amiraId,publicId);check(Object.hasOwn(fullHost,'level'),false);
 const fullConsumer=await activity.consumerProfile('h','c');safe(fullConsumer);check(Object.keys(fullConsumer).sort(),['age','amiraId','countryCode','gender','hostProfile','hostStatus','profilePic','role','uid','username']);check(fullConsumer.amiraId,(await db.doc('users/c').get()).data().amiraId);check(Object.hasOwn(fullConsumer,'level'),false);
 const consumerPool=await discovery.candidates('c');safe(consumerPool);for(const p of consumerPool)check(Object.hasOwn(p,'amiraId'),false);
 const connectPool=await connect.discover('h');safe(connectPool);for(const p of connectPool.people){check(Object.keys(p).sort(),['age','bio','countryCode','interests','profilePic','uid','username']);}
 await social.trackProfileView('c','h');const events=await activity.list('h',{tab:'Visitors'});safe(events);for(const event of events.events)check(Object.keys(event.actor).sort(),['countryCode','profilePic','uid','username']);
 const message=await identity.message('c',{targetUid:'h'});tiny(message.identity);safe(message);check(message.hostStatus,{isApproved:true});check(Object.keys(message).sort(),['canInteract','hostStatus','identity']);
 check(await identity.relationship('c',{targetUid:'h'}),{valid:true});check(await identity.relationship('h',{targetUid:'h2'}),{valid:false});
 const call={callId:'call',callerId:'c',receiverId:'h',participantIds:['c','h'],status:'ended',billedCredits:999,connection:{state:'ended',connectedMs:9000}};
 await db.doc('calls/call').set(call);await db.doc('callHistory/legacy').set({...call,callId:'legacy'});const before=JSON.stringify((await db.doc('calls/call').get()).data());
 tiny((await identity.calls('c',{callIds:['call','legacy']})).participants[0].identity);await denied(identity.calls('c2',{callIds:['call']}));check(JSON.stringify((await db.doc('calls/call').get()).data()),before);
 await db.doc('users/h/blocked/c').set({blockedUid:'c',createdAt:FieldValue.serverTimestamp()});await denied(identity.message('c',{targetUid:'h'}));check(await identity.relationship('c',{targetUid:'h'}),{valid:false});check((await identity.calls('c',{callIds:['call']})).participants[0].canInteract,false);
 check((await identity.blockedProfiles('c')).people,[]);const owned=await identity.blockedProfiles('h');check(owned.people.length,1);tiny(owned.people[0]);
 await denied(discovery.profile('c','h'));await denied(activity.consumerProfile('h','c'));check((await connect.discover('h')).people.some(p=>p.uid==='c'),false);
 await db.doc('users/h/blocked/c').delete();await db.doc('users/c/blocked/h').set({blockedUid:'h',createdAt:FieldValue.serverTimestamp()});await denied(identity.message('h',{targetUid:'c'}));await denied(discovery.profile('c','h'));
 await db.doc('users/c/blocked/h').delete();await db.doc('conversations/c__h').set({participantIds:['c','h']});await db.doc('users/h').update({'hostStatus.isApproved':false});check((await identity.message('c',{targetUid:'h'})).canInteract,false);tiny((await identity.calls('c',{callIds:['call']})).participants[0].identity);
 await assert.rejects(identity.message('c',{targetUid:'demo'}),e=>e.code==='not-found');checks++;await assert.rejects(identity.calls('c',{callIds:Array(31).fill('call')}),e=>e.code==='invalid-argument');checks++;
 console.log(`User privacy/rules/sentinel projections: ${checks} checks passed (${projectId}, localhost only).`);
}
main().finally(()=>Promise.all([...apps.map(deleteApp),admin.deleteApp(serverApp)])).catch(error=>{console.error(error);process.exitCode=1;});
