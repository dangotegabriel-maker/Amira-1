const mockAuth={currentUser:null},mockBytes=jest.fn(),mockUpload=jest.fn(),mockUrl=jest.fn(),mockDelete=jest.fn();
jest.mock('../firebaseService',()=>({app:{},auth:mockAuth,firebaseConfig:{storageBucket:'fixture'}}));
jest.mock('expo-file-system',()=>({File:jest.fn(()=>({bytes:mockBytes}))}));
jest.mock('firebase/storage',()=>({getStorage:()=>({}),ref:(_store,path)=>path,uploadBytes:(...args)=>mockUpload(...args),getDownloadURL:mockUrl,deleteObject:(...args)=>mockDelete(...args)}));
const {mediaService}=require('../mediaService');
const priorFlag=process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const input={asset:{uri:'file:///fixture.jpg',mimeType:'image/jpeg'},category:'profile'};
beforeEach(()=>{
 jest.clearAllMocks();process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS='true';
 mockAuth.currentUser={uid:'a',getIdToken:jest.fn(async()=>undefined)};
 mockBytes.mockResolvedValue(new Uint8Array([1,2,3]));mockUpload.mockResolvedValue({});mockUrl.mockResolvedValue('https://example.test/photo');
});
afterAll(()=>{if(priorFlag===undefined)delete process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS;else process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS=priorFlag;});
test.each(['same UID','different UID','context replaced'])('%s during file reading cannot dispatch an old upload',async kind=>{
 const pending=deferred();mockBytes.mockReturnValueOnce(pending.promise);let current=true;
 const task=mediaService.uploadUserMedia({...input,isCurrent:()=>current});
 await Promise.resolve();expect(mockBytes).toHaveBeenCalledTimes(1);
 if(kind==='context replaced')current=false;else mockAuth.currentUser={uid:kind==='same UID'?'a':'b'};
 const rejected=expect(task).rejects.toMatchObject({code:'storage/canceled'});
 pending.resolve(new Uint8Array([1,2,3]));await rejected;
 expect(mockUpload).not.toHaveBeenCalled();expect(mockUrl).not.toHaveBeenCalled();
});
test('replacement during token loading stops before reading or uploading media',async()=>{
 const pending=deferred();mockAuth.currentUser.getIdToken.mockReturnValueOnce(pending.promise);
 const task=mediaService.uploadUserMedia(input);mockAuth.currentUser={uid:'a'};
 const rejected=expect(task).rejects.toMatchObject({code:'storage/canceled'});pending.resolve();await rejected;
 expect(mockBytes).not.toHaveBeenCalled();expect(mockUpload).not.toHaveBeenCalled();
});
test('current owner uploads successfully, while a disabled gate never dispatches',async()=>{
 await expect(mediaService.uploadUserMedia(input)).resolves.toMatchObject({url:'https://example.test/photo',size:3});
 expect(mockUpload).toHaveBeenCalledTimes(1);mockUpload.mockClear();process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS='false';
 await expect(mediaService.uploadUserMedia(input)).rejects.toThrow('unavailable');expect(mockUpload).not.toHaveBeenCalled();
});


test.each(['same UID','different UID','logout','context replaced'])('%s during delete token lookup prevents destructive dispatch',async kind=>{
 const pending=deferred();mockAuth.currentUser.getIdToken.mockReturnValueOnce(pending.promise);let current=true;
 const task=mediaService.deleteOwnedMedia('users/a/gallery/old',{isCurrent:()=>current});
 if(kind==='context replaced')current=false;else mockAuth.currentUser=kind==='logout'?null:{uid:kind==='same UID'?'a':'b'};
 const rejected=expect(task).rejects.toMatchObject({code:'storage/canceled'});pending.resolve();await rejected;
 expect(mockDelete).not.toHaveBeenCalled();
});
test('delete refuses an obsolete caller and a foreign path, but current owner can clean up',async()=>{
 await expect(mediaService.deleteOwnedMedia('users/a/gallery/old',{isCurrent:()=>false})).rejects.toMatchObject({code:'storage/canceled'});
 await expect(mediaService.deleteOwnedMedia('users/b/gallery/old')).rejects.toThrow('cannot be removed');
 expect(mockDelete).not.toHaveBeenCalled();
 await mediaService.deleteOwnedMedia('users/a/gallery/old',{isCurrent:()=>true});
 expect(mockDelete).toHaveBeenCalledTimes(1);
});
test('account replacement during download URL lookup cannot return successful old media',async()=>{
 const pending=deferred();mockUrl.mockReturnValueOnce(pending.promise);
 const task=mediaService.uploadUserMedia(input);
 for(let i=0;i<8;i++)await Promise.resolve();
 expect(mockUrl).toHaveBeenCalledTimes(1);mockAuth.currentUser={uid:'a'};
 const rejected=expect(task).rejects.toMatchObject({code:'storage/canceled'});pending.resolve('https://example.test/old');await rejected;
 expect(mockDelete).not.toHaveBeenCalled();
});
test('uncertain upload acknowledgement never triggers compensating deletion',async()=>{
 mockUpload.mockRejectedValueOnce({code:'storage/retry-limit-exceeded'});
 await expect(mediaService.uploadUserMedia(input)).rejects.toMatchObject({code:'storage/retry-limit-exceeded'});
 expect(mockDelete).not.toHaveBeenCalled();expect(mockUrl).not.toHaveBeenCalled();
});
