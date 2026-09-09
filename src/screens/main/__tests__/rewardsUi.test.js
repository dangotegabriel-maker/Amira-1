import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
jest.setTimeout(30000);
let mockUser, mockRewardsListener;
const mockRewards = { getDashboard: jest.fn(), claimDailyCheckIn: jest.fn(),
  subscribe: jest.fn((listener) => { mockRewardsListener = listener; return () => {}; }) };
jest.mock('../../../context/UserContext', () => ({ useUser: () => ({ user: mockUser }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../../../services/rewardsService', () => ({ rewardsService: mockRewards }));
jest.mock('../../../services/firebaseService', () => ({ authService: { signOut: jest.fn() } }));
jest.mock('../../../services/socketService', () => ({ socketService: {} }));
jest.mock('../../../services/profileViewService', () => ({ profileViewService: { getAggregateCount: async () => 0 } }));
jest.mock('../../../services/hostApplicationService', () => ({ hostApplicationService: { getApplication: async () => null } }));
jest.mock('lucide-react-native', () => Object.fromEntries(['ChevronRight', 'Coins', 'Crown', 'Eye', 'Gift', 'Headphones', 'LogOut', 'Settings', 'ShieldCheck', 'Sparkles', 'Users'].map((key) => [key, () => null])));
const RewardsScreen = require('../RewardsScreen').default;
const MyProfileScreen = require('../MyProfileScreen').default;
const balances = { freeMessages: 0, freeVideoSeconds: 10, quickMatchCount: 0, promotionalGifts: { generic: 0 } };
const dashboard = () => ({ balances, dateKey: '2026-09-08', serverNowMs: Date.parse('2026-09-08T12:00:00Z'),
  nextDay: 1, checkIn: { totalClaims: 0, lastClaimDate: null }, alreadyClaimed: false, earnedVideoEnabled: false,
  schedule: Array.from({ length: 7 }, (_, index) => ({ freeMessages: index + 7 })), developmentDefaults: true });
const flush = async () => { await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); };
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers(); mockUser = { uid: 'c', role: 'consumer' };
  mockRewards.getDashboard.mockResolvedValue(dashboard());
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('consumer screen renders real balances and the server-provided seven-day schedule', async () => {
  const screen = render(<RewardsScreen />); await flush();
  expect(screen.getByText('0m 10s')).toBeTruthy();
  expect(screen.getByText('7 free messages')).toBeTruthy();
  expect(screen.getByText('Day 7')).toBeTruthy();
  expect(screen.getByText('Claim daily reward')).toBeTruthy();
  await act(async () => mockRewardsListener({ ...balances, freeVideoSeconds: 25 }));
  expect(screen.getByText('0m 25s')).toBeTruthy(); screen.unmount();
});
test('successful claim displays resulting balances and removes the claim button', async () => {
  mockRewards.claimDailyCheckIn.mockResolvedValue({ ...dashboard(), claimed: true, reward: { freeMessages: 7 },
    balances: { ...balances, freeMessages: 7 }, checkIn: { totalClaims: 1, lastClaimDate: '2026-09-08', lastRewardDay: 1 } });
  const screen = render(<RewardsScreen />); await flush();
  fireEvent.press(screen.getByText('Claim daily reward')); await flush();
  expect(mockRewards.claimDailyCheckIn).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Claim daily reward')).toBeNull();
  expect(screen.getByText('7')).toBeTruthy(); screen.unmount();
});
test('failed load shows a retry without fabricated balances or claim availability', async () => {
  mockRewards.getDashboard.mockRejectedValue(new Error('offline'));
  const screen = render(<RewardsScreen />); await flush();
  expect(screen.getByText('Try again')).toBeTruthy();
  expect(screen.queryByText('Claim daily reward')).toBeNull();
  expect(screen.queryByText('Free Video Time')).toBeNull(); screen.unmount();
});
test('approved host does not load or display consumer balances', async () => {
  mockUser = { uid: 'h', role: 'host', hostStatus: { isApproved: true } };
  const screen = render(<RewardsScreen />); await flush();
  expect(screen.toJSON()).toBeNull();
  expect(mockRewards.getDashboard).not.toHaveBeenCalled();
  expect(mockRewards.subscribe).not.toHaveBeenCalled(); screen.unmount();
});
test.each(['consumer', 'host'])('Profile rewards entry is scoped correctly for %s', async (role) => {
  mockUser = { uid: role, role, hostStatus: { isApproved: role === 'host' } };
  const navigation = { navigate: jest.fn() };
  const screen = render(<MyProfileScreen navigation={navigation} />); await flush();
  expect(Boolean(screen.queryByText('Rewards & Tasks'))).toBe(role === 'consumer');
  if (role === 'consumer') {
    fireEvent.press(screen.getByText('Rewards & Tasks'));
    expect(navigation.navigate).toHaveBeenCalledWith('Rewards');
  } else {
    expect(screen.getByText('Earnings')).toBeTruthy();
    expect(screen.queryByText('AMIRA CREDITS')).toBeNull();
  }
  screen.unmount();
});
