import {publicIdentityService} from '../publicIdentityService';
import {auth} from '../firebaseService';
import {invokeSocial} from '../socialBackend';
jest.mock('../firebaseService',()=>({auth:{currentUser:{uid:'owner'}}}));
jest.mock('../socialBackend',()=>({invokeSocial:jest.fn()}));
beforeEach(()=>{jest.resetAllMocks();auth.currentUser={uid:'owner'};});
test('calls hydrate sequential batches of at most 30, without UID directory requests',async()=>{
 invokeSocial.mockImplementation(async(_name,{callIds})=>({participants:callIds.map(callId=>({callId,identity:{uid:'target'}}))}));
 const result=await publicIdentityService.calls(Array.from({length:65},(_,i)=>`call${i}`));
 expect(result).toHaveLength(65);expect(invokeSocial.mock.calls.map(args=>args[1].callIds.length)).toEqual([30,30,5]);
 expect(invokeSocial.mock.calls.every(args=>args[0]==='getCallParticipantIdentities')).toBe(true);
});
test('empty call history needs no identity requests',async()=>{expect(await publicIdentityService.calls([])).toEqual([]);expect(invokeSocial).not.toHaveBeenCalled();});
test('account changes reject an in-flight identity instead of displaying a previous account result',async()=>{
 invokeSocial.mockImplementation(async()=>{auth.currentUser={uid:'other'};return {identity:{uid:'target'}};});
 await expect(publicIdentityService.message('target')).rejects.toThrow('Account changed');
});
test('sign-out cannot hydrate identities',async()=>{auth.currentUser=null;await expect(publicIdentityService.blocked()).rejects.toThrow('Sign in');expect(invokeSocial).not.toHaveBeenCalled();});
test('projection failure remains an error and has no raw-profile fallback',async()=>{
 invokeSocial.mockRejectedValue(new Error('Network unavailable'));await expect(publicIdentityService.message('target')).rejects.toThrow('Network unavailable');
});
test('blocked management requests only this owner and no target UID batch',async()=>{
 invokeSocial.mockResolvedValue({people:[{uid:'target',username:'Actual name',profilePic:''}]});expect(await publicIdentityService.blocked()).toHaveLength(1);expect(invokeSocial).toHaveBeenCalledWith('listOwnedBlockedIdentities',{});
});
