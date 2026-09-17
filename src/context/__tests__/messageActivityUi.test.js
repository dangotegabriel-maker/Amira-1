import React from 'react';
import { AppState, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
let mockInbox, mockMine, mockTheirs, mockActivity;
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('../UserContext', () => ({ useUser: () => ({ user: { uid: 'c' } }) }));
jest.mock('../../services/firebaseService', () => ({ db: {} }));
jest.mock('../../services/blockService', () => ({ blockService: { getRelationship: async () => ({ blocked: false }) } }));
jest.mock('../../services/messagingService', () => ({ messagingService: { subscribeInbox: (cb) => { mockInbox = cb; return () => {}; } } }));
jest.mock('firebase/firestore', () => ({
  collection: () => 'mine', collectionGroup: () => 'theirs', query: (ref) => ref, where: jest.fn(),
  onSnapshot: (ref, cb) => { if (ref === 'mine') mockMine = cb; else mockTheirs = cb; return () => {}; },
}));
const { MessageActivityProvider, useMessageActivity } = require('../MessageActivityContext');
const Child = () => { mockActivity = useMessageActivity(); return <Text>{`Unread ${mockActivity.unread}`}</Text>; };
const item = (time) => ({ id: 'c__h', participantIds: ['c','h'], participants: { h: { username: 'Ken' } }, unreadCounts: { c: 1 },
  lastMessageAt: { toMillis: () => time }, lastMessage: { type: 'text', senderId: 'h', text: `Hello ${time}` } });
beforeEach(() => { jest.useFakeTimers(); AppState.currentState = 'active'; mockNavigate.mockClear(); });
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
