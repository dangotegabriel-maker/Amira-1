jest.mock('../socialBackend',()=>({invokeSocial:jest.fn()}));
import {invokeSocial} from '../socialBackend';
import {hostConnectService} from '../hostConnectService';
test('Connect requests never send an owner UID or client clock',async()=>{await hostConnectService.availability();await hostConnectService.setAvailability('offline');await hostConnectService.discover('Following');await hostConnectService.today();expect(invokeSocial.mock.calls).toEqual([['getHostAvailability',{}],['setHostAvailability',{availability:'offline'}],['getHostConnectConsumers',{tab:'Following'}],['getHostConnectToday',{}]]);});
