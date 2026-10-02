let mockSession;
const mockNewSession=()=>{const token={isCurrent:()=>mockSession===token};mockSession=token;};
jest.mock('../../context/UserContext',()=>({useUser:()=>({authenticatedSession:mockSession})}));
import React from 'react';
import {Alert} from 'react-native';
import {act,fireEvent,render} from '@testing-library/react-native';
const mockRequestId=jest.fn(),mockCatalog=jest.fn(),mockSend=jest.fn(),mockNavigate=jest.fn();
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({navigate:mockNavigate})}));
jest.mock('../../services/giftService',()=>({giftService:{catalog:mockCatalog,send:mockSend,requestId:mockRequestId}}));
jest.mock('lucide-react-native',()=>({X:()=>null,Coins:()=>null}));
const Tray=require('../GiftTray').default;const flush=async()=>act(async()=>{for(let i=0;i<10;i++)await Promise.resolve();});
beforeEach(()=>{mockNewSession();jest.clearAllMocks();mockRequestId.mockReset().mockReturnValue("stable-request");jest.spyOn(Alert,'alert').mockImplementation(()=>{});});afterEach(()=>jest.restoreAllMocks());
test('missing protected catalogue shows truthful unavailable state',async()=>{mockCatalog.mockResolvedValue({available:false,gifts:[]});const screen=render(<Tray visible hostUid="h" onClose={()=>{}}/>);await flush();expect(screen.getByText('Gifts are currently unavailable.')).toBeTruthy();screen.unmount();});
test('one tap uses authoritative identifiers and acknowledges only after success',async()=>{mockCatalog.mockResolvedValue({available:true,gifts:[{giftId:'fixture',name:'Fixture Gift',priceCredits:7,asset:{kind:'emoji',key:'x'}}]});mockSend.mockResolvedValue({transactionId:'t'});const screen=render(<Tray visible hostUid="h" source="messages" onClose={()=>{}}/>);await flush();await act(async()=>fireEvent.press(screen.getByText('Fixture Gift')));expect(mockSend).toHaveBeenCalledWith({hostUid:'h',giftId:'fixture',source:'messages',requestId:'stable-request'});expect(Alert.alert).toHaveBeenCalledWith('Gift sent','Fixture Gift was sent.');screen.unmount();});
test('live-call send includes authoritative call context and delegates success acknowledgement without a blocking alert',async()=>{mockCatalog.mockResolvedValue({available:true,gifts:[{giftId:'fixture',name:'Fixture Gift',priceCredits:7,asset:{}}]});mockSend.mockResolvedValue({transactionId:'t'});const sent=jest.fn(),screen=render(<Tray visible hostUid="h" source="video_call" callId="call-1" onGiftSent={sent} onClose={()=>{}}/>);await flush();await act(async()=>fireEvent.press(screen.getByText('Fixture Gift')));expect(mockSend).toHaveBeenCalledWith({hostUid:'h',giftId:'fixture',source:'video_call',requestId:'stable-request',callId:'call-1'});expect(sent).toHaveBeenCalled();expect(Alert.alert).not.toHaveBeenCalled();screen.unmount();});
test('purchased-credit insufficiency is distinct and Recharge is described as unavailable',async()=>{mockCatalog.mockResolvedValue({available:true,gifts:[{giftId:'fixture',name:'Fixture Gift',priceCredits:7,asset:{}}]});mockSend.mockRejectedValue({details:{reason:'insufficient_purchased_credits'}});const close=jest.fn(),screen=render(<Tray visible hostUid="h" onClose={close}/>);await flush();await act(async()=>fireEvent.press(screen.getByText('Fixture Gift')));const call=Alert.alert.mock.calls[0];expect(call[0]).toBe('More purchased Credits needed');expect(call[1]).toMatch(/Bonus and legacy Credits cannot be used/);call[2][0].onPress();expect(close).toHaveBeenCalled();expect(mockNavigate).toHaveBeenCalledWith('RechargeHub');screen.unmount();});


test('duplicate Gift taps send once and late success after closing cannot acknowledge or Alert',async()=>{
 mockCatalog.mockResolvedValue({available:true,gifts:[{giftId:'fixture',name:'Fixture Gift',priceCredits:7,asset:{kind:'emoji',key:'x'}}]});let resolve;mockSend.mockReturnValueOnce(new Promise(done=>{resolve=done;}));const sent=jest.fn(),screen=render(<Tray visible hostUid="h" onGiftSent={sent} onClose={()=>{}}/>);await flush();await act(async()=>{fireEvent.press(screen.getByText('Fixture Gift'));fireEvent.press(screen.getByText('Fixture Gift'));});expect(mockSend).toHaveBeenCalledTimes(1);screen.rerender(<Tray visible={false} hostUid="h" onGiftSent={sent} onClose={()=>{}}/>);await act(async()=>resolve({transactionId:'t'}));expect(sent).not.toHaveBeenCalled();expect(Alert.alert).not.toHaveBeenCalled();
});


test('Gift retry retains its request key, but replacement session gets a fresh owner and key',async()=>{
 mockCatalog.mockResolvedValue({available:true,gifts:[{giftId:'fixture',name:'Gift',priceCredits:7,asset:{}}]});
 mockRequestId.mockReturnValueOnce('first-request').mockReturnValueOnce('replacement-request');
 mockSend.mockRejectedValueOnce(new Error('unknown')).mockResolvedValueOnce({transactionId:'first'});
 const screen=render(<Tray visible hostUid="h" onClose={()=>{}}/>);await flush();
 await act(async()=>fireEvent.press(screen.getByText('Gift')));
 await act(async()=>fireEvent.press(screen.getByText('Gift')));
 expect(mockSend.mock.calls.map(args=>args[0].requestId)).toEqual(['first-request','first-request']);
 mockNewSession();screen.rerender(<Tray visible hostUid="h" onClose={()=>{}}/>);await flush();
 await act(async()=>fireEvent.press(screen.getByText('Gift')));
 expect(mockSend.mock.calls[2][0].requestId).toBe('replacement-request');
});

test('old Gift completion cannot acknowledge a replacement target or release its pending operation',async()=>{
 mockCatalog.mockResolvedValue({available:true,gifts:[{giftId:'fixture',name:'Gift',priceCredits:7,asset:{}}]});
 let oldDone,newDone;mockSend.mockReturnValueOnce(new Promise(done=>{oldDone=done;})).mockReturnValueOnce(new Promise(done=>{newDone=done;}));
 const sent=jest.fn(),screen=render(<Tray visible hostUid="a" onGiftSent={sent} onClose={()=>{}}/>);await flush();
 act(()=>{fireEvent.press(screen.getByText('Gift'));});
 screen.rerender(<Tray visible hostUid="b" onGiftSent={sent} onClose={()=>{}}/>);await flush();
 act(()=>{fireEvent.press(screen.getByText('Gift'));});await act(async()=>oldDone({transactionId:'a'}));
 expect(sent).not.toHaveBeenCalled();
 act(()=>{fireEvent.press(screen.getByText('Gift'));});expect(mockSend).toHaveBeenCalledTimes(2);
 await act(async()=>newDone({transactionId:'b'}));expect(sent).toHaveBeenCalledTimes(1);
 expect(mockSend.mock.calls.map(args=>args[0].hostUid)).toEqual(['a','b']);
});
