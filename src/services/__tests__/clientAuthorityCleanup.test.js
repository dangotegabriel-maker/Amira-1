import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

const mockFirebaseSignOut = jest.fn();
const mockDisconnect = jest.fn();
jest.mock('../firebaseService', () => ({
  auth: { currentUser: { uid: 'account-a' } },
  onAuthStateChanged: jest.fn(() => () => {}),
  firebaseSignOut: (...args) => mockFirebaseSignOut(...args),
}));
jest.mock('../socketService', () => ({ socketService: { disconnect: () => mockDisconnect() } }));
jest.mock('../amiraIdentityService', () => ({ amiraIdentityService: {} }));

const mockMultiRemove = jest.fn(async () => undefined);
const mockClear = jest.fn(async () => undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({
  multiRemove: (...args) => mockMultiRemove(...args),
  clear: (...args) => mockClear(...args),
}));

const root = path.resolve(__dirname, '..', '..', '..');
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));
const { applicationStorageService, OBSOLETE_LOCAL_FINANCIAL_KEYS } = require('../applicationStorageService');
const filterStore = require('../discoveryFilterStore');
const { runSessionTermination } = require('../sessionTerminationService');
const { UserProvider, useUser } = require('../../context/UserContext');

beforeEach(() => jest.clearAllMocks());

describe('legacy local financial authority containment', () => {
  test('removes the local ledger, withdrawal, dormant debit, and legacy gifting implementation', () => {
    for (const relative of [
      'src/services/ledgerService.js',
      'src/screens/main/WithdrawalScreen.js',
      'src/components/CallWaitingOverlay.js',
      'src/components/GlowAvatar.js',
      'src/context/GiftingContext.js',
      'src/components/GiftingOverlay.js',
      'src/services/giftingService.js',
    ]) expect(exists(relative)).toBe(false);
  });

  test('production application and navigation contain no legacy provider or withdrawal route', () => {
    expect(source('App.js')).not.toMatch(/GiftingProvider|GiftingContext/);
    expect(source('src/navigation/RootNavigator.js')).not.toMatch(/WithdrawalScreen|name=["']Withdrawal["']/);
  });

  test('authoritative GiftTray depends on the backend gift service and not legacy context', () => {
    const giftTray = source('src/components/GiftTray.js');
    expect(giftTray).toMatch(/services\/giftService/);
    expect(giftTray).not.toMatch(/GiftingContext|ledgerService|AsyncStorage/);
  });
});

describe('account-scoped session cleanup', () => {
  test('UserContext shares in-flight termination and allows a later attempt after settlement', async () => {
    let session;
    const Probe = () => { session = useUser(); return null; };
    render(<UserProvider><Probe /></UserProvider>);
    let completeSignOut;
    mockFirebaseSignOut.mockImplementationOnce(() => new Promise(resolve => { completeSignOut = resolve; }));

    const first = session.terminateSession();
    const second = session.terminateSession();
    expect(second).toBe(first);
    await waitFor(() => expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1));
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockMultiRemove).toHaveBeenCalledTimes(1);
    await act(async () => {
      completeSignOut();
      await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    });

    await act(async () => {
      const later = session.terminateSession();
      expect(later).not.toBe(first);
      await expect(later).resolves.toBeUndefined();
    });
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(2);
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
    expect(mockMultiRemove).toHaveBeenCalledTimes(2);
  });

  test('removes the exact documented AMIRA-owned obsolete keys without broad clear', async () => {
    await applicationStorageService.clearAccountSession();
    expect(mockMultiRemove).toHaveBeenCalledWith(OBSOLETE_LOCAL_FINANCIAL_KEYS);
    expect(mockClear).not.toHaveBeenCalled();
    expect(OBSOLETE_LOCAL_FINANCIAL_KEYS).toEqual(expect.arrayContaining([
      'coin_balance', 'coin_transactions', 'received_gifts', 'withdrawal_history',
      'diamond_balance', 'wealth_xp',
    ]));
  });

  test('preserves unrelated device and Firebase-managed keys by using an explicit allowlist', () => {
    expect(OBSOLETE_LOCAL_FINANCIAL_KEYS.some(key => /firebase|auth|preference/i.test(key))).toBe(false);
    expect(source('src/services/applicationStorageService.js')).not.toMatch(/getAllKeys|AsyncStorage\.clear|firebaseLocalStorage/);
  });

  test('clears only the terminating account session filters', () => {
    filterStore.setSessionDiscoveryFilters('account-a', { country: 'GH' });
    filterStore.setSessionDiscoveryFilters('account-b', { country: 'NG' });
    filterStore.clearSessionDiscoveryFilters('account-a');
    expect(filterStore.getSessionDiscoveryFilters('account-a')).toBe(filterStore.EMPTY_DISCOVERY_FILTERS);
    expect(filterStore.getSessionDiscoveryFilters('account-b')).toEqual({ country: 'NG' });
    filterStore.clearSessionDiscoveryFilters('account-b');
  });

  test('Settings, Profile, and forced logout share the UserContext termination boundary', () => {
    const settings = source('src/screens/main/SettingsScreen.js');
    const profile = source('src/screens/main/MyProfileScreen.js');
    const context = source('src/context/UserContext.js');
    for (const screen of [settings, profile]) {
      expect(screen).toMatch(/terminateSession/);
      expect(screen).not.toMatch(/authService\.signOut|firebaseSignOut|socketService\.disconnect/);
    }
    expect(context).toMatch(/forceLogout:\s*terminateSession/);
    expect(context).toMatch(/applicationStorageService\.clearAccountSession/);
    expect(context).toMatch(/clearSessionDiscoveryFilters/);
    expect(context).toMatch(/setUser\(null\)/);
    expect(context).toMatch(/setCoins\(0\)/);
    expect(context).toMatch(/terminationPromise\.current/);
    expect(context).not.toMatch(/AsyncStorage\.clear/);
  });

  const dependencies = overrides => ({
    disconnect: jest.fn(),
    clearFilters: jest.fn(),
    clearStorage: jest.fn(async () => undefined),
    signOut: jest.fn(async () => undefined),
    resetState: jest.fn(),
    onCleanupError: jest.fn(),
    ...overrides,
  });

  test('successful termination signs out before resetting authenticated state', async () => {
    const order = [];
    const deps = dependencies({
      signOut: jest.fn(async () => order.push('signed-out')),
      resetState: jest.fn(() => order.push('reset')),
    });
    await expect(runSessionTermination(deps)).resolves.toBeUndefined();
    expect(order).toEqual(['signed-out', 'reset']);
  });

  test('obsolete local cleanup failure still signs out and does not fail a successful logout', async () => {
    const localError = new Error('storage unavailable');
    const deps = dependencies({ clearStorage: jest.fn(async () => { throw localError; }) });
    await expect(runSessionTermination(deps)).resolves.toBeUndefined();
    expect(deps.signOut).toHaveBeenCalledTimes(1);
    expect(deps.resetState).toHaveBeenCalledTimes(1);
    expect(deps.onCleanupError).toHaveBeenCalledWith('application storage', localError);
  });

  test('Firebase sign-out failure remains observable and does not clear authenticated UI state', async () => {
    const authError = new Error('auth sign-out failed');
    const deps = dependencies({ signOut: jest.fn(async () => { throw authError; }) });
    await expect(runSessionTermination(deps)).rejects.toBe(authError);
    expect(deps.resetState).not.toHaveBeenCalled();
  });

  test('local and Firebase failures preserve the Firebase failure while all cleanup attempts run', async () => {
    const authError = new Error('auth sign-out failed');
    const deps = dependencies({
      disconnect: jest.fn(() => { throw new Error('disconnect failed'); }),
      clearFilters: jest.fn(() => { throw new Error('filters failed'); }),
      clearStorage: jest.fn(async () => { throw new Error('storage failed'); }),
      signOut: jest.fn(async () => { throw authError; }),
    });
    await expect(runSessionTermination(deps)).rejects.toBe(authError);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
    expect(deps.resetState).not.toHaveBeenCalled();
    expect(deps.onCleanupError).toHaveBeenCalledTimes(3);
  });
});
