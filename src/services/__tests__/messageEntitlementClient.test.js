const mockInvoke=jest.fn(),mockTransaction=jest.fn();
jest.mock('../socialBackend',()=>({invokeSocial:(...args)=>mockInvoke(...args)}));
jest.mock('../firebaseService',()=>({auth:{currentUser:{uid:'c'}},db:{},dbService:{}}));
jest.mock('../blockService',()=>({blockService:{}}));
jest.mock('firebase/firestore',()=>({doc:jest.fn(()=>({id:'generated'})),collection:jest.fn(),getDoc:jest.fn(),
 runTransaction:(...args)=>mockTransaction(...args),serverTimestamp:()=> 'server-time'}));
const {messagingService}=require('../messagingService');
const {profileViewService}=require('../profileViewService');
beforeEach(()=>jest.clearAllMocks());
test('send submits identity/text to backend and performs no client balance transaction',async()=>{
 mockInvoke.mockResolvedValue({conversationId:'c__h'});
 expect(await messagingService.sendText('h','Hello',false,'retry-id')).toBe('c__h');
 expect(mockInvoke).toHaveBeenCalledWith('sendTextMessage',{receiverId:'h',text:'Hello',type:'text',messageId:'retry-id'});
 expect(mockTransaction).not.toHaveBeenCalled();
});
test('markRead updates only receipt/unread fields and never invokes entitlement consumption',async()=>{
 const tx={get:async()=>({exists:()=>true,data:()=>({participantIds:['c','h']})}),update:jest.fn()};
 mockTransaction.mockImplementation(async(db,cb)=>cb(tx));await messagingService.markRead('c__h');
 expect(tx.update).toHaveBeenCalledWith(expect.anything(),{'unreadCounts.c':0,'lastReadAt.c':'server-time',updatedAt:'server-time'});
 expect(mockInvoke).not.toHaveBeenCalled();
});
test('profile views use trusted tracking and cannot request another owner visitor list',async()=>{
 mockInvoke.mockResolvedValue({counted:true});expect(await profileViewService.track('h')).toBe(true);
 expect(mockInvoke).toHaveBeenCalledWith('trackProfileView',{ownerUid:'h'});
 expect(await profileViewService.track('c')).toBe(false);
 await expect(profileViewService.list('h')).rejects.toThrow('private');
});
