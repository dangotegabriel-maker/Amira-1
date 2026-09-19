// Localhost-only unique demo namespace; no production data, accounting or services.
const assert=require('node:assert/strict'),Module=require('node:module');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const backendRequire=Module.createRequire(require.resolve('../../../functions/package.json'));
const admin=backendRequire('firebase-admin/app'),{getFirestore:adminFirestore,FieldValue,Timestamp}=backendRequire('firebase-admin/firestore'),{HttpsError}=backendRequire('firebase-functions/v2/https');
const {initializeApp,deleteApp}=require('firebase/app'),{getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,getDocs,collection,updateDoc,setLogLevel}=require('firebase/firestore');
const {createSocialMessaging}=require('../../../functions/src/socialMessaging'),{createHostActivity}=require('../../../functions/src/hostActivity'),{createHostDiscovery}=require('../../../functions/src/hostDiscovery');
setLogLevel('silent');const projectId=`demo-amira-activity-${Date.now()}`,serverApp=admin.initializeApp({projectId},projectId),db=adminFirestore(serverApp),apps=[];let checks=0;
const social=createSocialMessaging({db,FieldValue,HttpsError}),activity=createHostActivity({db,HttpsError}),discovery=createHostDiscovery({db,FieldValue,HttpsError});
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};const denied=async promise=>{await assert.rejects(promise,error=>error.code==='permission-denied');checks++;};
const client=uid=>{const app=initializeApp({projectId,apiKey:'emulator-only'},uid);apps.push(app);const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8289,{mockUserToken:{sub:uid,user_id:uid}});return store;};
const profile=(uid,approved=false)=>({uid,username:`Real ${uid}`,role:approved?'host':'consumer',dob:'2000-01-01',email:'private@example.test',phone:'private',payoutSetup:{bank:'private'},hostStatus:{isApproved:approved,hasApplied:approved,verificationStatus:approved?'approved':'not_started',availability:'offline'},wallet:{creditBalance:100},earnings:{pending:0,available:0},hostProfile:{videoRateCredits:37,rateTier:'ENTRY'},vip:{tier:'FREE',status:'inactive'},profileViewStats:{recentCount:0},referralStats:{qualifiedCount:0,pendingCount:0},level:10,lifetimeQualifyingPurchasedCredits:999});
const types=events=>events.map(event=>event.type);
async function main(){
 for(const uid of ['c','c2','p','h','h2'])await db.doc(`users/${uid}`).set(profile(uid,uid.startsWith('h')));
 await db.doc('users/p').update({role:'host','hostStatus.verificationStatus':'pending'});
 const c=client('c'),h=client('h'),h2=client('h2'),p=client('p');
 for(const uid of ['c','p'])await denied(activity.list(uid,{tab:'All'}));check((await activity.list('h2')).events,[]);
 await assert.rejects(activity.list('h',{tab:'Likes',hostUid:'h2'}),error=>error.code==='invalid-argument');checks++;
 check((await social.trackProfileView('c','c')).counted,false);await denied(social.trackProfileView('h','h2'));await denied(social.trackProfileView('c','c2'));await denied(social.trackProfileView('c','p'));
 await Promise.all([social.trackProfileView('c','h'),social.trackProfileView('c','h'),social.trackProfileView('c','h')]);
 let view=(await db.doc('users/h/profileViews/c').get()).data();check(view.viewCount,1);check(view.direction,'consumer_to_host');check(view.ownerUid,'h');check(view.lastViewedAt instanceof Timestamp,true);check(Math.abs(view.lastViewedAt.toMillis()-Date.now())<20000,true);check((await db.collection('users/h/profileViews').get()).size,1);
 check((await social.trackProfileView('c','h')).counted,false);
 await db.doc('users/h/profileViews/c').update({lastViewedAt:Timestamp.fromMillis(Date.now()-1800001)});check((await social.trackProfileView('c','h')).counted,true);check((await db.doc('users/h/profileViews/c').get()).data().viewCount,2);
 check((await social.trackProfileView('p','h')).counted,true);check((await activity.list('h',{tab:'Visitors'})).events.length,2);
 // Metadata-free legacy records never acquire manufactured current timestamps.
 await db.doc('users/h/profileViews/c2').set({viewerUid:'c2',lastViewedAt:Timestamp.now(),viewCount:90});check((await activity.list('h',{tab:'Visitors'})).events.length,2);
 check((await social.trackProfileView('h','c')).counted,true);check((await social.trackProfileView('h','c')).counted,false);check((await social.listProfileViews('c')).count,1);check((await social.listProfileViews('c')).views,[]);
 await db.doc('users/c').update({vip:{tier:'VIP_3',status:'active',expiresAt:Timestamp.fromMillis(Date.now()+1000000)}});check((await social.listProfileViews('c')).reveal,false);check((await social.listProfileViews('c')).views,[]);
 await denied(getDocs(collection(c,'users/c/profileViews')));await denied(getDoc(doc(c,'users/c/profileViews/h')));await denied(getDoc(doc(h,'users/c/profileViews/h')));await denied(getDoc(doc(h2,'users/h/profileViews/c')));
 await getDocs(collection(h,'users/h/profileViews'));checks++;
 await denied(setDoc(doc(c,'users/h/profileViews/c2'),{viewerUid:'c2',ownerUid:'h',lastViewedAt:new Date(),profileViewVersion:1,direction:'consumer_to_host'}));await denied(setDoc(doc(h,'users/c/profileViews/h2'),{viewerUid:'h2'}));
 await Promise.all([discovery.setLike('c',{hostId:'h',liked:true}),discovery.setLike('c',{hostId:'h',liked:true})]);check((await activity.list('h',{tab:'Likes'})).events.length,1);
 const now=Date.now(),sameTime=Timestamp.fromMillis(now-60000);
 await db.doc('users/h/likes/c').update({createdAt:sameTime});await db.doc('users/c/following/h').set({consumerId:'c',hostId:'h',createdAt:sameTime});await db.doc('users/c2/following/h').set({consumerId:'c2',hostId:'h',createdAt:Timestamp.fromMillis(now-120000)});
 const followers=(await activity.list('h',{tab:'Followers'})).events;check(followers.map(event=>event.actor.uid),['c','c2']);check(new Set(followers.map(event=>event.id)).size,2);
 await db.doc('users/c2/following/h').delete();check((await activity.list('h',{tab:'Followers'})).events.length,1);
 await discovery.setLike('c',{hostId:'h',liked:false});check((await activity.list('h',{tab:'Likes'})).events,[]);await discovery.setLike('c',{hostId:'h',liked:true});await db.doc('users/h/likes/c').update({createdAt:sameTime});
 const history={callId:'good',callerId:'c',receiverId:'h',participantIds:['c','h'],createdAt:Timestamp.fromMillis(now-300000),connectedAt:Timestamp.fromMillis(now-240000),endedAt:Timestamp.fromMillis(now-1000),durationSeconds:222,status:'ended',billedCredits:999,ratePerMinute:37};
 await db.doc('callHistory/good').set(history);await db.doc('calls/good').set({...history,accountingVersion:2,connection:{state:'ended',connectedMs:222000},privateRtc:'private'});
 for(const [callId,patch]of [['ring',{status:'missed',durationSeconds:0}],['legacy',{accountingVersion:1}],['corrupt',{durationSeconds:999}],['wrong',{receiverId:'h2',participantIds:['c','h2']}]]){await db.doc(`callHistory/${callId}`).set({...history,callId,...patch});await db.doc(`calls/${callId}`).set({...history,callId,accountingVersion:2,connection:{state:'ended',connectedMs:222000},...patch});}
 const callsBefore=JSON.stringify((await db.doc('calls/good').get()).data());const calls=(await activity.list('h',{tab:'Calls'})).events;check(calls.length,1);check(calls[0].durationSeconds,222);check(Object.hasOwn(calls[0],'billedCredits'),false);check(JSON.stringify((await db.doc('calls/good').get()).data()),callsBefore);
 await db.doc('hostEarnings/h/giftTransactions/test-gift').set({hostUid:'h',consumerUid:'c',status:'succeeded',accountingStatus:'pending_internal',giftSnapshot:{name:'Test Rose'},hostCreditsEquivalent:3,createdAt:Timestamp.fromMillis(now-500)});
 const giftEvents=(await activity.list('h',{tab:'Gifts'})).events;check(giftEvents.length,1);check(giftEvents[0].giftName,'Test Rose');check(giftEvents[0].earningCreditsEquivalent,3);check(Object.hasOwn(giftEvents[0],'priceCredits'),false);
 const all=(await activity.list('h',{tab:'All'})).events;check(new Set(types(all)).size,5);check(types(all).includes('Gifts'),true);check(all.map(event=>event.id),[...all].sort((a,b)=>b.timestampMs-a.timestampMs||a.id.localeCompare(b.id)).map(event=>event.id));
 for(const event of all){check(Object.keys(event.actor).sort(),['countryCode','profilePic','uid','username']);for(const field of ['wallet','earnings','email','phone','dob','payoutSetup','level','lifetimeQualifyingPurchasedCredits'])assert.equal(Object.hasOwn(event.actor,field),false);}
 const full=await activity.consumerProfile('h','c');check(full.username,'Real c');for(const field of ['wallet','earnings','email','phone','dob','payoutSetup','level','lifetimeQualifyingPurchasedCredits'])check(Object.hasOwn(full,field),false);await denied(activity.consumerProfile('c','c2'));
 // Ordinary Host messages remain free and cannot grant the Consumer a free reply.
 await db.doc('consumerRewards/c').set({freeMessages:0});await social.sendText('h',{receiverId:'c',messageId:'host-message',text:'Hello'});check((await db.doc('consumerRewards/c').get()).data().freeMessages,0);await assert.rejects(social.sendText('c',{receiverId:'h',messageId:'no-pass',text:'Reply'}),error=>error.code==='failed-precondition'&&error.details?.reason==='paid_messaging_unavailable');checks++;
 await discovery.cleanup('h','c',true);check((await activity.list('h',{tab:'Likes'})).events,[]);check((await activity.list('h',{tab:'Followers'})).events,[]);check((await activity.list('h',{tab:'Visitors'})).events.map(event=>event.actor.uid),['p']);
 const blockedCalls=(await activity.list('h',{tab:'Calls'})).events;check(blockedCalls.length,1);check(blockedCalls[0].canInteract,false);check(blockedCalls[0].canOpenProfile,false);check((await social.listProfileViews('c')).count,0);await denied(social.trackProfileView('c','h'));await denied(social.trackProfileView('h','c'));await denied(activity.consumerProfile('h','c'));
 await db.doc('users/c/blocked/h').set({blockedUid:'h',createdAt:FieldValue.serverTimestamp()});await db.doc('users/h/blocked/c').delete();await denied(social.trackProfileView('c','h'));await denied(social.trackProfileView('h','c'));
 for(const [store,path,data]of [[c,'consumerLevels/c',{lifetimeQualifyingPurchasedCredits:9999}],[h,'hostEarnings/h',{pendingCreditsEquivalent:999}]])await denied(setDoc(doc(store,path),data));await denied(updateDoc(doc(p,'users/p'),{'hostStatus.isApproved':true}));await denied(updateDoc(doc(h,'users/h'),{'hostProfile.videoRateCredits':999}));
 await updateDoc(doc(p,'users/p'),{'hostProfile.bio':'Ordinary profile edit'});checks++;
 // Bound source and merged feed without creating production records or per-row listeners.
 await db.doc('users/c/blocked/h').delete();for(let index=0;index<55;index++){const uid=`fixture${index}`;await db.doc(`users/${uid}`).set(profile(uid));await db.doc(`users/h/likes/${uid}`).set({consumerId:uid,hostId:'h',createdAt:Timestamp.fromMillis(now-index-1)});}
 check((await activity.list('h',{tab:'Likes'})).events.length,50);check((await activity.list('h',{tab:'All'})).events.length,50);
 console.log(`Host Activity/profile views backend and security: ${checks} checks passed (${projectId}, localhost only).`);
}
main().finally(()=>Promise.all([...apps.map(deleteApp),admin.deleteApp(serverApp)])).catch(error=>{console.error(error);process.exitCode=1;});
