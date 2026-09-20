import { Alert } from 'react-native';
import { startVideoCall } from '../callNavigationService';
import { callService } from '../callService';
import { keyboardOverlap } from '../../hooks/useAndroidKeyboardOverlap';
jest.mock('../callService', () => ({ callService: { prepare: jest.fn(), request: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
test('denied preflight does not enter VideoCall and offers real Recharge route', async () => {
  const navigation = { navigate: jest.fn() };
  callService.request.mockRejectedValue({ details: { reason: 'insufficient_call_credits', ratePerMinute: 25 } });
  const pending=startVideoCall({ navigation, creator: { uid: 'h',hostProfile:{videoRateCredits:25} } });
  Alert.alert.mock.calls[0][2][1].onPress();await pending;
  expect(navigation.navigate).not.toHaveBeenCalled();
  Alert.alert.mock.calls[1][2][0].onPress();
  expect(navigation.navigate).toHaveBeenCalledWith('RechargeHub');
});
test('eligible entry uses canonical call service before navigation', async () => {
  const navigation = { navigate: jest.fn() }, call = { callId: 'real' }, creator = { uid: 'h',hostProfile:{videoRateCredits:25} };
  callService.request.mockResolvedValue(call);
  const pending=startVideoCall({ navigation, creator });Alert.alert.mock.calls[0][2][1].onPress();await pending;
  expect(navigation.navigate).toHaveBeenCalledWith('VideoCall', { call, creator });
});
test('keyboard fallback has zero offset after native resize and only residual overlap otherwise', () => {
  expect(keyboardOverlap(500,500)).toBe(0);
  expect(keyboardOverlap(800,500)).toBe(300);
  expect(keyboardOverlap(800,null)).toBe(0);
});
