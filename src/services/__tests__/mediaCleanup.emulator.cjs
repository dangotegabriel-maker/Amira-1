// Local Storage emulator only. Does not enable the application upload gate.
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,updateDoc,setDoc,deleteDoc}=require('firebase/firestore');
const req=require('node:module').createRequire(require.resolve('../../../functions/package.json'));
const admin=req('firebase-admin/app'),{getFirestore:adminDb}=req('firebase-admin/firestore');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8289';
const {getStorage,connectStorageEmulator,ref,uploadBytes,deleteObject,getBytes,updateMetadata}=require('firebase/storage');
const projectId=process.env.GCLOUD_PROJECT||'demo-amira-media-review',apps=[];let checks=0;
const server=admin.initializeApp({projectId},'media-review'),db=adminDb(server);
const client=(uid,isAdmin=false)=>{
 const app=initializeApp({projectId,apiKey:'emulator-only',storageBucket:`${projectId}.appspot.com`},uid||'anonymous');apps.push(app);
 const storage=getStorage(app);connectStorageEmulator(storage,'127.0.0.1',9299,uid?{mockUserToken:{sub:uid,user_id:uid,admin:isAdmin}}:undefined);
 const store=getFirestore(app);connectFirestoreEmulator(store,'127.0.0.1',8289,uid?{mockUserToken:{sub:uid,user_id:uid,admin:isAdmin}}:undefined);
 return storage;
};
const denied=async task=>{await assert.rejects(task,error=>error.code==='storage/unauthorized');checks++;};
async function main(){
 const owner=client('owner'),other=client('other'),anonymous=client(null),reviewer=client('reviewer',true);
 await db.doc('users/owner').set({role:'consumer',hostStatus:{isApproved:false}});
 await db.doc('hostApplications/owner').set({ownerUid:'owner',status:'in_progress'});
 for(const category of ['profile','gallery','intro-video','verification/1']){
  const path=`users/owner/${category}/fixture`,contentType=category==='intro-video'?'video/mp4':'image/jpeg';
  await uploadBytes(ref(owner,path),new Uint8Array([1,2,3]),{contentType});checks++;
  await denied(uploadBytes(ref(other,path),new Uint8Array([4]),{contentType}));
  await denied(deleteObject(ref(other,path)));await denied(deleteObject(ref(anonymous,path)));
  if(category.startsWith('verification'))await denied(getBytes(ref(other,path)));
  await deleteObject(ref(owner,path));checks++;
  await assert.rejects(getBytes(ref(owner,path)),error=>error.code==='storage/object-not-found');checks++;
  await denied(uploadBytes(ref(owner,path),new Uint8Array([1]),{contentType:'text/plain'}));
 }
 await denied(uploadBytes(ref(owner,'users/owner/profile/oversize'),new Uint8Array(8*1024*1024+1),{contentType:'image/jpeg'}));
 // Real private files and rule-enforced metadata submission, followed by
 // owner overwrite/delete attempts against every protected review state.
 const ownerDb=getFirestore(owner.app),appRef=doc(ownerDb,'hostApplications','owner');
 const evidence=Array.from({length:5},(_,order)=>({order,path:`users/owner/verification/${order+1}/review.jpg`}));
 for(const item of evidence)await uploadBytes(ref(owner,item.path),new Uint8Array([1,2,3]),{contentType:'image/jpeg'});
 const deniedFirestore=async task=>{await assert.rejects(task,error=>error.code==='permission-denied');checks++;};
 // Exercise the authoritative rule on both direct creation and submission
 // updates. Every malformed request must leave the document unsubmitted.
 const malformedItems=[
  null,false,0,'capture',{},
  {order:0},{path:evidence[0].path},
  ...[null,false,42,[],{}].map(path=>({path,order:0})),
  ...[null,false,'0',0.5,-1,1].map(order=>({path:evidence[0].path,order})),
  {...evidence[0],url:'https://public.test/capture'},
  {...evidence[0],downloadURL:'https://public.test/capture'},
  {...evidence[0],unexpected:true},
  {...evidence[0],action:{}},{...evidence[0],contentType:[]},{...evidence[0],size:'3'},
  ...['','users/owner/verification/1/','users/owner/verification/1/a/b','users/owner/verification/2/a','users/other/verification/1/a','users/owner/gallery/a'].map(path=>({path,order:0})),
 ];
 // Firestore itself rejects nested array items before evaluating rules.
 assert.throws(()=>updateDoc(appRef,{status:'submitted',verification:{evidence:[[],...evidence.slice(1)]}}),error=>error.code==='invalid-argument');checks++;
 const malformedVerification=[undefined,null,false,'verification',[],{},
  ...[null,false,'evidence',{},[],evidence.slice(0,4),[...evidence,evidence[0]], [...evidence].reverse()].map(value=>({evidence:value})),
  ...malformedItems.map(item=>({evidence:[item,...evidence.slice(1)]})),
 ];
 for(const verification of malformedVerification){
  const payload={ownerUid:'owner',status:'submitted',...(verification===undefined?{}:{verification})};
  await db.doc('hostApplications/owner').delete();
  await deniedFirestore(setDoc(appRef,payload));
  assert.equal((await db.doc('hostApplications/owner').get()).exists,false);checks++;
  await db.doc('hostApplications/owner').set({ownerUid:'owner',status:'in_progress'});
  await deniedFirestore(updateDoc(appRef,payload));
  assert.equal((await db.doc('hostApplications/owner').get()).data().status,'in_progress');checks++;
 }
 console.log(`Malformed evidence: ${malformedVerification.length} cases rejected on both create and update.`);
 // A forged public/foreign evidence reference must not bypass the Storage lock.
 for(const path of ['users/owner/gallery/review.jpg','users/other/verification/1/review.jpg']){
   const forged=evidence.map((item,index)=>index?item:{...item,path});
   await deniedFirestore(updateDoc(appRef,{status:'submitted',verification:{evidence:forged}}));
 }
 await deniedFirestore(updateDoc(appRef,{status:'submitted',verification:{evidence:evidence.map((item,index)=>index?item:{...item,url:'https://public.test/photo'})}}));
 await updateDoc(appRef,{status:'submitted',verification:{evidence}});checks++;
 for(const status of ['submitted','pending','under_review','approved']){
   await db.doc('hostApplications/owner').update({status});
   const file=ref(owner,evidence[0].path);
   await denied(uploadBytes(file,new Uint8Array([9]),{contentType:'image/jpeg'}));
   await denied(updateMetadata(file,{customMetadata:{replaced:'true'}}));
   await denied(deleteObject(file));
   await denied(uploadBytes(ref(owner,'users/owner/verification/1/new.jpg'),new Uint8Array([9]),{contentType:'image/jpeg'}));
   await deniedFirestore(updateDoc(appRef,{status:'in_progress'}));
   await deniedFirestore(updateDoc(appRef,{verification:{evidence:[]}}));
   await deniedFirestore(deleteDoc(appRef));
   assert.deepEqual([...new Uint8Array(await getBytes(ref(reviewer,evidence[0].path)))],[1,2,3]);checks++;
   await denied(getBytes(ref(other,evidence[0].path)));await denied(getBytes(ref(anonymous,evidence[0].path)));
 }
 // Administrator-requested corrections reopen genuine draft editing/retry.
 for(const status of ['draft','in_progress','incomplete','rejected','needs_changes','action_required']){
   await db.doc('hostApplications/owner').update({status});
   const path=`users/owner/verification/1/${status}.jpg`;
   await uploadBytes(ref(owner,path),new Uint8Array([1]),{contentType:'image/jpeg'});checks++;
   await uploadBytes(ref(owner,path),new Uint8Array([2]),{contentType:'image/jpeg'});checks++;
   await deleteObject(ref(owner,path));checks++;
 }
 await db.doc('users/owner').update({role:'host','hostStatus.isApproved':true});
 await denied(deleteObject(ref(owner,evidence[0].path)));
 await denied(uploadBytes(ref(owner,evidence[0].path),new Uint8Array([9]),{contentType:'image/jpeg'}));
 await db.doc('users/owner').update({role:'consumer','hostStatus.isApproved':false});
 await db.doc('hostApplications/owner').delete();
 await denied(deleteObject(ref(owner,evidence[0].path)));
 await denied(uploadBytes(ref(owner,'users/owner/verification/1/missing-draft.jpg'),new Uint8Array([9]),{contentType:'image/jpeg'}));
 // Missing/malformed authoritative records must fail closed for all four
 // mutations, including metadata-only updates and new file creation.
 const draftProfile={role:'consumer',hostStatus:{isApproved:false}};
 const draftApplication={ownerUid:'owner',status:'in_progress'};
 const deniedRecords=[
  [null,draftApplication], [draftProfile,null], [null,null],
  [{},draftApplication], [draftProfile,{}],
  [{role:'consumer',hostStatus:null},draftApplication],
  [{role:'consumer',hostStatus:'invalid'},draftApplication],
  [{role:'consumer',hostStatus:{isApproved:'false'}},draftApplication],
  [draftProfile,{ownerUid:'other',status:'in_progress'}],
  [draftProfile,{ownerUid:'owner',status:'unknown'}],
  [{...draftProfile,hostStatus:{isApproved:true}},draftApplication],
  [draftProfile,{ownerUid:'owner',status:'submitted'}],
  [draftProfile,{ownerUid:'owner',status:'approved'}],
 ];
 for(const [profile,application] of deniedRecords){
  for(const [path,data] of [['users/owner',profile],['hostApplications/owner',application]]){
   if(data===null)await db.doc(path).delete();else await db.doc(path).set(data);
  }
  await denied(uploadBytes(ref(owner,'users/owner/verification/1/unauthorized-new.jpg'),new Uint8Array([9]),{contentType:'image/jpeg'}));
  await denied(uploadBytes(ref(owner,evidence[0].path),new Uint8Array([9]),{contentType:'image/jpeg'}));
  await denied(updateMetadata(ref(owner,evidence[0].path),{customMetadata:{tampered:'true'}}));
  await denied(deleteObject(ref(owner,evidence[0].path)));
 }
 await db.doc('users/owner').set(draftProfile);
 // Valid syntax is deliberately NOT an existence check: Firestore rules cannot
 // look up Storage objects. Keep this explicit rather than claiming verification.
 const absent=evidence.map((item,index)=>({...item,path:`users/owner/verification/${index+1}/not-uploaded.jpg`}));
 await db.doc('hostApplications/owner').delete();
 await setDoc(appRef,{ownerUid:'owner',status:'submitted',verification:{evidence:absent}});checks++;
 await assert.rejects(getBytes(ref(owner,absent[0].path)),error=>error.code==='storage/object-not-found');checks++;
 // Also cover the complete metadata emitted by the real capture flow.
 await db.doc('hostApplications/owner').set(draftApplication);
 await updateDoc(appRef,{status:'submitted',verification:{evidence:evidence.map(item=>({...item,action:'Face centered',contentType:'image/jpeg',size:3}))}});checks++;
 await db.doc('hostApplications/owner').set({ownerUid:'owner',status:'in_progress'});
 await denied(uploadBytes(ref(owner,'users/owner/verification/1/oversize.jpg'),new Uint8Array(8*1024*1024+1),{contentType:'image/jpeg'}));
 await denied(uploadBytes(ref(owner,'users/owner/intro-video/oversize.mp4'),new Uint8Array(40*1024*1024+1),{contentType:'video/mp4'}));
 console.log(`Storage media cleanup: ${checks} checks passed (owner deletion, cross-account denial, private evidence, type/size limits; localhost only).`);
}
main().finally(()=>Promise.all([...apps.map(deleteApp),admin.deleteApp(server)])).catch(error=>{console.error(error);process.exitCode=1;});
