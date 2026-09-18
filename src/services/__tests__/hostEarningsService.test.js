let mockCallback;
const mockStop=jest.fn(),mockAuth={currentUser:{uid:'h'}};
jest.mock('firebase/firestore',()=>({doc:(_db,...parts)=>parts.join('/'),onSnapshot:jest.fn((path,callback)=>{mockCallback=callback;return mockStop;})}));
jest.mock('../firebaseService',()=>({auth:mockAuth,db:{}}));
const {onSnapshot}=require('firebase/firestore'),{hostEarningsService,readPendingEarnings}=require('../hostEarningsService');
beforeEach(()=>{jest.clearAllMocks();mockAuth.currentUser={uid:'h'};});
test('subscription can only select the signed-in account earnings document',()=>{const value=jest.fn(),error=jest.fn();const stop=hostEarningsService.subscribe(value,error,'other-host');expect(onSnapshot).toHaveBeenCalledWith('hostEarnings/h',expect.any(Function),error);mockCallback({exists:()=>true,data:()=>({pendingCreditsEquivalent:8,platformFeeCredits:99,available:100})});expect(value).toHaveBeenCalledWith({pendingCreditsEquivalent:8});expect(stop).toBe(mockStop);});
test('absence of accounting records has zero pending; invalid records are errors',()=>{expect(readPendingEarnings(null)).toEqual({pendingCreditsEquivalent:0});for(const data of [{},{pendingCreditsEquivalent:-1},{pendingCreditsEquivalent:'GHS 12'}])expect(()=>readPendingEarnings(data)).toThrow('Invalid earnings');});
test('unauthenticated users cannot subscribe',()=>{mockAuth.currentUser=null;expect(()=>hostEarningsService.subscribe(jest.fn())).toThrow('Sign in');expect(onSnapshot).not.toHaveBeenCalled();});
