jest.mock('../socialBackend',()=>({invokeSocial:jest.fn()}));
import {invokeSocial} from '../socialBackend';
import {hostActivityService} from '../hostActivityService';
test('Activity owner is never client supplied, public profile passes only target identity',async()=>{invokeSocial.mockResolvedValue({events:[]});await hostActivityService.list('Visitors');await hostActivityService.getConsumer('c');expect(invokeSocial.mock.calls).toEqual([['getHostActivity',{tab:'Visitors'}],['getPublicConsumerProfile',{consumerUid:'c'}]]);});
