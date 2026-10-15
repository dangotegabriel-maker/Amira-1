const mockDocs=new Map(),mockWrites=[],mockAuth={currentUser:null};
let mockAfterRead;
jest.mock('firebase/firestore',()=>({doc:(_db,...parts)=>parts.join('/'),getDoc:jest.fn(),getDocFromServer:jest.fn(),serverTimestamp:()=>123,
 runTransaction:async(_db,work)=>work({get:async(path)=>{const result={exists:()=>mockDocs.has(path),data:()=>mockDocs.get(path)};mockAfterRead?.();return result;},set:(...args)=>mockWrites.push(args)})}));
jest.mock('../firebaseService',()=>({auth:mockAuth,db:{}}));
const {hostApplicationService}=require('../hostApplicationService');
const application=()=>({ownerUid:'p',status:'in_progress',media:{profilePhoto:{url:'test-photo'},introVideo:{url:'test-video',path:'test-path'}},verification:{evidence:Array.from({length:5},(_,order)=>({order,path:`test-evidence-${order}`}))},payoutSetup:{method:'Bank Transfer'}});
beforeEach(()=>{mockAuth.currentUser={uid:'p'};mockAfterRead=null;mockDocs.clear();mockWrites.length=0;mockDocs.set('users/p',{dob:'1990-01-01',role:'consumer',hostStatus:{isApproved:false},hostProfile:{videoRateCredits:50,rateTier:'STANDARD'}});mockDocs.set('hostApplications/p',application());});
test('complete fixture submits without Host approval or price writes',async()=>{
 await expect(hostApplicationService.submit()).resolves.toEqual({success:true});
 expect(mockWrites[0]).toEqual(['hostApplications/p',expect.objectContaining({status:'submitted'}),{merge:true}]);
 const [,profile]=mockWrites.find(([path])=>path==='users/p');expect(profile.role).toBe('consumer');expect(profile.hostStatus).toMatchObject({hasApplied:true,verificationStatus:'pending'});
 expect(profile.hostStatus.isApproved).toBeUndefined();expect(profile.hostProfile.videoRateCredits).toBeUndefined();expect(profile.hostProfile.rateTier).toBeUndefined();
});
test('old pending Host role is corrected to Consumer at submission',async()=>{mockDocs.get('users/p').role='host';await hostApplicationService.submit();expect(mockWrites.find(([path])=>path==='users/p')[1].role).toBe('consumer');});
test.each(['submitted','pending','under_review','approved'])('%s application cannot reset through draft or submission',async(status)=>{
 mockDocs.get('hostApplications/p').status=status;await expect(hostApplicationService.submit()).rejects.toThrow(/review|approved/);await expect(hostApplicationService.saveDraft({details:{bio:'x'}})).rejects.toThrow(/review|approved/);expect(mockWrites).toHaveLength(0);
});
test('missing real media or insufficient evidence never fakes submission success',async()=>{
 delete mockDocs.get('hostApplications/p').media.introVideo;await expect(hostApplicationService.submit()).rejects.toThrow('video');expect(mockWrites).toHaveLength(0);
 mockDocs.set('hostApplications/p',application());mockDocs.get('hostApplications/p').verification.evidence.length=1;await expect(hostApplicationService.submit()).rejects.toThrow('evidence');expect(mockWrites).toHaveLength(0);
});
test('approved accounts cannot submit or save applications',async()=>{mockDocs.get('users/p').hostStatus.isApproved=true;await expect(hostApplicationService.submit()).rejects.toThrow('approved Host');await expect(hostApplicationService.saveDraft({})).rejects.toThrow('Consumer');expect(mockWrites).toHaveLength(0);});
test('draft only writes application fields; payload cannot override review status or owner',async()=>{
 await hostApplicationService.saveDraft({details:{bio:'draft'},status:'approved',ownerUid:'other',isApproved:true});
 expect(mockWrites).toEqual([['hostApplications/p',{details:{bio:'draft'},ownerUid:'p',status:'in_progress',updatedAt:123},{merge:true}]]);
});


test('Creator recovery requires a server draft and never falls back to stale cached metadata',async()=>{
 const {getDoc,getDocFromServer}=require('firebase/firestore');getDoc.mockClear();
 getDocFromServer.mockRejectedValueOnce(new Error('offline'));
 await expect(hostApplicationService.getApplication({requireServer:true})).rejects.toThrow('offline');
 expect(getDoc).not.toHaveBeenCalled();
 getDocFromServer.mockResolvedValueOnce({id:'p',exists:()=>true,data:()=>application()});
 await expect(hostApplicationService.getApplication({requireServer:true})).resolves.toMatchObject({id:'p',status:'in_progress'});
});


test.each(['same UID','different UID','logout','context replaced'])('draft transaction rejects %s before writes',async kind=>{
 let current=true;
 mockAfterRead=()=>{if(kind==='context replaced')current=false;else mockAuth.currentUser=kind==='logout'?null:{uid:kind==='same UID'?'p':'other'};};
 await expect(hostApplicationService.saveDraft({verification:{evidence:[]}},{isCurrent:()=>current})).rejects.toMatchObject({code:'application/session-changed'});
 expect(mockWrites).toHaveLength(0);
});
test('submission transaction does not continue after session replacement during reads',async()=>{
 mockAfterRead=()=>{mockAuth.currentUser={uid:'p'};};
 await expect(hostApplicationService.submit()).rejects.toMatchObject({code:'application/session-changed'});
 expect(mockWrites).toHaveLength(0);
});
test('authoritative reload from an old session is not returned to its caller',async()=>{
 const {getDocFromServer}=require('firebase/firestore');let finish;
 getDocFromServer.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const pending=hostApplicationService.getApplication({requireServer:true});mockAuth.currentUser={uid:'p'};
 const rejected=expect(pending).rejects.toMatchObject({code:'application/session-changed'});
 finish({exists:()=>true,data:()=>application()});await rejected;
});
