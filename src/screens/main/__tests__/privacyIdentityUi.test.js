import React from 'react';
import {act,fireEvent,render} from '@testing-library/react-native';
jest.setTimeout(30000);
let mockUid='owner';
const mockIdentity={calls:jest.fn(),blocked:jest.fn()};
const mockBlock={unblock:jest.fn()};
const mockCall={respond:jest.fn()};
const mockHistory={list:jest.fn(),groupContacts:jest.fn()};
jest.mock('../../../context/UserContext',()=>({useUser:()=>({user:{uid:mockUid,hostStatus:{isApproved:false}}})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:callback=>require('react').useEffect(callback,[callback])}));
jest.mock('../../../services/publicIdentityService',()=>({publicIdentityService:mockIdentity}));
jest.mock('../../../services/blockService',()=>({blockService:mockBlock}));
jest.mock('../../../services/callService',()=>({callService:mockCall}));
jest.mock('../../../services/callHistoryService',()=>({callHistoryService:mockHistory}));
jest.mock('../../../services/messagingService',()=>({messagingService:{subscribeInbox:callback=>{callback([]);return ()=>{};}}}));
jest.mock('../../../services/noticeService',()=>({noticeService:{subscribe:callback=>{callback([]);return ()=>{};}}}));
jest.mock('../../../services/presenceService',()=>({presenceService:{get:async()=>null,isOnline:()=>false}}));
jest.mock('lucide-react-native',()=>({Bell:()=>null,MessageCircle:()=>null,Phone:()=>null}));
const Incoming=require('../../../components/IncomingCallCard').default;
const Blocked=require('../BlockedUsersScreen').default;
const Messages=require('../MessageHomeScreen').default;
const navigation={navigate:jest.fn(),setParams:jest.fn()};
const call={callId:'call',callerId:'caller',expiresAtMs:0};
beforeEach(()=>{jest.clearAllMocks();mockUid='owner';mockIdentity.calls.mockResolvedValue([{callId:'call',identity:{uid:'caller',username:'Real caller',profilePic:''}}]);mockIdentity.blocked.mockResolvedValue([{uid:'target',username:'Owned blocked account',profilePic:''}]);mockHistory.list.mockResolvedValue([]);mockHistory.groupContacts.mockReturnValue([]);});
test('incoming card requests call-authorized identity and leaves response actions intact',async()=>{
 const screen=render(<Incoming call={call} navigation={navigation}/>);await act(async()=>{});
 expect(screen.getByText('Real caller')).toBeTruthy();expect(mockIdentity.calls).toHaveBeenCalledWith(['call']);
 expect(mockCall.respond).not.toHaveBeenCalled();screen.unmount();
});
test('incoming identity failure displays retry and no invented person',async()=>{
 mockIdentity.calls.mockRejectedValueOnce(new Error('Offline'));
 const screen=render(<Incoming call={call} navigation={navigation}/>);await act(async()=>{});
 expect(screen.getByText(/Caller identity unavailable/)).toBeTruthy();
 await act(async()=>fireEvent.press(screen.getByText(' Retry')));
 expect(screen.getByText('Real caller')).toBeTruthy();screen.unmount();
});
test('late incoming identity from previous account cannot replace current account identity',async()=>{
 let resolve;mockIdentity.calls.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
 const screen=render(<Incoming call={call} navigation={navigation}/>);mockUid='second';
 mockIdentity.calls.mockResolvedValue([{identity:{uid:'caller',username:'Current identity'}}]);screen.rerender(<Incoming call={call} navigation={navigation}/>);await act(async()=>{});
 await act(async()=>resolve([{identity:{uid:'caller',username:'Old identity'}}]));
 expect(screen.queryByText('Old identity')).toBeNull();expect(screen.getByText('Current identity')).toBeTruthy();screen.unmount();
});
test('blocked management uses owned projection and an authorized unblock',async()=>{
 const screen=render(<Blocked/>);await act(async()=>{});expect(screen.getByText('Owned blocked account')).toBeTruthy();
 await act(async()=>fireEvent.press(screen.getByText('Unblock')));expect(mockBlock.unblock).toHaveBeenCalledWith('target');expect(screen.queryByText('Owned blocked account')).toBeNull();screen.unmount();
});
test('blocked projection error is distinct from empty and can retry',async()=>{
 mockIdentity.blocked.mockRejectedValueOnce(new Error('Offline'));const screen=render(<Blocked/>);await act(async()=>{});
 expect(screen.getByText('Blocked users could not be loaded.')).toBeTruthy();expect(screen.queryByText('No blocked users')).toBeNull();
 await act(async()=>fireEvent.press(screen.getByText('Retry')));expect(screen.getByText('Owned blocked account')).toBeTruthy();screen.unmount();
});
test('Calls tab displays hydration failure with retry instead of empty history',async()=>{
 mockHistory.groupContacts.mockReturnValue([{uid:'target',lastCall:{callId:'call'}}]);mockIdentity.calls.mockRejectedValueOnce(new Error('Offline'));
 const screen=render(<Messages navigation={navigation} route={{params:{}}}/>);await act(async()=>{});fireEvent.press(screen.getByText('CALLS'));
 expect(screen.getByText('Unable to load call identities. Please retry.')).toBeTruthy();expect(screen.queryByText('No call history yet.')).toBeNull();
 await act(async()=>fireEvent.press(screen.getByText('Retry')));expect(screen.getByText('Real caller')).toBeTruthy();screen.unmount();
});
test('blocked historical call contacts cannot navigate to a new chat',async()=>{
 mockHistory.groupContacts.mockReturnValue([{uid:'target',lastCall:{callId:'call'}}]);mockIdentity.calls.mockResolvedValue([{callId:'call',identity:{uid:'target',username:'Historical participant'},canInteract:false}]);
 const screen=render(<Messages navigation={navigation} route={{params:{}}}/>);await act(async()=>{});fireEvent.press(screen.getByText('CALLS'));fireEvent.press(screen.getByText('Historical participant'));expect(navigation.navigate).not.toHaveBeenCalled();screen.unmount();
});
