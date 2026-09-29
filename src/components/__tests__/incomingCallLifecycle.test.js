import React from 'react';
jest.setTimeout(30000);
import { AppState, Alert, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockAuth = { currentUser: null };
let mockAuthCallback, mockProfileCallback, mockAppCallback;
let mockProfile;
const mockListeners = [];
const mockNavigate = jest.fn(), mockRespond = jest.fn(), mockIdentity = jest.fn(), mockRelationship = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/firebaseService', () => ({
  auth: mockAuth, onAuthStateChanged: (_auth, callback) => { mockAuthCallback = callback; return () => {}; },
  getWalletBalance: () => 0, dbService: {
    ensureUserProfile: async () => mockProfile,
    subscribeToUserProfile: (_uid, callback) => { mockProfileCallback = callback; return () => {}; },
  },
}));
jest.mock('../../services/amiraIdentityService', () => ({ amiraIdentityService: { ensure: async () => {} } }));
jest.mock('../../services/socketService', () => ({ socketService: {} }));
jest.mock('../../services/applicationStorageService', () => ({ applicationStorageService: {} }));
jest.mock('../../services/callService', () => ({ callService: {
  subscribeIncoming: (uid, value, error) => {
    const listener = { uid, value, error, stop: jest.fn() }; mockListeners.push(listener); return listener.stop;
  }, respond: (...args) => mockRespond(...args),
} }));
jest.mock('../../services/publicIdentityService', () => ({ publicIdentityService: { calls: (...args) => mockIdentity(...args) } }));
jest.mock('../../services/blockService', () => ({ blockService: { getRelationship: (...args) => mockRelationship(...args) } }));
const { UserProvider } = require('../../context/UserContext');
const Owner = require('../IncomingCallListener').default;
const profile = (uid = 'host', approved = true, availability = 'online') => ({ uid, hostStatus: { isApproved: approved, availability } });
const call = (id = 'call') => ({ callId: id, callerId: 'caller', receiverId: 'host', status: 'ringing', expiresAtMs: Date.now() + 30000 });
const tree = (route = 'Connect', enabled = true) => <UserProvider><Owner enabled={enabled}><Text>{route}</Text></Owner></UserProvider>;
const login = async (value = profile(), authUser = { uid: value.uid }) => {
  mockProfile = value;
  await act(async () => { mockAuth.currentUser = authUser; mockAuthCallback(authUser); });
};
const emit = async (value = call(), index = mockListeners.length - 1) => { await act(async () => mockListeners[index].value(value)); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeEach(() => {
  jest.clearAllMocks(); mockListeners.length = 0; mockAuth.currentUser = null;
  mockRespond.mockReset().mockResolvedValue({ status: 'accepted' });
  mockIdentity.mockReset().mockResolvedValue([{ identity: { username: 'Public caller' } }]);
  mockRelationship.mockReset().mockResolvedValue({ blocked: false });
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_name, callback) => { mockAppCallback = callback; return { remove: jest.fn() }; });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('one approved Host listener survives every tab and nested screen; public identity fetched once', async () => {
  const screen = render(tree()); await login(); await emit();
  for (const route of ['Messages', 'Activity', 'Profile', 'ChatDetail', 'HostEarnings', 'Connect']) {
    screen.rerender(tree(route)); await emit();
    expect(screen.getByText('Public caller')).toBeTruthy();
  }
  expect(mockListeners).toHaveLength(1); expect(mockListeners[0].stop).not.toHaveBeenCalled();
  expect(mockIdentity).toHaveBeenCalledTimes(1); expect(mockRelationship).toHaveBeenCalledTimes(1);
});
test.each(['consumer', 'pending', 'offline', 'busy'])('%s never attaches', async kind => {
  render(tree()); const user = profile('host', !['consumer', 'pending'].includes(kind), ['offline', 'busy'].includes(kind) ? kind : 'online');
  if (kind === 'pending') { user.role = 'host'; user.hostStatus.verificationStatus = 'pending'; }
  await login(user); expect(mockListeners).toHaveLength(0);
});
test('incomplete profile gate never attaches', async () => { render(tree('NameSetup', false)); await login(); expect(mockListeners).toHaveLength(0); });
test('logout stops listening and queued callbacks/errors are harmless', async () => {
  const screen = render(tree()); await login(); await emit(); const old = mockListeners[0];
  await act(async () => { mockAuth.currentUser = null; mockAuthCallback(null); });
  await emit(call(), 0); act(() => old.error(new Error('obsolete')));
  expect(old.stop).toHaveBeenCalledTimes(1); expect(screen.queryByText('Public caller')).toBeNull();
  expect(screen.queryByText(/Incoming calls unavailable/)).toBeNull();
});
test.each(['different UID', 'same UID', 'reused Auth object'])('%s replacement invalidates old block resolution and callbacks', async kind => {
  const pending = deferred(); mockRelationship.mockReturnValueOnce(pending.promise);
  const screen = render(tree()); const authUser = { uid: 'host' }; await login(profile(), authUser);
  act(() => { mockListeners[0].value(call()); });
  if (kind === 'reused Auth object') await act(async () => { mockAuth.currentUser = null; mockAuthCallback(null); });
  await login(profile(kind === 'different UID' ? 'b' : 'host'), kind === 'reused Auth object' ? authUser : { uid: kind === 'different UID' ? 'b' : 'host' });
  await act(async () => pending.resolve({ blocked: false })); await emit(call(), 0);
  act(() => mockListeners[0].error(new Error('old')));
  expect(mockListeners[0].stop).toHaveBeenCalledTimes(1); expect(mockListeners).toHaveLength(2);
  expect(screen.queryByText('Public caller')).toBeNull(); expect(mockIdentity).not.toHaveBeenCalled();
});
test('unmount stops listener and ignores queued work', async () => {
  const screen = render(tree()); await login(); screen.unmount(); await emit();
  expect(mockListeners[0].stop).toHaveBeenCalledTimes(1); expect(mockRelationship).not.toHaveBeenCalled();
});
test('background stops reception; foreground reattaches', async () => {
  const screen = render(tree()); await login(); await emit();
  act(() => { AppState.currentState = 'background'; mockAppCallback('background'); });
  expect(mockListeners[0].stop).toHaveBeenCalledTimes(1); expect(screen.queryByText('Public caller')).toBeNull();
  await emit(call(), 0);
  act(() => { AppState.currentState = 'active'; mockAppCallback('active'); }); await emit();
  expect(mockListeners).toHaveLength(2); expect(screen.getByText('Public caller')).toBeTruthy();
});
test('current listener error clears UI and offers working retry', async () => {
  const screen = render(tree()); await login(); await emit(); act(() => mockListeners[0].error(new Error('denied')));
  expect(screen.queryByText('Public caller')).toBeNull(); fireEvent.press(screen.getByText(/Incoming calls unavailable/));
  expect(mockListeners[0].stop).toHaveBeenCalledTimes(1); await emit(); expect(screen.getByText('Public caller')).toBeTruthy();
});
test('duplicate decline presses and replayed snapshot do not repeat response/presentation', async () => {
  const screen = render(tree()); await login(); await emit(); const button = screen.getByText('Decline');
  await act(async () => { fireEvent.press(button); fireEvent.press(button); }); await emit();
  expect(mockRespond).toHaveBeenCalledTimes(1); expect(mockRespond).toHaveBeenCalledWith({ callId: 'call', action: 'decline' });
  expect(screen.queryByText('Public caller')).toBeNull(); expect(mockNavigate).not.toHaveBeenCalled();
});
test('accept navigates once even if busy profile and accepted snapshot arrive before response', async () => {
  const pending = deferred(); mockRespond.mockReturnValueOnce(pending.promise);
  const screen = render(tree()); await login(); await emit(); await act(async () => { fireEvent.press(screen.getByText('Accept')); });
  await emit(null); act(() => mockProfileCallback(profile('host', true, 'busy')));
  await act(async () => pending.resolve({ callId: 'call', status: 'accepted' }));
  expect(mockNavigate).toHaveBeenCalledTimes(1); expect(mockNavigate).toHaveBeenCalledWith('VideoCall', expect.objectContaining({ call: expect.objectContaining({ status: 'accepted' }) }));
});
test.each(['resolve', 'reject'])('obsolete accept %s cannot navigate or alert replacement same-UID session', async outcome => {
  const pending = deferred(); mockRespond.mockReturnValueOnce(pending.promise);
  const screen = render(tree()); await login(); await emit(); await act(async () => { fireEvent.press(screen.getByText('Accept')); });
  await login(); await act(async () => pending[outcome](outcome === 'resolve' ? {} : new Error('old')));
  expect(mockNavigate).not.toHaveBeenCalled(); expect(Alert.alert).not.toHaveBeenCalled();
});
test('blocked caller never presents; block added before accept prevents response', async () => {
  const screen = render(tree()); await login(); mockRelationship.mockResolvedValueOnce({ blocked: true }); await emit();
  expect(mockIdentity).not.toHaveBeenCalled(); await emit(call('second'));
  mockRelationship.mockResolvedValueOnce({ blocked: true }); await act(async () => { fireEvent.press(screen.getByText('Accept')); });
  expect(mockRespond).not.toHaveBeenCalled(); expect(screen.queryByText('Public caller')).toBeNull();
});
test('cancelled and expired calls clear UI; expiry timer dismisses without another snapshot', async () => {
  jest.useFakeTimers();
  try {
    const screen = render(tree()); await login(); await emit(); await emit(null); expect(screen.queryByText('Public caller')).toBeNull();
    await emit({ ...call(), expiresAtMs: Date.now() - 1 }); expect(screen.queryByText('Public caller')).toBeNull();
    await emit(call('next')); act(() => jest.advanceTimersByTime(30250)); expect(screen.queryByText('Public caller')).toBeNull();
  } finally { jest.useRealTimers(); }
});
test('current acceptance failure remains visible and retryable', async () => {
  const screen = render(tree()); await login(); await emit(); mockRespond.mockRejectedValueOnce(new Error('network'));
  await act(async () => { fireEvent.press(screen.getByText('Accept')); }); expect(Alert.alert).toHaveBeenCalled();
  await act(async () => { fireEvent.press(screen.getByText('Accept')); }); expect(mockNavigate).toHaveBeenCalledTimes(1);
});
test('Host Connect has no competing subscription and root owns the production listener', () => {
  const fs = require('fs'), path = require('path');
  expect(fs.readFileSync(path.join(__dirname, '../../screens/host/HostDashboardScreen.js'), 'utf8')).not.toMatch(/subscribeIncoming|IncomingCallCard/);
  expect(fs.readFileSync(path.join(__dirname, '../../navigation/RootNavigator.js'), 'utf8')).toMatch(/<IncomingCallListener enabled=\{isProfileComplete\}><Stack.Navigator/);
});
test('pending accept cannot navigate after owner unmount', async () => {
  const pending = deferred(); mockRespond.mockReturnValueOnce(pending.promise);
  const screen = render(tree()); await login(); await emit();
  await act(async () => { fireEvent.press(screen.getByText('Accept')); });
  screen.rerender(<UserProvider><Text>No call owner</Text></UserProvider>);
  await act(async () => pending.resolve({})); expect(mockNavigate).not.toHaveBeenCalled();
});
test('dismissed call stays dismissed across background/foreground replay', async () => {
  const screen = render(tree()); await login(); await emit();
  await act(async () => { fireEvent.press(screen.getByText('Decline')); });
  act(() => { AppState.currentState = 'background'; mockAppCallback('background'); });
  act(() => { AppState.currentState = 'active'; mockAppCallback('active'); });
  await emit(); expect(screen.queryByText('Public caller')).toBeNull(); expect(mockIdentity).toHaveBeenCalledTimes(1);
});
test('identity capability can suppress a block that appeared during identity resolution', async () => {
  const screen = render(tree()); await login(); mockIdentity.mockResolvedValueOnce([{ identity: { username: 'Blocked' }, canInteract: false }]);
  await emit(); expect(screen.queryByText('Incoming video call')).toBeNull(); expect(mockRespond).not.toHaveBeenCalled();
});
test('current block-check error fails closed and offers retry', async () => {
  const screen = render(tree()); await login(); mockRelationship.mockRejectedValueOnce(new Error('offline')); await emit();
  expect(screen.queryByText('Incoming video call')).toBeNull(); expect(screen.getByText(/Incoming calls unavailable/)).toBeTruthy();
  fireEvent.press(screen.getByText(/Incoming calls unavailable/)); await emit(); expect(screen.getByText('Public caller')).toBeTruthy();
});
test('late decline completion cannot dismiss a newer incoming call', async () => {
  const pending = deferred(); mockRespond.mockReturnValueOnce(pending.promise);
  const screen = render(tree()); await login(); await emit();
  await act(async () => { fireEvent.press(screen.getByText('Decline')); });
  await emit(call('second')); await act(async () => pending.resolve({}));
  expect(screen.getByText('Public caller')).toBeTruthy();
});
