let mockAuthenticatedSession;
const mockNewSession=()=>{const token={isCurrent:()=>mockAuthenticatedSession===token};mockAuthenticatedSession=token;};
import React from 'react';
import { Alert, AppState, FlatList } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
let mockMessages=[], mockConversation=null, mockRole='consumer', mockTargetRole='host';
let mockFocused=true;
const mockMessaging={getConversationId:()=> 'c__h',prepareConversation:jest.fn(async()=>({exists:true})),
 subscribeMessages:jest.fn((id,cb)=>{cb(mockMessages);return()=>{};}),subscribeConversation:jest.fn((id,cb)=>{cb(mockConversation);return()=>{};}),
 markRead:jest.fn(async()=>{}),createMessageId:jest.fn(()=> 'stable-id'),sendText:jest.fn()};
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>mockFocused}));
jest.mock('../../../context/MessageActivityContext',()=>({useMessageActivity:()=>({setActiveConversation:()=>{}})}));
jest.mock('../../../services/chatPassService',()=>({CHAT_PASS_COPY:'1 Chat Pass unlocks a conversation for 24 hours.',chatAccessLabel:()=>'',chatPassService:{getAccess:async()=>({balance:3})}}));
jest.mock('../../../services/publicIdentityService',()=>({publicIdentityService:{message:async()=>({uid:'h',username:'Ken',role:mockTargetRole==='host'?'host':'consumer',hostStatus:{isApproved:mockTargetRole==='host'}})}}));
jest.mock('../../../services/followService',()=>({followService:{subscribeRelationship:()=>()=>{}}}));
jest.mock('../../../services/callNavigationService',()=>({startVideoCall:jest.fn()}));
jest.mock('../../../services/sponsoredInviteService',()=>({sponsoredInviteService:{send:jest.fn()}}));
jest.mock('../../../context/UserContext',()=>({useUser:()=>({authenticatedSession:mockAuthenticatedSession,user:{uid:'c',role:mockRole,hostStatus:{isApproved:mockRole==='host'}}})}));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({bottom:24})}));
jest.mock('../../../services/messagingService',()=>({messagingService:mockMessaging}));
jest.mock('../../../services/blockService',()=>({blockService:{getRelationship:jest.fn(async()=>({blocked:false})),block:jest.fn(),unblock:jest.fn()}}));
jest.mock('../../../services/reportService',()=>({reportService:{}}));
jest.mock('../../../components/ReportUserModal',()=>()=>null);
jest.mock('../../../components/GiftTray',()=>({visible})=>visible?require('react').createElement(require('react-native').Text,null,'Authoritative Gift Tray'):null);
jest.mock('lucide-react-native',()=>({MoreVertical:()=>null,Send:()=>null,Video:()=>null,Gift:()=>null}));
const Chat=require('../ChatDetailScreen').default;
const navigation={setOptions:jest.fn(),navigate:jest.fn()};
const open=async()=>{const screen=render(<Chat route={{params:{userId:'h',name:'Ken'}}} navigation={navigation}/>);await act(async()=>{});return screen;};
beforeEach(()=>{mockFocused=true;mockNewSession();mockRole='consumer';mockTargetRole='host';AppState.currentState='active';jest.clearAllMocks();mockMessages=[];mockConversation=null;jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());

test('temporary blur keeps draft but invalidates old callbacks; recipient change clears draft',async()=>{
 const screen=await open();fireEvent.changeText(screen.getByPlaceholderText('Type a message...'),'Unsent draft');
 mockFocused=false;screen.rerender(<Chat route={{params:{userId:'h'}}} navigation={navigation}/>);
 mockFocused=true;screen.rerender(<Chat route={{params:{userId:'h'}}} navigation={navigation}/>);await act(async()=>{});
 expect(screen.getByDisplayValue('Unsent draft')).toBeTruthy();
 screen.rerender(<Chat route={{params:{userId:'other'}}} navigation={navigation}/>);await act(async()=>{});
 expect(screen.queryByDisplayValue('Unsent draft')).toBeNull();
});

test('chat preserves chronological snapshot order and unsubscribes on conversation change/unmount',async()=>{
 const stopOld=jest.fn(),stopNew=jest.fn();
 jest.spyOn(mockMessaging,'getConversationId').mockImplementation((uid,target)=>`${uid}__${target}`);
 mockMessaging.subscribeMessages.mockImplementationOnce((id,cb)=>{
   cb([{id:'older',senderId:'h',text:'Older'},{id:'newer',senderId:'h',text:'Newer'}]);
   return stopOld;
 }).mockImplementationOnce((id,cb)=>{cb([]);return stopNew;});
 const screen=await open();
 const list=screen.UNSAFE_getByType(FlatList);
 expect(list.props.data.map(item=>item.id)).toEqual(['older','newer']);
 expect(list.props.inverted).not.toBe(true);
 expect(list.props.onEndReached).toBeUndefined();
 screen.rerender(<Chat route={{params:{userId:'other'}}} navigation={navigation}/>);
 await act(async()=>{});
 expect(stopOld).toHaveBeenCalledTimes(1);
 expect(mockMessaging.subscribeMessages.mock.calls.map(args=>args[0])).toEqual(['c__h','c__other']);
 screen.unmount();
 expect(stopNew).toHaveBeenCalledTimes(1);
});
test('out-of-messages state retains draft and offers existing Rewards route',async()=>{
 mockMessaging.sendText.mockRejectedValue({details:{reason:'insufficient_chat_passes'}});
 const screen=await open();fireEvent.changeText(screen.getByPlaceholderText('Type a message...'),'Hello');
 await act(async()=>fireEvent.press(screen.getByLabelText('Send message')));
 expect(Alert.alert).toHaveBeenCalledWith('You need a Chat Pass to continue this conversation.',expect.any(String),expect.any(Array));
 expect(screen.getByDisplayValue('Hello')).toBeTruthy();
 const actions=Alert.alert.mock.calls[0][2];actions[0].onPress();expect(navigation.navigate).toHaveBeenCalledWith('Rewards');
 screen.unmount();
});
test('network retry reuses logical send identity and success clears draft',async()=>{
 mockMessaging.sendText.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce('c__h');
 const screen=await open();fireEvent.changeText(screen.getByPlaceholderText('Type a message...'),'Hello');
 await act(async()=>fireEvent.press(screen.getByLabelText('Send message')));
 await act(async()=>fireEvent.press(screen.getByLabelText('Send message')));
 expect(mockMessaging.createMessageId).toHaveBeenCalledTimes(1);
 expect(mockMessaging.sendText.mock.calls.map(args=>args[3])).toEqual(['stable-id','stable-id']);
 expect(screen.getByPlaceholderText('Type a message...').props.value).toBe('');screen.unmount();
});
test('friendship event is distinguished, reading marks chat read, ordinary receipts remain',async()=>{
 mockMessages=[{id:'system',type:'friendship_created',senderId:null,text:'You are now friends'},
 {id:'text',type:'text',senderId:'c',text:'Hello',createdAt:new Date(1000)}];
 mockConversation={lastReadAt:{h:new Date(2000)}};
 const screen=await open();expect(screen.getByText('You and Ken are now friends 🎉')).toBeTruthy();
 expect(mockMessaging.markRead).toHaveBeenCalledWith('c__h');expect(screen.getByText(/\u2713\u2713/)).toBeTruthy();
 expect(mockMessaging.sendText).not.toHaveBeenCalled();screen.unmount();
});

test.each([['consumer','host',true],['host','consumer',false],['consumer','consumer',false]])('header call/gift actions for %s to %s',async(role,target,shown)=>{
 mockRole=role;mockTargetRole=target;
 const screen=await open();
 const header=render(navigation.setOptions.mock.calls.at(-1)[0].headerRight());
 expect(header.queryByLabelText(/Amira Level/)).toBeNull();
 expect(Boolean(header.queryByLabelText('Video call'))).toBe(shown);
 expect(Boolean(header.queryByLabelText('Gifts'))).toBe(shown);
 if(shown){fireEvent.press(header.getByLabelText('Gifts'));expect(screen.getByText('Authoritative Gift Tray')).toBeTruthy();expect(mockMessaging.sendText).not.toHaveBeenCalled();}
 header.unmount();screen.unmount();
});


test('obsolete conversation snapshots/errors cannot overwrite the new conversation or mark the old one read',async()=>{
 const callbacks=[];mockMessaging.subscribeMessages.mockImplementation((id,value,error)=>{callbacks.push({id,value,error,stop:jest.fn()});return callbacks.at(-1).stop;});
 jest.spyOn(mockMessaging,'getConversationId').mockImplementation((uid,target)=>`${uid}__${target}`);
 const screen=await open();act(()=>callbacks[0].value([{id:'a',senderId:'h',text:'Old history'}]));
 screen.rerender(<Chat route={{params:{userId:'other'}}} navigation={navigation}/>);await act(async()=>{});
 mockMessaging.markRead.mockClear();act(()=>{callbacks[0].value([{id:'stale',text:'Stale private text'}]);callbacks[0].error(new Error('old'));});
 expect(screen.queryByText('Old history')).toBeNull();expect(screen.queryByText('Stale private text')).toBeNull();expect(mockMessaging.markRead).not.toHaveBeenCalled();expect(callbacks[0].stop).toHaveBeenCalledTimes(1);
});
test.each(['same UID','unmount','recipient'])('send failure after %s cannot alert or navigate',async kind=>{
 let reject;mockMessaging.sendText.mockReturnValueOnce(new Promise((_done,fail)=>{reject=fail;}));const screen=await open();fireEvent.changeText(screen.getByPlaceholderText('Type a message...'),'Hello');act(()=>{fireEvent.press(screen.getByLabelText('Send message'));});
 if(kind==='same UID')mockNewSession();else if(kind==='unmount')screen.unmount();else{screen.rerender(<Chat route={{params:{userId:'other'}}} navigation={navigation}/>);await act(async()=>{});}
 await act(async()=>reject({details:{reason:'insufficient_credits'}}));expect(Alert.alert).not.toHaveBeenCalled();expect(navigation.navigate).not.toHaveBeenCalled();
});


test.each([undefined,{userId:'c'},{userId:'bad/path'}])('invalid chat entry never starts identity or conversation work',async params=>{
 const screen=render(<Chat route={{params}} navigation={navigation}/>);await act(async()=>{});
 expect(screen.getByText('This screen is unavailable. Please open it again from the app.')).toBeTruthy();
 expect(mockMessaging.prepareConversation).not.toHaveBeenCalled();
 expect(mockMessaging.subscribeMessages).not.toHaveBeenCalled();
 expect(navigation.setOptions).not.toHaveBeenCalled();
});

test('in-call Chat propagates its call context to the recipient profile',async()=>{
 render(<Chat route={{params:{userId:'h',activeCallId:'call-1'}}} navigation={navigation}/>);await act(async()=>{});
 const header=render(navigation.setOptions.mock.calls.at(-1)[0].headerTitle());
 fireEvent.press(header.getByLabelText('Open profile'));
 expect(navigation.navigate).toHaveBeenCalledWith('UserProfile',{userId:'h',activeCallId:'call-1'});
});


test('double Send has one request and success preserves a newer draft typed while pending',async()=>{
 let resolve;mockMessaging.sendText.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
 const screen=await open();fireEvent.changeText(screen.getByPlaceholderText('Type a message...'),'First message');
 act(()=>{fireEvent.press(screen.getByLabelText('Send message'));fireEvent.press(screen.getByLabelText('Send message'));});
 expect(mockMessaging.sendText).toHaveBeenCalledTimes(1);
 fireEvent.changeText(screen.getByPlaceholderText('Type a message...'),'Next draft');
 await act(async()=>resolve('c__h'));
 expect(screen.getByDisplayValue('Next draft')).toBeTruthy();
});

test('chat sponsored invitation uses one request for same-frame taps and retries failure',async()=>{
 const service=require('../../../services/sponsoredInviteService').sponsoredInviteService;
 mockRole='host';mockTargetRole='consumer';let reject;service.send.mockReturnValueOnce(new Promise((_ok,fail)=>{reject=fail;})).mockResolvedValueOnce({sponsoredSeconds:30});
 const screen=await open(),header=render(navigation.setOptions.mock.calls.at(-1)[0].headerRight());
 act(()=>{fireEvent.press(header.getByLabelText('Video Call Invite'));fireEvent.press(header.getByLabelText('Video Call Invite'));});
 expect(service.send).toHaveBeenCalledTimes(1);await act(async()=>reject(new Error('offline')));
 await act(async()=>fireEvent.press(header.getByLabelText('Video Call Invite')));expect(service.send).toHaveBeenCalledTimes(2);
 screen.unmount();
});


test('chat block is single-flight and unblock reloads both sides instead of granting access',async()=>{
 const service=require('../../../services/blockService').blockService;
 let resolve;service.block.mockReturnValueOnce(new Promise(done=>{resolve=done;}));service.unblock.mockResolvedValueOnce(undefined);
 const screen=await open();
 const openActions=()=>{const header=render(navigation.setOptions.mock.calls.at(-1)[0].headerRight());fireEvent.press(header.UNSAFE_getAllByType(require('react-native').TouchableOpacity).at(-1));return Alert.alert.mock.calls.at(-1)[2];};
 const block=openActions().find(action=>action.text==='Block').onPress;
 act(()=>{block();block();});expect(service.block).toHaveBeenCalledTimes(1);
 await act(async()=>resolve());
 service.getRelationship.mockResolvedValueOnce({blockedByMe:false,blockedMe:true,blocked:true});
 const unblock=openActions().find(action=>action.text==='Unblock').onPress;
 await act(async()=>unblock());expect(service.unblock).toHaveBeenCalledTimes(1);
 expect(screen.queryByPlaceholderText('Type a message...')).toBeNull();
});
