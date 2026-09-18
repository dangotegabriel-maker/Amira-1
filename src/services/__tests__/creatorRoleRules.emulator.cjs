// Isolated demo namespace; requires localhost emulator loaded with current rules.
// node src/services/__tests__/callRecoveryRules.emulator.cjs (port 8289)
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,setDoc,updateDoc,getDoc,writeBatch,serverTimestamp,setLogLevel}=require('firebase/firestore');
const projectId=`demo-amira-role-${Date.now()}`;
const apps=[];let checks=0;
const client=(uid,admin=false)=>{
  const app=initializeApp({projectId,apiKey:'emulator-only'},uid);apps.push(app);
  const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8289,{mockUserToken:{sub:uid,user_id:uid,admin}});return db;
};
const denied=async(p)=>{await assert.rejects(p,e=>e.code==='permission-denied');checks++;};
const profile=(uid,role)=>({uid,role,username:uid,hostStatus:{isApproved:role==='host',hasApplied:role==='host',availability:'online',verificationStatus:role==='host'?'approved':'not_started'},
  hostProfile:{videoRateCredits:25,rateTier:'ENTRY',bio:''},wallet:{creditBalance:100},earnings:{pending:0,available:0},vip:{tier:'FREE',status:'inactive'},profileViewStats:{recentCount:0},referralStats:{qualifiedCount:0,pendingCount:0}});
const encode=value=>typeof value==='string'?{stringValue:value}:typeof value==='boolean'?{booleanValue:value}:typeof value==='number'?{integerValue:String(value)}:{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]))}};
async function seed(path,data){
  const response=await fetch(`http://127.0.0.1:8289/v1/projects/${projectId}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,encode(value)]))})});
  assert.equal(response.ok,true,await response.text());
}

setLogLevel('silent');
async function main(){
 const consumerProfile=profile('c','consumer');consumerProfile.hostStatus.availability='offline';
 await seed('users/c',consumerProfile);await seed('users/h',profile('h','host'));await seed('users/h2',profile('h2','host'));
 const pending=profile('p','consumer');pending.role='host';pending.hostStatus={hasApplied:true,isApproved:false,verificationStatus:'pending',availability:'offline'};await seed('users/p',pending);
 await seed('hostApplications/c',{ownerUid:'c',status:'in_progress',details:{bio:'fixture'}});
 await seed('hostApplications/p',{ownerUid:'p',status:'submitted'});
 for(const uid of ['h','h2'])await seed(`hostEarnings/${uid}`,{hostUid:uid,pendingCreditsEquivalent:12});
 await seed('consumerRewards/c',{freeVideoSeconds:9});await seed('consumerRewards/p',{freeVideoSeconds:5});
 const c=client('c'),p=client('p'),h=client('h'),h2=client('h2');
 const ordinary=client('new');const initial=profile('new','consumer');initial.wallet.creditBalance=0;initial.hostStatus.availability='offline';
 await setDoc(doc(ordinary,'users/new'),initial);checks++;
 const forged=client('forged');initial.uid='forged';initial.role='host';await denied(setDoc(doc(forged,'users/forged'),initial));initial.role='consumer';initial.hostStatus.isApproved=true;await denied(setDoc(doc(forged,'users/forged'),initial));
 await denied(updateDoc(doc(c,'users/c'),{role:'host','hostStatus.hasApplied':true,'hostStatus.verificationStatus':'pending','hostStatus.availability':'offline'}));
 await denied(updateDoc(doc(c,'users/c'),{'hostStatus.isApproved':true}));
 await denied(updateDoc(doc(c,'users/c'),{'hostStatus.verificationStatus':'approved'}));
 await denied(updateDoc(doc(p,'users/p'),{'hostStatus.isApproved':true}));
 await denied(updateDoc(doc(h,'users/h'),{role:'consumer'}));
 await denied(updateDoc(doc(h,'users/h'),{'hostStatus.isApproved':false}));
 await updateDoc(doc(h,'users/h'),{'hostStatus.availability':'offline'});checks++;
 await updateDoc(doc(h,'users/h'),{'hostProfile.bio':'Normal edit'});checks++;
 await updateDoc(doc(p,'users/p'),{role:'consumer'});checks++;
 await getDoc(doc(p,'consumerRewards/p'));checks++;await getDoc(doc(c,'consumerRewards/c'));checks++;await denied(getDoc(doc(h,'consumerRewards/c')));
 const batch=writeBatch(c);batch.update(doc(c,'hostApplications/c'),{status:'submitted',submittedAt:serverTimestamp()});batch.update(doc(c,'users/c'),{role:'consumer','hostStatus.hasApplied':true,'hostStatus.verificationStatus':'pending','hostStatus.availability':'offline'});await batch.commit();checks++;
 assert.equal((await getDoc(doc(c,'users/c'))).data().role,'consumer');checks++;
 await denied(updateDoc(doc(c,'hostApplications/c'),{status:'approved'}));
 await denied(updateDoc(doc(c,'hostApplications/c'),{status:'in_progress'}));
 await denied(updateDoc(doc(c,'hostApplications/c'),{details:{bio:'Edit while reviewing'}}));
 await denied(updateDoc(doc(p,'hostApplications/p'),{status:'submitted',reviewer:'self'}));
 await denied(setDoc(doc(h,'hostApplications/h'),{ownerUid:'h',status:'in_progress'}));
 await getDoc(doc(h,'hostEarnings/h'));checks++;
 for(const [store,path] of [[c,'hostEarnings/h'],[p,'hostEarnings/h'],[h2,'hostEarnings/h']])await denied(getDoc(doc(store,path)));
 for(const store of [c,p,h])await denied(setDoc(doc(store,'hostEarnings/h'),{pendingCreditsEquivalent:999}));
 // Trusted Admin SDK approval is an atomic operation; no owner callable exists.
 const backendRequire=name=>require(require.resolve(name,{paths:[require('node:path').resolve(__dirname,'../../../functions')]}));
 const {initializeApp:initializeAdmin,deleteApp:deleteAdmin}=backendRequire('firebase-admin/app');
 const {getFirestore:adminFirestore,FieldValue}=backendRequire('firebase-admin/firestore');
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
 const adminApp=initializeAdmin({projectId},'role-approval');const trusted=adminFirestore(adminApp);
 try{await trusted.runTransaction(async tx=>{const ref=trusted.doc('hostApplications/c');const app=await tx.get(ref);assert.equal(app.data().status,'submitted');tx.update(ref,{status:'approved',approvedAt:FieldValue.serverTimestamp()});tx.update(trusted.doc('users/c'),{role:'host','hostStatus.isApproved':true,'hostStatus.hasApplied':true,'hostStatus.verificationStatus':'approved','hostStatus.availability':'offline'});});checks++;
 await trusted.doc('hostEarnings/c').set({hostUid:'c',pendingCreditsEquivalent:7});}
 finally{await deleteAdmin(adminApp);}
 const approved=(await getDoc(doc(c,'users/c'))).data();assert.equal(approved.role,'host');assert.equal(approved.hostStatus.isApproved,true);checks+=2;
 await getDoc(doc(c,'hostEarnings/c'));checks++;
 await denied(getDoc(doc(c,'consumerRewards/c')));await denied(updateDoc(doc(c,'users/c'),{role:'consumer'}));await denied(updateDoc(doc(c,'hostApplications/c'),{status:'in_progress'}));
 // Existing asymmetric follow schema remains unchanged.
 await setDoc(doc(h,'users/h/following/p'),{sourceId:'h',targetId:'p',sourceRole:'host',targetRole:'consumer',createdAt:serverTimestamp()});checks++;
 await setDoc(doc(p,'users/p/following/h'),{consumerId:'p',hostId:'h',createdAt:serverTimestamp()});checks++;
 await denied(setDoc(doc(p,'users/p/following/h2'),{sourceId:'p',targetId:'h2',sourceRole:'host',targetRole:'consumer',createdAt:serverTimestamp()}));
 await denied(updateDoc(doc(p,'users/p'),{'hostProfile.videoRateCredits':100}));
 console.log(`Creator role/earnings security: ${checks} checks passed (${projectId}, localhost only).`);
}
main().finally(()=>Promise.all(apps.map(deleteApp))).catch(error=>{console.error(error);process.exitCode=1;});
