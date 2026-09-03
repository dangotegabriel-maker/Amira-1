import { canUseCallSimulator } from '../devFeatures';
test('call simulator is excluded from production even when flag is enabled',()=>expect(canUseCallSimulator({isDev:false,enabled:true})).toBe(false));
test('call simulator requires both development and explicit flag',()=>{expect(canUseCallSimulator({isDev:true,enabled:false})).toBe(false);expect(canUseCallSimulator({isDev:true,enabled:true})).toBe(true);});
