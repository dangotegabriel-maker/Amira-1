// Isolated demo namespace; requires localhost emulator loaded with current rules.
// node src/services/__tests__/callRecoveryRules.emulator.cjs (port 8289)
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,setDoc,updateDoc,getDoc}=require('firebase/firestore');
const projectId=`demo-amira-recovery-${Date.now()}`;
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
async function main(){
  await seed('users/h',profile('h','host'));await seed('users/c',profile('c','consumer'));
  const host=client('h'),consumer=client('c'),admin=client('admin',true);
  for(const [store,uid] of [[host,'h'],[consumer,'c']]){
    await denied(updateDoc(doc(store,'users',uid),{'hostProfile.videoRateCredits':6000}));
    await denied(updateDoc(doc(store,'users',uid),{'hostProfile.rateTier':'PREMIUM'}));
    await denied(updateDoc(doc(store,'users',uid),{hostProfile:{bio:'replacement removes the protected price',videoRateCredits:1}}));
    await updateDoc(doc(store,'users',uid),{'hostProfile.bio':'Ordinary editable bio'});checks++;
    for(const path of ['calls/forged','activeCallLocks/forged','creditTransactions/forged','hostEarnings/forged','platformRevenue/forged'])
      await denied(setDoc(doc(store,path),{participantIds:[uid,'h'],consumerId:uid,creatorId:'h',durationSeconds:999,creditBalance:999}));
  }
  await denied(updateDoc(doc(consumer,'users/h'),{'hostProfile.videoRateCredits':1}));
  await updateDoc(doc(admin,'users/h'),{'hostProfile.videoRateCredits':50,'hostProfile.rateTier':'STANDARD'});checks++;
  assert.equal((await getDoc(doc(host,'users/h'))).data().hostProfile.videoRateCredits,50);checks++;
  await denied(updateDoc(doc(host,'users/h'),{hostProfile:{bio:'Cannot delete the trusted rate'}}));
  const newcomer=client('new');const initial=profile('new','consumer');initial.hostStatus.isApproved=false;initial.wallet.creditBalance=0;
  initial.hostProfile.videoRateCredits=100;
  await denied(setDoc(doc(newcomer,'users/new'),initial));
  initial.hostProfile.videoRateCredits=25;await setDoc(doc(newcomer,'users/new'),initial);checks++;
  console.log(`Call recovery security: ${checks} checks passed (${projectId}, localhost only).`);
}
main().finally(()=>Promise.all(apps.map(deleteApp))).catch(error=>{console.error(error);process.exitCode=1;});
