jest.mock('../socialBackend',()=>({invokeSocial:jest.fn()}));
import {invokeSocial} from '../socialBackend';
import {amiraIdentityService} from '../amiraIdentityService';
test('identity ensure has no requested ID, target UID, role or seed',async()=>{await amiraIdentityService.ensure();expect(invokeSocial).toHaveBeenCalledWith('ensureAmiraId',{});});
