import React from 'react';
import fs from 'fs';
import path from 'path';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockSignOut = jest.fn(async () => undefined);
const mockDisconnect = jest.fn();
jest.mock('lucide-react-native', () => ({ Images: () => null, Users: () => null, ChevronRight: () => null }));
jest.mock('../../../services/firebaseService', () => ({ authService: { signOut: (...args) => mockSignOut(...args) } }));
jest.mock('../../../services/socketService', () => ({ socketService: { disconnect: (...args) => mockDisconnect(...args) } }));

const Moments = require('../MomentsScreen').default;
const InviteEarn = require('../InviteEarnScreen').default;
const Settings = require('../SettingsScreen').default;
const { translationService } = require('../../../services/translationService');
const source = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

beforeEach(() => jest.clearAllMocks());

describe('truthful Moments state', () => {
  test('renders the routed destination with an availability explanation', () => {
    const screen = render(<Moments />);
    expect(screen.getByText('Moments')).toBeTruthy();
    expect(screen.getByText('Moments are not available yet')).toBeTruthy();
    expect(screen.getByText('Moments from Hosts will appear here when this feature becomes available.')).toBeTruthy();
  });

  test('contains no people, feed, fake engagement, media, Storage, or backend call', () => {
    const text = source('MomentsScreen.js');
    for (const forbidden of ['mockPosts', 'unsplash.com', 'Jessica', 'Emma', 'Sophia', 'Olivia', 'Heart', 'MessageCircle', 'Share2', 'firebase/storage', 'mediaService']) expect(text).not.toContain(forbidden);
  });
});

describe('truthful Invite and Earn state', () => {
  test('retains route compatibility with an unavailable state', () => {
    const screen = render(<InviteEarn />);
    expect(screen.getByText('Invite & Earn')).toBeTruthy();
    expect(screen.getByText('Referral rewards are not available yet.')).toBeTruthy();
  });

  test('contains no synthetic code, link, sharing, verification, or earnings claim', () => {
    const text = source('InviteEarnScreen.js');
    for (const forbidden of ['referralCode', 'AMIRA-', 'amira.app', 'Share.share', 'Clipboard', 'qualify', 'credited', 'earn Credits', 'earn money']) expect(text).not.toContain(forbidden);
  });
});

describe('truthful Settings', () => {
  test('routes Block List to the existing Blocked Users screen', () => {
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    const screen = render(<Settings navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Open Blocked Users'));
    expect(navigation.navigate).toHaveBeenCalledWith('BlockedUsers');
  });

  test.each(['Update Phone Number', 'Email & Password'])('%s is visibly and accessibly disabled', label => {
    const screen = render(<Settings navigation={{ navigate: jest.fn(), reset: jest.fn() }} />);
    const row = screen.getByLabelText(`${label}, not available yet`);
    expect(row.props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getAllByText('Not available yet').length).toBe(2);
  });

  test('does not present Invisible Mode, language, or notification controls', () => {
    const screen = render(<Settings navigation={{ navigate: jest.fn(), reset: jest.fn() }} />);
    for (const text of ['Invisible Mode', 'Preferred Language', 'Automatic Translation', 'Push Notifications']) expect(screen.queryByText(text)).toBeNull();
  });

  test('preserves logout and authentication cleanup', async () => {
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, actions) => actions.find(action => action.text === 'Logout').onPress());
    const screen = render(<Settings navigation={navigation} />);
    await act(async () => fireEvent.press(screen.getByLabelText('Logout')));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
    alert.mockRestore();
  });
});

describe('translation safety', () => {
  test('fails closed instead of manufacturing translated text', async () => {
    await expect(translationService.translateMessage('hey good', 'es')).rejects.toMatchObject({ code: 'translation/unavailable' });
  });

  test('production Chat does not import or invoke the legacy translation boundary', () => {
    const chat = fs.readFileSync(path.resolve(__dirname, '..', 'ChatDetailScreen.js'), 'utf8');
    expect(chat).not.toMatch(/translationService|translateMessage|translated label/i);
  });
});
