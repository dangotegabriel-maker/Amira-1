import React from 'react';
import {act,fireEvent,render} from '@testing-library/react-native';
jest.setTimeout(30000);
let mockUid='owner';
const mockIdentity={calls:jest.fn(),blocked:jest.fn()};
const mockBlock={unblock:jest.fn()};
const mockCall={respond:jest.fn()};
const mockHistory={listPage:jest.fn()};
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
const historyRecord={id:'call',callId:'call',callerId:'owner',receiverId:'target',participantIds:['owner','target'],status:'ended',connectedAt:new Date(Date.now()-222000),endedAt:new Date(),createdAt:new Date(Date.now()-300000),durationSeconds:222};
beforeEach(()=>{jest.clearAllMocks();mockUid='owner';mockIdentity.calls.mockResolvedValue([{callId:'call',identity:{uid:'caller',username:'Real caller',profilePic:''}}]);mockIdentity.blocked.mockResolvedValue([{uid:'target',username:'Owned blocked account',profilePic:''}]);mockHistory.listPage.mockResolvedValue({records:[],cursor:null,hasMore:false});});
test('incoming card requests call-authorized identity and leaves response actions intact',async()=>{
 const screen=render(<Incoming call={call} navigation={navigation}/>);await act(async()=>{});
 expect(screen.getByText('Real caller')).toBeTruthy();expect(mockIdentity.calls).toHaveBeenCalledWith(['call']);
 expect(mockCall.respond).not.toHaveBeenCalled();screen.unmount();
});
test('incoming card shows only authoritative Level and active VIP presentation',async()=>{
 mockIdentity.calls.mockResolvedValue([{callId:'call',identity:{uid:'caller',username:'Real caller',profilePic:'',level:4,vipActive:true}}]);
 const screen=render(<Incoming call={call} navigation={navigation}/>);await act(async()=>{});
 expect(screen.getByLabelText('Amira Level 4')).toBeTruthy();expect(screen.getByLabelText('VIP caller')).toBeTruthy();expect(screen.queryByText(/Friends|Credits|spender/i)).toBeNull();screen.unmount();
});
test('missing or malformed incoming Level and inactive VIP display no badges',async()=>{
 mockIdentity.calls.mockResolvedValue([{callId:'call',identity:{uid:'caller',username:'Real caller',profilePic:'',level:99,vipActive:false}}]);
 const screen=render(<Incoming call={call} navigation={navigation}/>);await act(async()=>{});
 expect(screen.queryByLabelText(/Amira Level/)).toBeNull();expect(screen.queryByLabelText('VIP caller')).toBeNull();screen.unmount();
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
test('Calls tab displays initial page failure with working first-page retry instead of empty history',async()=>{
 mockHistory.listPage.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({records:[historyRecord],cursor:null,hasMore:false});
 const screen=render(<Messages navigation={navigation} route={{params:{}}}/>);await act(async()=>{});fireEvent.press(screen.getByText('CALLS'));
 expect(screen.getByText("Couldn't load call history.")).toBeTruthy();expect(screen.queryByText('No video calls yet.')).toBeNull();
 await act(async()=>fireEvent.press(screen.getByText('Retry')));expect(mockHistory.listPage.mock.calls.slice(0,2)).toEqual([[],[]]);expect(screen.getByText('Real caller')).toBeTruthy();screen.unmount();
});
test('older-page failure keeps rows, retries the same cursor, clears on success, and refresh resets stale pagination error',async()=>{
 const older={...historyRecord,id:'older',callId:'older',createdAt:new Date(Date.now()-600000),endedAt:new Date(Date.now()-500000)};
 const cursor1={id:'cursor-1'},cursor2={id:'cursor-2'};
 mockHistory.listPage.mockReset().mockResolvedValueOnce({records:[historyRecord],cursor:cursor1,hasMore:true}).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({records:[older],cursor:cursor2,hasMore:true}).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({records:[historyRecord],cursor:null,hasMore:false});
 mockIdentity.calls.mockImplementation(async ids=>ids.map(callId=>({callId,identity:{uid:'target',username:callId==='older'?'Older participant':'Current participant',profilePic:''},canInteract:true})));
 const screen=render(<Messages navigation={navigation} route={{params:{}}}/>);await act(async()=>{});fireEvent.press(screen.getByText('CALLS'));expect(screen.getByText('Current participant')).toBeTruthy();
 const list=()=>screen.UNSAFE_getByType(require('react-native').FlatList);
 await act(async()=>list().props.onEndReached());expect(screen.getByText('Current participant')).toBeTruthy();expect(screen.getByText('Unable to load more call history.')).toBeTruthy();
 await act(async()=>fireEvent.press(screen.getByText('Retry older calls')));expect(mockHistory.listPage.mock.calls.slice(0,3)).toEqual([[],[{cursor:cursor1}],[{cursor:cursor1}]]);expect(screen.getByText('Older participant')).toBeTruthy();expect(screen.queryByText('Unable to load more call history.')).toBeNull();
 await act(async()=>list().props.onEndReached());expect(screen.getByText('Unable to load more call history.')).toBeTruthy();
 await act(async()=>list().props.onRefresh());expect(mockHistory.listPage.mock.calls[4]).toEqual([]);expect(screen.queryByText('Unable to load more call history.')).toBeNull();expect(screen.getByText('Current participant')).toBeTruthy();expect(screen.queryByText('Older participant')).toBeNull();screen.unmount();
});
test('blocked historical call contacts cannot navigate to a new chat',async()=>{
 mockHistory.listPage.mockResolvedValue({records:[historyRecord],cursor:null,hasMore:false});mockIdentity.calls.mockResolvedValue([{callId:'call',identity:{uid:'target',username:'Historical participant'},canInteract:false}]);
 const screen=render(<Messages navigation={navigation} route={{params:{}}}/>);await act(async()=>{});fireEvent.press(screen.getByText('CALLS'));expect(screen.getByText(/Video call · 3:42/)).toBeTruthy();expect(screen.queryByText(/Credits|billed|rate/i)).toBeNull();fireEvent.press(screen.getByText('Historical participant'));expect(navigation.navigate).not.toHaveBeenCalled();screen.unmount();
});
