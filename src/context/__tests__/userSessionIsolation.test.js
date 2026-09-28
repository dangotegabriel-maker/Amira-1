import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockAuth = { currentUser: null };
let mockAuthCallback;
const mockAuthStop = jest.fn();
const mockEnsure = jest.fn(), mockRead = jest.fn(), mockUpdate = jest.fn();
const mockSignOut = jest.fn(), mockStorage = jest.fn(), mockDisconnect = jest.fn();
const mockListeners = [];
jest.mock('../../services/firebaseService', () => ({
  auth: mockAuth,
  onAuthStateChanged: jest.fn((_auth, callback) => { mockAuthCallback = callback; return mockAuthStop; }),
  firebaseSignOut: (...args) => mockSignOut(...args),
  getWalletBalance: profile => profile.wallet.creditBalance,
  dbService: {
    ensureUserProfile: (...args) => mockEnsure(...args),
    getUserProfile: (...args) => mockRead(...args),
    updateUserProfile: (...args) => mockUpdate(...args),
    subscribeToUserProfile: jest.fn((uid, value, error) => {
      const listener = { uid, value, error, stop: jest.fn() };
      mockListeners.push(listener);
      return listener.stop;
    }),
  },
}));
jest.mock('../../services/amiraIdentityService', () => ({ amiraIdentityService: { ensure: async () => {} } }));
jest.mock('../../services/socketService', () => ({ socketService: { disconnect: () => mockDisconnect() } }));
jest.mock('../../services/applicationStorageService', () => ({ applicationStorageService: { clearAccountSession: () => mockStorage() } }));
jest.mock('@react-native-community/datetimepicker', () => () => null);

const { UserProvider, useUser } = require('../UserContext');
const Name = require('../../screens/onboarding/NameSetupScreen').default;
const Birthday = require('../../screens/onboarding/BirthdaySetupScreen').default;
const profile = (uid, coins = 10, approved = false) => ({ uid, username: uid, dob: '1990-01-01', gender: 'other', countryCode: 'GH', hostStatus: { isApproved: approved }, wallet: { creditBalance: coins } });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let session;
const Probe = () => { session = useUser(); return null; };
const mount = child => render(<UserProvider><Probe />{child}</UserProvider>);
const transition = async authUser => {
  await act(async () => { mockAuth.currentUser = authUser; mockAuthCallback(authUser); });
};
const settle = async (pending, outcome, value) => { await act(async () => pending[outcome](value)); };
const ready = async (uid = 'a', coins = 10, approved = false) => {
  mockEnsure.mockResolvedValueOnce(profile(uid, coins, approved));
  await transition({ uid });
};
beforeEach(() => {
  jest.clearAllMocks();
  [mockEnsure, mockRead, mockUpdate, mockSignOut, mockStorage, mockDisconnect].forEach(mock => mock.mockReset());
  mockAuth.currentUser = null;
  mockListeners.length = 0;
});

test('initial Auth bootstrap is distinct from signed out and profile loading', async () => {
  mount();
  expect(session).toMatchObject({ user: null, coins: 0, loading: true, bootstrapStatus: 'auth_loading' });
  await transition(null);
  expect(session).toMatchObject({ user: null, coins: 0, loading: false, bootstrapStatus: 'signed_out' });
  mockEnsure.mockReturnValueOnce(deferred().promise);
  await transition({ uid: 'a' });
  expect(session.bootstrapStatus).toBe('profile_loading');
});

test.each(['resolve', 'reject'])('obsolete hydration %s after logout cannot restore identity or Credits', async outcome => {
  const pending = deferred(); mockEnsure.mockReturnValueOnce(pending.promise);
  mount(); await transition({ uid: 'a' }); await transition(null);
  await settle(pending, outcome, outcome === 'resolve' ? profile('a', 900) : new Error('offline'));
  expect(session).toMatchObject({ user: null, coins: 0, loading: false, bootstrapStatus: 'signed_out' });
  expect(mockListeners).toHaveLength(0);
});

test.each(['resolve', 'reject'])('A hydration %s cannot alter B loading or loaded state', async outcome => {
  const a = deferred(), b = deferred();
  mockEnsure.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  mount(); await transition({ uid: 'a' }); await transition({ uid: 'b' });
  await settle(a, outcome, outcome === 'resolve' ? profile('a', 900) : new Error('old failure'));
  expect(session).toMatchObject({ user: null, coins: 0, loading: true, bootstrapStatus: 'profile_loading' });
  await settle(b, 'resolve', profile('b', 22, true));
  expect(session).toMatchObject({ user: profile('b', 22, true), coins: 22, loading: false, isApprovedHost: true });
  expect(mockListeners.map(item => item.uid)).toEqual(['b']);
});

test.each(['resolve', 'reject'])('same UID with a reused Auth object rejects old-session hydration %s', async outcome => {
  const pending = deferred(), authUser = { uid: 'a' };
  mockEnsure.mockReturnValueOnce(pending.promise);
  mount(); await transition(authUser); await transition(null);
  mockEnsure.mockResolvedValueOnce(profile('a', 33, true)); await transition(authUser);
  await settle(pending, outcome, outcome === 'resolve' ? profile('a', 999) : new Error('old'));
  expect(session).toMatchObject({ user: profile('a', 33, true), coins: 33, bootstrapStatus: 'ready' });
});

test('old listener is stopped; queued success/error and unmounted callbacks are ignored', async () => {
  const screen = mount(); await ready(); const old = mockListeners[0];
  await ready('b', 22); expect(old.stop).toHaveBeenCalledTimes(1);
  await act(async () => { old.value(profile('a', 999)); old.error(new Error('old')); });
  expect(session.user.uid).toBe('b'); expect(session.coins).toBe(22);
  expect(mockListeners).toHaveLength(2);
  screen.unmount(); expect(mockListeners[1].stop).toHaveBeenCalledTimes(1); expect(mockAuthStop).toHaveBeenCalledTimes(1);
  const last = session;
  await act(async () => mockListeners[1].value(profile('b', 999)));
  expect(session).toBe(last);
});

test('current failure keeps Auth, exposes no fabricated profile, and retry loads the authoritative Host', async () => {
  mockEnsure.mockRejectedValueOnce(new Error('offline')); mount(); const authUser = { uid: 'a' }; await transition(authUser);
  expect(mockAuth.currentUser).toBe(authUser); expect(mockSignOut).not.toHaveBeenCalled();
  expect(session).toMatchObject({ user: null, coins: 0, loading: false, bootstrapStatus: 'profile_error' });
  mockEnsure.mockResolvedValueOnce(profile('a', 55, true));
  await act(async () => session.retryProfile());
  expect(session).toMatchObject({ user: profile('a', 55, true), coins: 55, bootstrapStatus: 'ready' });
  expect(mockListeners).toHaveLength(1);
});

test.each(['resolve', 'reject'])('retry %s is ignored after authentication changes', async outcome => {
  mockEnsure.mockRejectedValueOnce(new Error('offline')); mount(); await transition({ uid: 'a' });
  const retry = deferred(); mockEnsure.mockReturnValueOnce(retry.promise);
  let task; act(() => { task = session.retryProfile(); });
  await ready('b', 66);
  await act(async () => { retry[outcome](outcome === 'resolve' ? profile('a', 999) : new Error('old')); await task; });
  expect(session).toMatchObject({ user: profile('b', 66), coins: 66, bootstrapStatus: 'ready' });
  expect(mockListeners).toHaveLength(1);
});

test('repeated retry replaces its listener once and an old retry function cannot restart work', async () => {
  mount(); await ready(); const oldRetry = session.retryProfile;
  mockEnsure.mockResolvedValueOnce(profile('a', 44)); await act(async () => session.retryProfile());
  expect(mockListeners[0].stop).toHaveBeenCalledTimes(1);
  await act(async () => { await oldRetry(); mockListeners[0].value(profile('a', 999)); });
  expect(mockEnsure).toHaveBeenCalledTimes(2); expect(mockListeners).toHaveLength(2); expect(session.coins).toBe(44);
});

test.each(['error', 'missing'])('current listener %s blocks routing and retry owns a fresh listener', async event => {
  mount(); await ready(); const old = mockListeners[0];
  await act(async () => event === 'error' ? old.error(new Error('denied')) : old.value(null));
  expect(old.stop).toHaveBeenCalledTimes(1); expect(session.bootstrapStatus).toBe('profile_error'); expect(session.user).toBeNull();
  await act(async () => old.value(profile('a', 999))); expect(session.user).toBeNull();
  mockEnsure.mockResolvedValueOnce(profile('a', 77)); await act(async () => session.retryProfile());
  expect(mockListeners).toHaveLength(2); expect(session.coins).toBe(77);
});

test.each(['signed_out', 'other_uid', 'same_uid'])('refresh and balance reads cannot commit into %s', async destination => {
  mount(); await ready(); const refresh = deferred(), balance = deferred();
  mockRead.mockReturnValueOnce(refresh.promise).mockReturnValueOnce(balance.promise);
  const oldRefresh = session.refreshUser;
  let first, second; act(() => { first = session.refreshUser(); second = session.fetchUserCoins(); });
  await transition(null);
  if (destination !== 'signed_out') await ready(destination === 'same_uid' ? 'a' : 'b', 88);
  await act(async () => { refresh.resolve(profile('a', 999)); balance.resolve(profile('a', 999)); await Promise.all([first, second]); await oldRefresh(); });
  expect(session.coins).toBe(destination === 'signed_out' ? 0 : 88);
  expect(session.user?.uid || null).toBe(destination === 'signed_out' ? null : destination === 'same_uid' ? 'a' : 'b');
  expect(mockRead).toHaveBeenCalledTimes(2);
});

test('current refresh errors remain observable and successful refresh updates profile and Credits', async () => {
  mount(); await ready(); const failure = new Error('offline'); mockRead.mockRejectedValueOnce(failure);
  await expect(session.refreshUser()).rejects.toBe(failure); expect(session.coins).toBe(10);
  mockRead.mockResolvedValueOnce(profile('a', 90)); await act(async () => session.refreshUser());
  expect(session.coins).toBe(90);
});

test.each(['Name', 'Birthday'])('%s awaited onboarding write cannot mutate a later session', async name => {
  const pending = deferred(); mockUpdate.mockReturnValueOnce(pending.promise);
  const screen = mount(name === 'Name' ? <Name /> : <Birthday />); await ready();
  if (name === 'Name') fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Alice');
  fireEvent.press(screen.getByText('Continue'));
  expect(mockUpdate).toHaveBeenCalledWith('a', expect.objectContaining(name === 'Name' ? { username: 'Alice' } : { age: expect.any(Number), dob: expect.any(String) }));
  await transition(null); await ready('a', 100);
  await settle(pending, 'resolve');
  expect(mockRead).not.toHaveBeenCalled(); expect(session.user.username).toBe('a'); expect(session.coins).toBe(100);
});

test('current onboarding save refreshes authoritative state and write failures propagate', async () => {
  mount(); await ready(); mockRead.mockResolvedValueOnce(profile('a', 12));
  await act(async () => session.updateProfile({ gender: 'female' }));
  expect(mockUpdate).toHaveBeenCalledWith('a', { gender: 'female' }); expect(session.coins).toBe(12);
  const failure = new Error('write failed'); mockUpdate.mockRejectedValueOnce(failure);
  await expect(session.updateProfile({ gender: 'female' })).rejects.toBe(failure);
});

test('Firebase logout failure keeps loaded identity, Credits, and the active listener', async () => {
  mount(); await ready('a', 123); const failure = new Error('Auth failure'); mockSignOut.mockRejectedValueOnce(failure);
  await expect(session.terminateSession()).rejects.toBe(failure);
  expect(session).toMatchObject({ user: profile('a', 123), coins: 123, bootstrapStatus: 'ready' });
  expect(mockListeners[0].stop).not.toHaveBeenCalled();
});

test('successful logout is single-flight and cannot reset a newer authenticated account', async () => {
  mount(); await ready(); const pending = deferred(); mockSignOut.mockReturnValueOnce(pending.promise);
  let first, second; await act(async () => { first = session.terminateSession(); second = session.terminateSession(); });
  expect(first).toBe(second); expect(mockSignOut).toHaveBeenCalledTimes(1);
  await transition(null); await ready('b', 456);
  await act(async () => { pending.resolve(); await first; });
  expect(session).toMatchObject({ user: profile('b', 456), coins: 456, bootstrapStatus: 'ready' });
});

test('profile retry during local logout cleanup does not skip Firebase sign-out', async () => {
  mount(); await ready(); const cleanup = deferred(); mockStorage.mockReturnValueOnce(cleanup.promise);
  let task; await act(async () => { task = session.terminateSession(); });
  mockEnsure.mockResolvedValueOnce(profile('a')); await act(async () => session.retryProfile());
  await act(async () => { cleanup.resolve(); await task; });
  expect(mockSignOut).toHaveBeenCalledTimes(1); expect(session.bootstrapStatus).toBe('signed_out');
});
