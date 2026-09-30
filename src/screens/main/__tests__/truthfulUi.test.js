const mockAuthenticatedSession = { isCurrent: () => true };
import React from 'react';
import fs from 'fs';
import path from 'path';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockTerminateSession = jest.fn(async () => undefined);
jest.mock('lucide-react-native', () => Object.fromEntries(
  ['HelpCircle', 'MessageSquare', 'Images', 'Users', 'ChevronRight', 'Coins', 'Crown', 'Eye', 'Gift', 'Headphones', 'LogOut', 'Settings', 'ShieldCheck', 'Sparkles'].map(name => [name, () => null]),
));
jest.mock('../../../context/UserContext', () => ({ useUser: () => ({authenticatedSession:mockAuthenticatedSession, terminateSession: mockTerminateSession }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => false }));
jest.mock('../../../components/AmiraIdentity', () => ({ AmiraIdentity: () => null }));
jest.mock('../../../services/profileViewService', () => ({ profileViewService: {} }));
jest.mock('../../../services/hostApplicationService', () => ({ hostApplicationService: {} }));

const Moments = require('../MomentsScreen').default;
const InviteEarn = require('../InviteEarnScreen').default;
const Settings = require('../SettingsScreen').default;
const MyProfile = require('../MyProfileScreen').default;
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
    expect(mockTerminateSession).toHaveBeenCalledTimes(1);
    expect(navigation.reset).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  test('reports Firebase logout failure without presenting a signed-out transition', async () => {
    const failure = new Error('auth sign-out failed');
    mockTerminateSession.mockRejectedValueOnce(failure);
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((title, _message, actions) => {
      if (title === 'Logout') return actions.find(action => action.text === 'Logout').onPress();
      return undefined;
    });
    const screen = render(<Settings navigation={navigation} />);
    await act(async () => fireEvent.press(screen.getByLabelText('Logout')));
    await act(async () => Promise.resolve());
    expect(Alert.alert).toHaveBeenCalledWith('Unable to log out', 'Your account is still signed in. Please try again.');
    expect(navigation.reset).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});

test('My Profile catches shared termination failure without navigating or signing out independently', async () => {
  mockTerminateSession.mockRejectedValueOnce(new Error('auth sign-out failed'));
  const navigation = { navigate: jest.fn(), reset: jest.fn(), replace: jest.fn(), dispatch: jest.fn() };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((title, _message, actions) => {
    if (title === 'Log out') return actions.find(action => action.text === 'Log out').onPress();
    return undefined;
  });
  try {
    const screen = render(<MyProfile navigation={navigation} />);
    await act(async () => fireEvent.press(screen.getByText('Log out')));
    expect(mockTerminateSession).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('Unable to log out', 'Your account is still signed in. Please try again.');
    for (const action of Object.values(navigation)) expect(action).not.toHaveBeenCalled();
    expect(source('MyProfileScreen.js')).not.toMatch(/authService\.signOut|firebaseSignOut|socketService\.disconnect/);
  } finally {
    alert.mockRestore();
  }
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


test('Profile credit history and VIP status are reachable',()=>{
 const navigation={navigate:jest.fn()};
 const profile=render(<MyProfile navigation={navigation}/>);
 fireEvent.press(profile.getByText('Credit history'));
 expect(navigation.navigate).toHaveBeenCalledWith('Wallet');profile.unmount();
 const VipInfo=require('../VipInfoScreen').default;
 const vip=render(<VipInfo navigation={navigation}/>);
 fireEvent.press(vip.getByText('View VIP status'));
 expect(navigation.navigate).toHaveBeenCalledWith('VIPStore');
});

test('unfinished support destinations are truthfully disabled',()=>{
 const Support=require('../HelpSupportScreen').default,navigation={navigate:jest.fn()};
 const screen=render(<Support navigation={navigation}/>);
 for(const title of ['Frequently Asked Questions','Contact Live Support','Safety & Privacy Guide']){
  const row=screen.getByLabelText(`${title}, not available yet`);
  expect(row.props.accessibilityState).toEqual({disabled:true});fireEvent.press(row);
 }
 expect(navigation.navigate).not.toHaveBeenCalled();
});

test('OTP direct entry without params explains unavailability and returns to sign in',()=>{
 const OTP=require('../../onboarding/OTPScreen').default,navigation={reset:jest.fn()};
 const screen=render(<OTP navigation={navigation}/>);
 expect(screen.getByText('Phone sign-in unavailable')).toBeTruthy();
 fireEvent.press(screen.getByText('Back to sign in'));
 expect(navigation.reset).toHaveBeenCalledWith({index:0,routes:[{name:'Login'}]});
});
