import React from 'react';
import { Alert, AppState } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
let mockMessages=[], mockConversation=null, mockRole='consumer', mockTargetRole='host';
const mockMessaging={getConversationId:()=> 'c__h',prepareConversation:jest.fn(async()=>({exists:true})),
 subscribeMessages:jest.fn((id,cb)=>{cb(mockMessages);return()=>{};}),subscribeConversation:jest.fn((id,cb)=>{cb(mockConversation);return()=>{};}),
 markRead:jest.fn(async()=>{}),createMessageId:jest.fn(()=> 'stable-id'),sendText:jest.fn()};
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>true}));
jest.mock('../../../context/MessageActivityContext',()=>({useMessageActivity:()=>({setActiveConversation:()=>{}})}));
jest.mock('../../../services/chatPassService',()=>({CHAT_PASS_COPY:'1 Chat Pass unlocks a conversation for 24 hours.',chatAccessLabel:()=>'',chatPassService:{getAccess:async()=>({balance:3})}}));
jest.mock('../../../services/publicIdentityService',()=>({publicIdentityService:{message:async()=>({uid:'h',username:'Ken',hostStatus:{isApproved:mockTargetRole==='host'}})}}));
jest.mock('../../../services/followService',()=>({followService:{subscribeRelationship:()=>()=>{}}}));
jest.mock('../../../services/callNavigationService',()=>({startVideoCall:jest.fn()}));
jest.mock('../../../context/UserContext',()=>({useUser:()=>({user:{uid:'c',role:mockRole,hostStatus:{isApproved:mockRole==='host'}}})}));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({bottom:24})}));
jest.mock('../../../services/messagingService',()=>({messagingService:mockMessaging}));
jest.mock('../../../services/blockService',()=>({blockService:{getRelationship:async()=>({blocked:false})}}));
jest.mock('../../../services/reportService',()=>({reportService:{}}));
jest.mock('../../../components/ReportUserModal',()=>()=>null);
jest.mock('lucide-react-native',()=>({MoreVertical:()=>null,Send:()=>null,Video:()=>null,Gift:()=>null}));
const Chat=require('../ChatDetailScreen').default;
const navigation={setOptions:jest.fn(),navigate:jest.fn()};
const open=async()=>{const screen=render(<Chat route={{params:{userId:'h',name:'Ken'}}} navigation={navigation}/>);await act(async()=>{});return screen;};
beforeEach(()=>{mockRole='consumer';mockTargetRole='host';AppState.currentState='active';jest.clearAllMocks();mockMessages=[];mockConversation=null;jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
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
 if(shown){fireEvent.press(header.getByLabelText('Gifts'));expect(Alert.alert).toHaveBeenCalledWith('Gifts are coming soon',expect.any(String));expect(mockMessaging.sendText).not.toHaveBeenCalled();}
 header.unmount();screen.unmount();
});
