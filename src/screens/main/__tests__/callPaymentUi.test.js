import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

// React Native's first component render can require slow cold transforms on Windows.
jest.setTimeout(30000);

let mockListener;
let mockUser;
const mockRtc = {
  subscribe: jest.fn(() => () => {}), requestPermissions: jest.fn(async () => {}),
  joinSession: jest.fn(async () => {}), leaveSession: jest.fn(async () => {}),
  setMicrophoneMuted: jest.fn(async () => {}), setCameraEnabled: jest.fn(async () => {}), switchCamera: jest.fn(),
};
const mockCalls = {
  subscribe: jest.fn((_id, listener) => { mockListener = listener; return () => {}; }),
  getRtcCredentials: jest.fn(async () => ({ token: 'test' })), acknowledgeConnected: jest.fn(async () => ({})),
  syncPaymentState: jest.fn(async () => ({ serverNowMs: Date.now() })),
  confirmPaid: jest.fn(async () => ({ billingMode: 'paid' })), settleIncrement: jest.fn(async () => ({})),
  end: jest.fn(async () => ({ durationSeconds: 30, billedCredits: 5 })),
};
jest.mock('../../../context/UserContext', () => ({ useUser: () => ({ user: mockUser, coins: 100 }) }));
jest.mock('../../../services/rtcService', () => ({ rtcService: mockRtc }));
jest.mock('../../../services/callService', () => ({ callService: mockCalls }));
jest.mock('../../../services/blockService', () => ({ blockService: { block: jest.fn() } }));
jest.mock('../../../services/reportService', () => ({ reportService: { submit: jest.fn() } }));
jest.mock('../../../services/firebaseService', () => ({ dbService: {} }));
jest.mock('../../../services/hapticService', () => ({ hapticService: { lightImpact: jest.fn() } }));
jest.mock('../../../components/RtcVideoView', () => ({ LocalRtcVideoView: () => null, RemoteRtcVideoView: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('lucide-react-native', () => ({
  Flag: () => null, Mic: () => null, MicOff: () => null, PhoneOff: () => null, RefreshCw: () => null,
  Star: () => null, UserPlus: () => null, Home: () => null, Check: () => null,
}));

const VideoCallScreen = require('../VideoCallScreen').default;
const CallSummaryScreen = require('../CallSummaryScreen').default;
const { getCallPaymentPresentation } = require('../../../services/callUiState');
const navigation = { replace: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
const pendingCall = () => ({ callId: 'call-1', callerId: 'consumer', receiverId: 'host', participantIds: ['consumer', 'host'],
  status: 'connected', billingMode: 'awaiting_paid_confirmation', ratePerMinute: 25,
  connectedAtMs: Date.now() - 30000, previewEndsAtMs: Date.now(), paymentDecisionDeadlineMs: Date.now() + 60000 });
const flush = async () => { await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); };
const open = async (call = pendingCall()) => {
  const screen = render(<VideoCallScreen navigation={navigation} route={{ params: {
    call, creator: { uid: mockUser.uid === 'consumer' ? 'host' : 'consumer', username: mockUser.uid === 'consumer' ? 'Host' : 'Alex', hostProfile: { videoRateCredits: 9999 } },
  } }} />);
  await act(async () => mockListener(call));
  await flush();
  return screen;
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-08T12:00:00Z'));
  jest.clearAllMocks();
  mockUser = { uid: 'consumer', role: 'consumer', vip: { tier: 'VIP_3', status: 'active' } };
  mockCalls.confirmPaid.mockResolvedValue({ billingMode: 'paid' });
  mockCalls.syncPaymentState.mockImplementation(async () => ({ serverNowMs: Date.now() }));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('consumer sees captured rate and consent, pauses media, and restores only after persisted paid state', async () => {
  const call = pendingCall(), screen = await open(call);
  expect(screen.getByText('Continue Paid')).toBeTruthy();
  expect(screen.queryByText(/9999/)).toBeNull();
  expect(mockRtc.setMicrophoneMuted).toHaveBeenLastCalledWith(true);
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(false);
  fireEvent.press(screen.getByText('Continue Paid'));
  await flush();
  expect(mockCalls.confirmPaid).toHaveBeenCalledWith('call-1');
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(false);
  await act(async () => mockListener({ ...call, billingMode: 'paid', paidStartedAtMs: Date.now(), paymentDecisionDeadlineMs: null }));
  expect(mockRtc.setMicrophoneMuted).toHaveBeenLastCalledWith(false);
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(true);
  expect(mockRtc.joinSession).toHaveBeenCalledTimes(1);
  expect(mockRtc.leaveSession).not.toHaveBeenCalled();
  screen.unmount();
});

test('host sees neutral waiting state and retains safety and End Call without spending controls', async () => {
  mockUser = { uid: 'host', role: 'host' };
  const screen = await open();
  expect(screen.queryByText('Continue Paid')).toBeNull();
  expect(screen.getAllByText('Waiting for Alex to continue').length).toBeGreaterThan(0);
  expect(screen.getByLabelText('Call safety')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('End Call'));
  await flush();
  expect(mockCalls.confirmPaid).not.toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('CallSummary', expect.objectContaining({ isConsumer: false }));
  screen.unmount();
});

test('insufficient-credit error keeps media paused and allows consumer to end', async () => {
  mockCalls.confirmPaid.mockRejectedValue(Object.assign(new Error('Not enough credits to continue.'), {
    details: { reason: 'insufficient_credits', requiredCredits: 5, availableCredits: 4 },
  }));
  const screen = await open();
  fireEvent.press(screen.getByText('Continue Paid'));
  await flush();
  expect(Alert.alert).toHaveBeenCalledWith('Not enough credits to continue', 'Not enough credits to continue.');
  expect(mockRtc.setMicrophoneMuted).toHaveBeenLastCalledWith(true);
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(false);
  fireEvent.press(screen.getByLabelText('End Call'));
  await flush();
  expect(navigation.replace).toHaveBeenCalledWith('CallSummary', expect.objectContaining({ isConsumer: true, coinsSpent: 5 }));
  screen.unmount();
});

test('preview countdown projects the server deadline and requests authoritative expiry while pausing media', async () => {
  const call = { ...pendingCall(), billingMode: 'preview', connectedAtMs: Date.now(), previewEndsAtMs: Date.now() + 30000 };
  const screen = await open(call);
  expect(screen.getByText('FREE PREVIEW · 0:30')).toBeTruthy();
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(true);
  await act(async () => jest.advanceTimersByTime(30000));
  await flush();
  expect(screen.getByText('FREE PREVIEW · 0:00')).toBeTruthy();
  expect(screen.queryByText('Continue Paid')).toBeNull();
  expect(mockCalls.syncPaymentState.mock.calls.length).toBeGreaterThan(1);
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(false);
  await act(async () => mockListener({ ...call, billingMode: 'awaiting_paid_confirmation' }));
  expect(screen.getByText('Continue Paid')).toBeTruthy();
  screen.unmount();
});

test('expired decision cannot show Continue Paid', async () => {
  const call = { ...pendingCall(), paymentDecisionDeadlineMs: Date.now() - 1 };
  const screen = await open(call);
  expect(screen.getByText('Payment decision expired')).toBeTruthy();
  expect(screen.queryByText('Continue Paid')).toBeNull();
  expect(mockRtc.setCameraEnabled).toHaveBeenLastCalledWith(false);
  screen.unmount();
});

test('deadline closes local RTC if the payment callable is unreachable', async () => {
  mockCalls.syncPaymentState.mockRejectedValue(new Error('offline'));
  const screen = await open({ ...pendingCall(), paymentDecisionDeadlineMs: Date.now() - 1 });
  await flush();
  expect(mockRtc.leaveSession).toHaveBeenCalled();
  expect(mockCalls.end).toHaveBeenCalledWith('call-1', 'payment_decision_timeout');
  screen.unmount();
});

test('deadline countdown does not restart on remount or tick count', () => {
  const call = { billingMode: 'preview', previewEndsAtMs: 40000 };
  expect(getCallPaymentPresentation(call, 39500)).toMatchObject({ previewRemaining: 1, mediaPaused: false });
  expect(getCallPaymentPresentation(call, 40000)).toMatchObject({ previewRemaining: 0, mediaPaused: true });
  expect(getCallPaymentPresentation(call, 90000).previewRemaining).toBe(0);
});

test.each([true, false])('summary shows Credits used only for consumer=%s, with no invented host earnings', (isConsumer) => {
  const screen = render(<CallSummaryScreen navigation={navigation} route={{ params: {
    duration: 30, coinsSpent: 5, isConsumer, targetUserName: 'Alex',
  } }} />);
  expect(Boolean(screen.queryByText('Credits used'))).toBe(isConsumer);
  expect(screen.queryByText('Diamonds Earned')).toBeNull();
  screen.unmount();
});
