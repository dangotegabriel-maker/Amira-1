let mockAuthenticatedSession;
const mockNewSession=()=>{const token={isCurrent:()=>mockAuthenticatedSession===token};mockAuthenticatedSession=token;};
import React from 'react';
import { AppState, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
let mockInbox, mockMine, mockTheirs, mockActivity, mockInboxError;
const mockBlock=jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({useIsFocused:()=>true, useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('../UserContext', () => ({ useUser: () => ({authenticatedSession:mockAuthenticatedSession, user: { uid: 'c' } }) }));
jest.mock('../../services/firebaseService', () => ({ db: {} }));
jest.mock('../../services/blockService', () => ({ blockService: { getRelationship: (...args)=>mockBlock(...args) } }));
jest.mock('../../services/messagingService', () => ({ messagingService: { subscribeInbox: (cb,error) => { mockInboxError=error;mockInbox = cb; return () => {}; } } }));
jest.mock('firebase/firestore', () => ({
  collection: () => 'mine', collectionGroup: () => 'theirs', query: (ref) => ref, where: jest.fn(),
  onSnapshot: (ref, cb) => { if (ref === 'mine') mockMine = cb; else mockTheirs = cb; return () => {}; },
}));
const { MessageActivityProvider, useMessageActivity } = require('../MessageActivityContext');
const Child = () => { mockActivity = useMessageActivity(); return <Text>{`Unread ${mockActivity.unread}`}</Text>; };
const item = (time) => ({ id: 'c__h', participantIds: ['c','h'], participants: { h: { username: 'Ken' } }, unreadCounts: { c: 1 },
  lastMessageAt: { toMillis: () => time }, lastMessage: { type: 'text', senderId: 'h', text: `Hello ${time}` } });
beforeEach(() => {mockNewSession(); mockBlock.mockResolvedValue({blocked:false});jest.useFakeTimers(); AppState.currentState = 'active'; mockNavigate.mockClear(); });
afterEach(() => jest.useRealTimers());
test('startup cache/server history stays quiet; new message dedupes, opens chat and read clears badge', async () => {
  const screen = render(<MessageActivityProvider><Child /></MessageActivityProvider>);
  act(() => { mockMine({ docs: [] }); mockTheirs({ docs: [] }); mockInbox([], { fromCache: true }); mockInbox([item(100)], { fromCache: false }); });
  expect(screen.queryByLabelText('Open incoming message')).toBeNull();
  act(() => mockInbox([item(200)], { fromCache: false }));
  expect(screen.getByText('Hello 200')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByLabelText('Open incoming message')));
  expect(mockNavigate).toHaveBeenCalledWith('ChatDetail', { userId: 'h', name: 'Ken' });
  act(() => mockInbox([item(200)], { fromCache: false }));
  expect(screen.queryByLabelText('Open incoming message')).toBeNull();
  act(() => { mockActivity.setActiveConversation('c__h'); mockInbox([item(300)], { fromCache: false }); });
  expect(screen.queryByLabelText('Open incoming message')).toBeNull();
  act(() => mockInbox([{ ...item(300), unreadCounts: { c: 0 } }], { fromCache: false }));
  expect(screen.getByText('Unread 0')).toBeTruthy(); screen.unmount();
});
test('reverse blocks remove existing unread state and dismiss banners', () => {
  const screen = render(<MessageActivityProvider><Child /></MessageActivityProvider>);
  act(() => { mockMine({ docs: [] }); mockTheirs({ docs: [] }); mockInbox([item(100)], { fromCache: false }); mockInbox([item(200)], { fromCache: false }); });
  expect(screen.getByText('Unread 1')).toBeTruthy();
  act(() => mockTheirs({ docs: [{ ref: { parent: { parent: { id: 'h' } } } }] }));
  expect(screen.getByText('Unread 0')).toBeTruthy();
  expect(screen.queryByLabelText('Open incoming message')).toBeNull(); screen.unmount();
});


test('old queued errors cannot clear replacement unread state; retry does not keep old callbacks alive',()=>{
 const screen=render(<MessageActivityProvider><Child/></MessageActivityProvider>);const old=mockInbox,oldError=mockInboxError;
 mockNewSession();screen.rerender(<MessageActivityProvider><Child/></MessageActivityProvider>);
 act(()=>{mockMine({docs:[]});mockTheirs({docs:[]});mockInbox([item(100)],{fromCache:false});old([],{});oldError(new Error('old'));});
 expect(screen.getByText('Unread 1')).toBeTruthy();expect(screen.queryByText(/updates unavailable/)).toBeNull();
 act(()=>mockInboxError(new Error('current')));fireEvent.press(screen.getByText(/updates unavailable/));expect(screen.queryByText(/updates unavailable/)).toBeNull();
 screen.unmount();act(()=>{oldError(new Error('unmounted'));old([item(900)],{fromCache:false});});
});
test.each(['replacement','unmount'])('banner block check cannot navigate after %s',async kind=>{
 let resolve;mockBlock.mockReturnValueOnce(new Promise(done=>{resolve=done;}));const screen=render(<MessageActivityProvider><Child/></MessageActivityProvider>);
 act(()=>{mockMine({docs:[]});mockTheirs({docs:[]});mockInbox([item(100)],{fromCache:false});mockInbox([item(200)],{fromCache:false});});
 act(()=>{fireEvent.press(screen.getByLabelText('Open incoming message'));});if(kind==='unmount')screen.unmount();else mockNewSession();
 await act(async()=>resolve({blocked:false}));expect(mockNavigate).not.toHaveBeenCalled();
});
