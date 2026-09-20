import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
jest.setTimeout(30000);
let mockUser, mockRewardsListener;
const mockIdentityEnsure=jest.fn();
const mockRewards = { getDashboard: jest.fn(), claimDailyCheckIn: jest.fn(),
  getTasks: jest.fn(), claimTask: jest.fn(),
  subscribe: jest.fn((listener) => { mockRewardsListener = listener; return () => {}; }) };
jest.mock('../../../context/UserContext', () => ({ useUser: () => ({ user: mockUser }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../../../services/amiraIdentityService',()=>({amiraIdentityService:{ensure:mockIdentityEnsure}}));
jest.mock('../../../services/rewardsService', () => ({ rewardsService: mockRewards }));
jest.mock('../../../services/firebaseService', () => ({ authService: { signOut: jest.fn() } }));
jest.mock('../../../services/socketService', () => ({ socketService: {} }));
jest.mock('../../../services/profileViewService', () => ({ profileViewService: { getAggregateCount: async () => 0 } }));
jest.mock('../../../services/hostApplicationService', () => ({ hostApplicationService: { getApplication: async () => null } }));
jest.mock('lucide-react-native', () => Object.fromEntries(['ChevronRight', 'Coins', 'Crown', 'Eye', 'Gift', 'Headphones', 'LogOut', 'Settings', 'ShieldCheck', 'Sparkles', 'Users'].map((key) => [key, () => null])));
const RewardsScreen = require('../RewardsScreen').default;
const MyProfileScreen = require('../MyProfileScreen').default;
const balances = { freeMessages: 0, freeVideoSeconds: 10, quickMatchCount: 0 };
const dashboard = () => ({ balances, dateKey: '2026-09-08', serverNowMs: Date.parse('2026-09-08T12:00:00Z'),
  nextDay: 1, checkIn: { totalClaims: 0, lastClaimDate: null }, alreadyClaimed: false, earnedVideoEnabled: false,
  schedule: Array.from({ length: 7 }, (_, index) => ({ freeMessages: index + 7 })), developmentDefaults: true });
const flush = async () => { await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); };
beforeEach(() => {
  mockIdentityEnsure.mockResolvedValue({amiraId:null});
  jest.clearAllMocks(); jest.useFakeTimers(); mockUser = { uid: 'c', role: 'consumer' };
  mockRewards.getDashboard.mockResolvedValue(dashboard());
  mockRewards.getTasks.mockResolvedValue({configAvailable:false,gettingStarted:[],daily:[]});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('consumer screen renders real balances and the server-provided seven-day schedule', async () => {
  const screen = render(<RewardsScreen />); await flush();
  expect(screen.getByText('0m 10s')).toBeTruthy();
  expect(screen.getByText('7 Chat Passes')).toBeTruthy();
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


test.each(['submitted','pending','under_review'])('%s applicant keeps Consumer Profile entries',async(status)=>{
 mockUser={uid:'p',role:'host',hostStatus:{isApproved:false,hasApplied:true,verificationStatus:status}};
 const screen=render(<MyProfileScreen navigation={{navigate:jest.fn()}}/>);await flush();
 for(const text of ['AMIRA CREDITS','Rewards & Tasks','Who Viewed Me','Amira VIP','Application Under Review'])expect(screen.getByText(text)).toBeTruthy();
 expect(screen.queryByText('Earnings')).toBeNull();screen.unmount();
});
test('approved Profile hides consumer shortcuts despite historical Consumer data',async()=>{
 mockUser={uid:'h',role:'consumer',hostStatus:{isApproved:true},wallet:{creditBalance:123},vip:{tier:'VIP_3',status:'active'}};
 const screen=render(<MyProfileScreen navigation={{navigate:jest.fn()}}/>);await flush();
 for(const text of ['AMIRA CREDITS','Recharge','Rewards & Tasks','Who Viewed Me','Amira VIP','Switch back to Consumer'])expect(screen.queryByText(text)).toBeNull();
 expect(screen.getByText('Earnings')).toBeTruthy();expect(screen.getByText('Manage consumers you follow')).toBeTruthy();screen.unmount();
 const rewards=render(<RewardsScreen/>);await flush();expect(rewards.toJSON()).toBeNull();expect(mockRewards.getDashboard).not.toHaveBeenCalled();rewards.unmount();
});
test('old pending Host role can still access Consumer rewards',async()=>{
 mockUser={uid:'p',role:'host',hostStatus:{isApproved:false,verificationStatus:'submitted'}};
 const screen=render(<RewardsScreen/>);await flush();expect(screen.getByText('Claim daily reward')).toBeTruthy();expect(mockRewards.getDashboard).toHaveBeenCalled();screen.unmount();
});


test.each([false,true])('My Level profile entry remains Consumer-only, approved=%s',async(approved)=>{
 mockUser={uid:'p',role:'host',hostStatus:{isApproved:approved,verificationStatus:'pending'}};const navigation={navigate:jest.fn()},screen=render(<MyProfileScreen navigation={navigation}/>);await flush();
 expect(Boolean(screen.queryByText('My Level'))).toBe(!approved);if(!approved){fireEvent.press(screen.getByText('My Level'));expect(navigation.navigate).toHaveBeenCalledWith('MyLevel');expect(screen.getByText('Rewards & Tasks')).toBeTruthy();}screen.unmount();
});
test('Rewards shows no obsolete Gift tile or claim copy and explains UTC resets',async()=>{const next=dashboard();next.schedule[3]={};mockRewards.getDashboard.mockResolvedValue(next);const screen=render(<RewardsScreen/>);await flush();expect(screen.queryByText(/promotional gift/i)).toBeNull();expect(screen.getByText(/Missing a UTC day resets/)).toBeTruthy();expect(screen.getByText('Check-in only')).toBeTruthy();screen.unmount();});
test('task sections fail closed without config and claim only server-claimable definitions',async()=>{mockRewards.getTasks.mockResolvedValue({configAvailable:true,gettingStarted:[{id:'bio',scope:'getting_started',title:'Add a bio',description:'Tell Hosts about yourself.',progress:1,target:1,claimable:true,claimed:false,reward:{type:'FREE_MESSAGES',amount:2,description:'2 Chat Passes'}}],daily:[]});mockRewards.claimTask.mockResolvedValue({claimed:true,idempotent:false});const screen=render(<RewardsScreen/>);await flush();expect(screen.getByText('Getting Started')).toBeTruthy();expect(screen.getByText('Daily Tasks')).toBeTruthy();expect(screen.getAllByText(/2 Chat Passes/).length).toBeGreaterThan(0);fireEvent.press(screen.getByText('Claim'));await flush();expect(mockRewards.claimTask).toHaveBeenCalledWith('getting_started','bio');screen.unmount();});

test.each([false,true])('own Consumer/Host full account profile displays ensured public identity, never UID: %p',async approved=>{mockUser={uid:'internal-private-uid',username:'Actual account',hostStatus:{isApproved:approved}};mockIdentityEnsure.mockResolvedValue({amiraId:'AMR-583921'});const screen=render(<MyProfileScreen navigation={{}}/>);await flush();expect(screen.getByText('AMR-583921')).toBeTruthy();expect(screen.getByLabelText('Copy Amira ID')).toBeTruthy();expect(screen.queryByText('internal-private-uid')).toBeNull();screen.unmount();});
