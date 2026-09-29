import React from 'react';
import { AppState, Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
jest.setTimeout(30000);
let mockUser, mockSession, mockApp;
const mockOffer=jest.fn(), mockRespond=jest.fn(), mockBlock=jest.fn(), mockNavigate=jest.fn();
jest.mock('../../context/UserContext',()=>({useUser:()=>({user:mockUser,authenticatedSession:mockSession})}));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({navigate:mockNavigate})}));
jest.mock('../../services/quickMatchService',()=>({quickMatchService:{offer:()=>mockOffer(),respond:(...args)=>mockRespond(...args)}}));
jest.mock('../../services/blockService',()=>({blockService:{getRelationship:(...args)=>mockBlock(...args)}}));
const Owner=require('../QuickMatchListener').default;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const session=()=>{const token={isCurrent:()=>mockSession===token};mockSession=token;};
const offer=()=>({requestId:'request',consumerUid:'consumer',deadlineMs:Date.now()+20000,identity:{uid:'consumer',username:'Public Consumer'}});
const flush=async()=>act(async()=>{});
beforeEach(()=>{jest.useFakeTimers();jest.clearAllMocks();session();mockUser={uid:'host',hostStatus:{isApproved:true,availability:'online'}};AppState.currentState='active';
  jest.spyOn(AppState,'addEventListener').mockImplementation((_event,cb)=>{mockApp=cb;return{remove:jest.fn()};});jest.spyOn(Alert,'alert').mockImplementation(()=>{});
  mockOffer.mockReset().mockResolvedValue({offer:offer()});mockRespond.mockReset().mockResolvedValue({status:'connecting',callId:'call'});mockBlock.mockReset().mockResolvedValue({blocked:false});});
afterEach(()=>{jest.restoreAllMocks();jest.useRealTimers();});
test('one root poll survives tab/nested child changes and never overlaps a slow request',async()=>{
  const pending=deferred();mockOffer.mockReturnValueOnce(pending.promise);const screen=render(<Owner enabled/>);
  for(const route of ['Messages','Activity','Profile','ChatDetail']){screen.rerender(<Owner enabled route={route}/>);await act(async()=>jest.advanceTimersByTime(5000));}
  expect(mockOffer).toHaveBeenCalledTimes(1);await act(async()=>pending.resolve({offer:offer()}));expect(screen.getByText('Public Consumer')).toBeTruthy();
});
test.each(['consumer','pending','offline','busy'])('%s attaches no Host offer poll',async kind=>{
  mockUser.hostStatus={isApproved:!['consumer','pending'].includes(kind),availability:['offline','busy'].includes(kind)?kind:'online'};
  render(<Owner enabled/>);await flush();expect(mockOffer).not.toHaveBeenCalled();
});
test.each(['different UID','same UID','logout','unmount'])('%s makes pending offer and errors harmless',async kind=>{
  const pending=deferred();mockOffer.mockReturnValueOnce(pending.promise);const screen=render(<Owner enabled/>);
  if(kind==='unmount')screen.unmount();else{session();if(kind==='different UID')mockUser={...mockUser,uid:'b'};if(kind==='logout'){mockUser=null;mockSession=null;}screen.rerender(<Owner enabled/>);}
  await act(async()=>pending.reject(new Error('obsolete')));expect(Alert.alert).not.toHaveBeenCalled();
  if(kind!=='unmount')expect(screen.queryByText(/offers unavailable/)).toBeNull();
});
test('foreground reattaches; background ignores pending response',async()=>{
  const pending=deferred();mockOffer.mockReturnValueOnce(pending.promise);const screen=render(<Owner enabled/>);
  act(()=>{AppState.currentState='background';mockApp('background');});await act(async()=>pending.resolve({offer:offer()}));expect(screen.queryByText('Quick Match')).toBeNull();
  act(()=>{AppState.currentState='active';mockApp('active');});await flush();expect(screen.getByText('Quick Match')).toBeTruthy();
});
test('incoming-call precedence suppresses only presentation; blocked/expired offers never present',async()=>{
  const screen=render(<Owner enabled suppressed/>);await flush();expect(screen.queryByText('Public Consumer')).toBeNull();screen.rerender(<Owner enabled/>);await flush();expect(screen.getByText('Public Consumer')).toBeTruthy();
  mockBlock.mockResolvedValue({blocked:true});await act(async()=>jest.advanceTimersByTime(5000));expect(screen.queryByText('Public Consumer')).toBeNull();
});
test('retry replaces timer and duplicate accept presses navigate once even after Host becomes busy',async()=>{
  mockOffer.mockRejectedValueOnce(new Error('offline'));const screen=render(<Owner enabled/>);await flush();fireEvent.press(screen.getByText(/offers unavailable/));await flush();
  const pending=deferred();mockRespond.mockReturnValueOnce(pending.promise);await act(async()=>{fireEvent.press(screen.getByText('Accept'));fireEvent.press(screen.getByText('Accept'));});expect(mockRespond).toHaveBeenCalledTimes(1);
  mockUser={...mockUser,hostStatus:{isApproved:true,availability:'busy'}};screen.rerender(<Owner enabled/>);await act(async()=>pending.resolve({callId:'call',status:'connecting'}));expect(mockNavigate).toHaveBeenCalledTimes(1);
});
test('obsolete accept completion cannot navigate or alert a same-UID session',async()=>{
  const screen=render(<Owner enabled/>);await flush();const pending=deferred();mockRespond.mockReturnValueOnce(pending.promise);await act(async()=>{fireEvent.press(screen.getByText('Accept'));});session();screen.rerender(<Owner enabled/>);await act(async()=>pending.reject(new Error('old')));expect(mockNavigate).not.toHaveBeenCalled();expect(Alert.alert).not.toHaveBeenCalled();
});

test('accept completion in background cannot navigate',async()=>{
 const screen=render(<Owner enabled/>);await flush();const pending=deferred();mockRespond.mockReturnValueOnce(pending.promise);
 await act(async()=>{fireEvent.press(screen.getByText('Accept'));});
 act(()=>{AppState.currentState='background';mockApp('background');});
 await act(async()=>pending.resolve({callId:'call',status:'connecting'}));expect(mockNavigate).not.toHaveBeenCalled();
});

test('offer expiring during block check cannot send an acceptance',async()=>{
 const screen=render(<Owner enabled/>);await flush();const pending=deferred();mockBlock.mockReturnValueOnce(pending.promise);
 act(()=>{fireEvent.press(screen.getByText('Accept'));});jest.setSystemTime(Date.now()+21000);
 await act(async()=>pending.resolve({blocked:false}));expect(mockRespond).not.toHaveBeenCalled();expect(mockNavigate).not.toHaveBeenCalled();
});
test('declined replay remains dismissed and expiry dismisses without a new poll',async()=>{
  const screen=render(<Owner enabled/>);await flush();await act(async()=>{fireEvent.press(screen.getByText('Decline'));});await act(async()=>jest.advanceTimersByTime(5000));expect(screen.queryByText('Public Consumer')).toBeNull();
  screen.unmount();const next=render(<Owner enabled/>);await flush();mockOffer.mockReturnValue(new Promise(()=>{}));await act(async()=>jest.advanceTimersByTime(21000));expect(next.queryByText('Public Consumer')).toBeNull();
});
