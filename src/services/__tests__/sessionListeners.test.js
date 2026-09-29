import { AppState } from 'react-native';
const mockAuth={currentUser:null}, mockWrite=jest.fn();
jest.mock('../firebaseService',()=>({auth:mockAuth,db:{}}));
jest.mock('firebase/firestore',()=>({doc:(_db,...parts)=>parts.join('/'),setDoc:(...args)=>mockWrite(...args),serverTimestamp:()=>0}));
const {presenceService}=require('../presenceService');
const {socketService}=require('../socketService');
let listeners, token;
const start=uid=>{mockAuth.currentUser={uid};const session={isCurrent:()=>token===session};token=session;return presenceService.start(session);};
beforeEach(()=>{jest.useFakeTimers();listeners=[];token=null;mockAuth.currentUser=null;mockWrite.mockReset().mockResolvedValue();AppState.currentState='active';jest.spyOn(AppState,'addEventListener').mockImplementation((_event,callback)=>{const item={callback,remove:jest.fn()};listeners.push(item);return item;});});
afterEach(()=>{presenceService.stop();socketService.disconnect();jest.restoreAllMocks();jest.useRealTimers();});
test.each(['b','a'])('presence A -> %s replacement never writes replacement offline from old cleanup/event',uid=>{
  const stopA=start('a'),old=listeners[0];start(uid);mockWrite.mockClear();stopA();old.callback('background');expect(mockWrite).not.toHaveBeenCalled();
  listeners[1].callback('background');expect(mockWrite).toHaveBeenCalledWith(`presence/${uid}`,expect.objectContaining({uid,state:'offline'}),{merge:true});expect(old.remove).toHaveBeenCalledTimes(1);
});
test('logout and queued foreground event cannot write for a signed-out session',()=>{const stop=start('a');token=null;mockAuth.currentUser=null;mockWrite.mockClear();stop();listeners[0].callback('active');expect(mockWrite).not.toHaveBeenCalled();expect(listeners[0].remove).toHaveBeenCalledTimes(1);});
test('current presence cleanup writes only its own offline state and detaches once',()=>{const stop=start('a');mockWrite.mockClear();stop();stop();expect(mockWrite).toHaveBeenCalledTimes(1);expect(mockWrite.mock.calls[0][0]).toBe('presence/a');expect(listeners[0].remove).toHaveBeenCalledTimes(1);});
test('presence starts offline when app is backgrounded',()=>{AppState.currentState='background';start('a');expect(mockWrite.mock.calls[0][1].state).toBe('offline');});
test('legacy socket attaches only on connect and disconnect clears AppState/grace/heartbeat',()=>{
  expect(listeners).toHaveLength(0);socketService.connect('a');socketService.connect('a');expect(listeners).toHaveLength(1);
  listeners[0].callback('inactive');listeners[0].callback('background');expect(jest.getTimerCount()).toBe(2);
  socketService.disconnect();expect(listeners[0].remove).toHaveBeenCalledTimes(1);expect(jest.getTimerCount()).toBe(0);
  listeners[0].callback('background');expect(jest.getTimerCount()).toBe(0);
});

test('removed socket callback cannot change a replacement connection',()=>{socketService.connect('a');const old=listeners[0];socketService.connect('b');old.callback('background');expect(jest.getTimerCount()).toBe(1);expect(socketService.userId).toBe('b');});
