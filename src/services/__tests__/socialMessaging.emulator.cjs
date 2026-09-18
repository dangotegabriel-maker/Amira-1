// Local demo project only. Uses the cached Firestore emulator at 127.0.0.1:8189.
const assert = require('node:assert/strict');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8189';
const backendRequire = require('node:module').createRequire(require.resolve('../../../functions/package.json'));
const adminApp = backendRequire('firebase-admin/app');
const { getFirestore: adminFirestore, FieldValue, Timestamp } = backendRequire('firebase-admin/firestore');
const { HttpsError } = backendRequire('firebase-functions/v2/https');
const { initializeApp, deleteApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, collectionGroup, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp, runTransaction } = require('firebase/firestore');
const { createSocialMessaging } = require('../../../functions/src/socialMessaging');
const { createConsumerRewards } = require('../../../functions/src/consumerRewards');
const projectId='demo-amira-social-batch12';
const serverApp=adminApp.initializeApp({projectId},projectId), db=adminFirestore(serverApp);
const api=createSocialMessaging({db,FieldValue,HttpsError}), rewards=createConsumerRewards({db,FieldValue,HttpsError});
const apps=[]; let checks=0;
const check=(actual,expected)=>{ assert.deepEqual(actual,expected); checks++; };
const denied=async(p)=>{ await assert.rejects(p,e=>e.code==='permission-denied'); checks++; };
const client=(uid)=>{ const app=initializeApp({projectId,apiKey:'demo'},uid||'anonymous'); apps.push(app); const store=getFirestore(app); connectFirestoreEmulator(store,'127.0.0.1',8189,uid?{mockUserToken:{sub:uid,user_id:uid}}:{});return store; };
const profile=(uid,role)=>({uid,role,username:uid,isProfileComplete:true,hostStatus:{isApproved:role==='host',hasApplied:role==='host',availability:'offline',verificationStatus:role==='host'?'approved':'not_started'},wallet:{creditBalance:0},earnings:{pending:0,available:0},vip:{tier:'FREE',status:'inactive'},profileViewStats:{recentCount:0},referralStats:{qualifiedCount:0,pendingCount:0}});
const read=async(path)=>(await db.doc(path).get()).data();
async function main(){
 const reset=await fetch(`http://127.0.0.1:8189/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'});assert.equal(reset.ok,true);
 for(const [uid,role] of [['c','consumer'],['c2','consumer'],['h','host']]) await db.doc(`users/${uid}`).set(profile(uid,role));
 const c=client('c'),h=client('h'),other=client('c2'),anon=client(null);
 check((await api.trackProfileView('c','h')).counted,true);
 check((await api.listProfileViews('h')).views[0].viewerUid,'c');
 check((await getDocs(collection(h,'users/h/profileViews'))).size,1);
 check((await api.trackProfileView('h','c')).counted,true);
 check((await api.listProfileViews('c')).views.length,0); check((await api.listProfileViews('c')).count,1);
 await denied(getDoc(doc(h,'users/c/profileViews/h'))); await denied(getDocs(collection(c,'users/c/profileViews')));
 await denied(getDoc(doc(other,'users/h/profileViews/c'))); await denied(getDoc(doc(anon,'users/h/profileViews/c')));
 await db.doc('users/c').update({vip:{tier:'VIP_1',status:'active',expiresAt:Timestamp.fromMillis(Date.now()+60000)}});
 await denied(getDocs(collection(c,'users/c/profileViews'))); check((await api.listProfileViews('c')).views.length,0);
 await db.doc('users/c').update({'vip.expiresAt':Timestamp.fromMillis(Date.now()-1000)});
 await denied(getDocs(collection(c,'users/c/profileViews'))); check((await api.listProfileViews('c')).views.length,0);
 check((await api.trackProfileView('c','c')).counted,false); check((await api.trackProfileView('c','h')).counted,false);
 await db.doc('users/h/profileViews/c').update({lastViewedAt:Timestamp.fromMillis(Date.now()-1800001)});
 check((await api.trackProfileView('c','h')).counted,true); check((await read('users/h/profileViews/c')).viewCount,2);
 await denied(setDoc(doc(c,'users/h/profileViews/c'),{viewerUid:'c',viewCount:999}));
 await setDoc(doc(h,'users/h/blocked/c'),{blockedUid:'c',createdAt:serverTimestamp()});
 await denied(api.trackProfileView('c','h')); check((await api.listProfileViews('h')).count,0);
 await deleteDoc(doc(h,'users/h/blocked/c'));
 // Existing follow schema; reciprocal point read is private to the two users.
 await setDoc(doc(c,'users/c/following/h'),{consumerId:'c',hostId:'h',createdAt:serverTimestamp()});
 check((await api.syncFriendship('c','h')).friends,false);
 check((await getDoc(doc(h,'users/c/following/h'))).exists(),true);
 await denied(getDoc(doc(other,'users/c/following/h')));
 await setDoc(doc(h,'users/h/following/c'),{sourceId:'h',targetId:'c',sourceRole:'host',targetRole:'consumer',createdAt:serverTimestamp()});
 const simultaneous=await Promise.all([api.syncFriendship('c','h'),api.syncFriendship('h','c')]);check(simultaneous.filter(x=>x.created).length,1);
 check((await read('consumerRewards/c')).freeMessages,5); check(await read('consumerRewards/h'),undefined);
 check((await db.collection('conversations/c__h/messages').get()).size,1);
 check((await getDocs(collection(c,'conversations/c__h/messages'))).size,1);
 await denied(setDoc(doc(c,'friendships/fake'),{participantIds:['c','h']}));
 await denied(setDoc(doc(c,'conversations/c__h/messages/fake'),{type:'friendship_created'}));
 await deleteDoc(doc(h,'users/h/following/c')); check((await api.syncFriendship('c','h')).friends,false);
 await setDoc(doc(h,'users/h/following/c'),{sourceId:'h',targetId:'c',sourceRole:'host',targetRole:'consumer',createdAt:serverTimestamp()});
 await api.syncFriendship('c','h'); check((await read('consumerRewards/c')).freeMessages,5);
 // End friendship to exercise non-friend windows.
 await deleteDoc(doc(h,'users/h/following/c'));
 // Real transactions race on one reward balance and deterministic message ID.
 const send={receiverId:'h',messageId:'retry',text:'Hello'};
 await Promise.all([api.sendText('c',send),api.sendText('c',send)]);check((await read('consumerRewards/c')).freeMessages,4);
 const messages=await getDocs(collection(h,'conversations/c__h/messages'));check(messages.size,2);
 await denied(setDoc(doc(c,'conversations/c__h/messages/forged'),{id:'forged',conversationId:'c__h',senderId:'c',receiverId:'h',type:'text',status:'sent',text:'bypass',createdAt:serverTimestamp()}));
 await denied(setDoc(doc(c,'conversations/c__c2'),{participantIds:['c','c2']}));
 await denied(updateDoc(doc(c,'consumerRewards/c'),{freeMessages:999}));
 await denied(updateDoc(doc(c,'consumerRewards/c'),{freeVideoSeconds:0}));
 await denied(setDoc(doc(c,'consumerRewards/c/messageTransactions/fake'),{source:'signup',delta:999}));
 const ledger=await getDocs(collection(c,'consumerRewards/c/messageTransactions'));check(ledger.size,2);
 await denied(getDocs(collection(h,'consumerRewards/c/messageTransactions')));
 await denied(updateDoc(doc(c,'users/c'),{vip:{tier:'VIP_3',status:'active'}}));
 await denied(setDoc(doc(c,'economyConfig/current'),{unlimitedMessagingVipTiers:['VIP_3']}));
 // Exact markRead transaction used by the client; older chats can omit the other read marker.
 await runTransaction(h,async(tx)=>{const r=doc(h,'conversations/c__h');await tx.get(r);tx.update(r,{'unreadCounts.h':0,'lastReadAt.h':serverTimestamp(),updatedAt:serverTimestamp()});});
 const readAt=(await read('conversations/c__h')).lastReadAt.h.toMillis();check((await read('conversations/c__h')).unreadCounts.h,0);
 await api.sendText('c',{receiverId:'h',messageId:'next',text:'Again'});check((await read('conversations/c__h')).lastReadAt.h.toMillis(),readAt);
 await denied(updateDoc(doc(c,'conversations/c__h'),{'lastReadAt.h':serverTimestamp()}));
 await api.sendText('h',{receiverId:'c',messageId:'reply',text:'Host reply'});check((await read('consumerRewards/c')).freeMessages,4);check(await read('consumerRewards/h'),undefined);
 await db.doc('consumerRewards/c').update({freeMessages:0});
 await assert.rejects(api.sendText('c',{receiverId:'c2',messageId:'zero',text:'No allowance'}),e=>e.details?.reason==='insufficient_chat_passes');checks++;
 check(await read('conversations/c__c2'),undefined);
 await rewards.claim('c');await rewards.claim('c');check((await read('consumerRewards/c')).freeMessages,3);
 await api.sendText('c',{receiverId:'c2',messageId:'first',text:'First real message'});check((await read('consumerRewards/c')).freeMessages,2);
 await runTransaction(other,async(tx)=>{const r=doc(other,'conversations/c__c2');await tx.get(r);tx.update(r,{'unreadCounts.c2':0,'lastReadAt.c2':serverTimestamp(),updatedAt:serverTimestamp()});});checks++;
 await setDoc(doc(c,'users/c/blocked/h'),{blockedUid:'h',createdAt:serverTimestamp()});
 await denied(api.sendText('h',{receiverId:'c',messageId:'blocked',text:'Blocked'}));
 await denied(api.syncFriendship('c','h'));check((await read('consumerRewards/c')).freeMessages,2);
 // Forged window access and reputation writes are forbidden.
 await denied(updateDoc(doc(c,'consumerRewards/c/chatWindows/c__c2'),{expiresAt:new Date(Date.now()+999999999)}));
 await denied(setDoc(doc(c,'consumerRewards/c/chatWindows/fake'),{expiresAt:new Date(Date.now()+999999999)}));
 await denied(setDoc(doc(h,'hostReputation/h'),{averageRating:5,reviewCount:999}));
 await denied(setDoc(doc(c,'callReviews/fake'),{callId:'fake',reviewerUid:'c',hostUid:'h',rating:5}));
 // New initial sends race on the same window, not just the same request.
 await db.doc('consumerRewards/c/chatWindows/c__c2').delete();
 await Promise.all(['race1','race2'].map(messageId=>api.sendText('c',{receiverId:'c2',messageId,text:'Racing'})));
 check((await read('consumerRewards/c')).freeMessages,1);
 const window=await read('consumerRewards/c/chatWindows/c__c2');
 check(window.expiresAt.toMillis()-window.openedAt.toMillis(),86400000);
 await db.doc('consumerRewards/c/chatWindows/c__c2').update({expiresAt:Timestamp.fromMillis(Date.now()-1)});
 await api.sendText('c',{receiverId:'c2',messageId:'expired',text:'New window'});
 check((await read('consumerRewards/c')).freeMessages,0);
 // Trusted completed-call reviews aggregate once under real transaction races.
 await deleteDoc(doc(c,'users/c/blocked/h'));
 const reviews=require('../../../functions/src/callReviews').createCallReviews({db,FieldValue,HttpsError});
 await db.doc('calls/reviewable').set({callerId:'c',receiverId:'h',participantIds:['c','h'],status:'ended',connectedAtMs:1000,durationSeconds:30});
 await Promise.all([reviews.submit('c',{callId:'reviewable',rating:4}),reviews.submit('c',{callId:'reviewable',rating:4})]);
 check((await read('hostReputation/h')).reviewCount,1);
 check((await getDoc(doc(other,'hostReputation/h'))).data().averageRating,4);
 await db.doc('calls/missed').set({callerId:'c',receiverId:'h',participantIds:['c','h'],status:'missed',durationSeconds:0});
 await denied(reviews.submit('c',{callId:'missed',rating:5}));
 await setDoc(doc(h,'users/h/blocked/c'),{blockedUid:'c',createdAt:serverTimestamp()});
 check((await getDocs(query(collectionGroup(c,'blocked'),where('blockedUid','==','c')))).size,1);
 await denied(getDocs(query(collectionGroup(other,'blocked'),where('blockedUid','==','c'))));
 console.log(`Batch 1.3 backend integration and security: ${checks} checks passed.`);

}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await Promise.all(apps.map(deleteApp));await db.terminate();await adminApp.deleteApp(serverApp);});
