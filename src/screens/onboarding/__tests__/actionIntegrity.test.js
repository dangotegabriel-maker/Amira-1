import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
let mockSession;
const mockUpdate = jest.fn(), mockLogin = jest.fn(), mockQuick = jest.fn();
jest.mock('../../../context/UserContext', () => ({ useUser: () => ({ authenticatedSession: mockSession, user: { uid: 'a' }, updateProfile: mockUpdate }) }));
jest.mock('../../../services/firebaseService', () => ({ auth: { currentUser: { uid: 'a' } }, authService: { loginWithAccount: mockLogin, createQuickAccount: mockQuick } }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('../../../components/CountrySelectorModal', () => () => null);
jest.mock('expo-auth-session/providers/google', () => ({ useIdTokenAuthRequest: () => [null, null, jest.fn()] }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('../../../config/devFeatures', () => ({ DEV_FEATURES: { enableQuickLogin: true } }));
jest.mock('lucide-react-native', () => ({ LogIn: () => null, Sparkles: () => null }));
const Name = require('../NameSetupScreen').default, Birthday = require('../BirthdaySetupScreen').default;
const Gender = require('../GenderSetupScreen').default, Country = require('../CountrySetupScreen').default, Login = require('../LoginScreen').default;
const session = () => { const token = { isCurrent: () => mockSession === token }; mockSession = token; };
beforeEach(() => { jest.clearAllMocks(); session(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());
test.each([['name', Name], ['birthday', Birthday], ['gender', Gender], ['country', Country]])('%s save rejects same-frame duplicate writes and ignores late failure after session replacement', async (kind, Screen) => {
  let reject; mockUpdate.mockReturnValueOnce(new Promise((_done, fail) => { reject = fail; }));
  const screen = render(<Screen />);
  if (kind === 'name') fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Alice');
  if (kind === 'gender') fireEvent.press(screen.getByText('Woman'));
  const press = screen.UNSAFE_getAllByType(TouchableOpacity).find(button => ['saveName', 'handleContinue'].includes(button.props.onPress?.name)).props.onPress;
  act(() => { press(); press(); }); expect(mockUpdate).toHaveBeenCalledTimes(1);
  session(); screen.rerender(<Screen />);
  await act(async () => reject(new Error('old request')));
  expect(Alert.alert).not.toHaveBeenCalled();
  mockUpdate.mockResolvedValueOnce(undefined);
  await act(async () => screen.UNSAFE_getAllByType(TouchableOpacity).find(button => ['saveName', 'handleContinue'].includes(button.props.onPress?.name)).props.onPress());
  expect(mockUpdate).toHaveBeenCalledTimes(2);
});
test('invalid name does not leave the save spinner locked', async () => {
  const screen = render(<Name />);
  fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), '!');
  await act(async () => fireEvent.press(screen.getByText('Continue')));
  expect(mockUpdate).not.toHaveBeenCalled(); expect(screen.getByText('Continue')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('Enter your name'), 'Alice'); mockUpdate.mockResolvedValueOnce(undefined);
  await act(async () => fireEvent.press(screen.getByText('Continue')));
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});
test('account login and Quick Login share a synchronous auth lock and release it after failure', async () => {
  let reject; mockLogin.mockReturnValueOnce(new Promise((_done, fail) => { reject = fail; })).mockResolvedValueOnce(undefined);
  const screen = render(<Login />);
  fireEvent.changeText(screen.getByPlaceholderText('Account ID'), '123456');
  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');
  const buttons = screen.UNSAFE_getAllByType(TouchableOpacity);
  const login = buttons.find(button => button.props.onPress?.name === 'accountLogin').props.onPress;
  const quick = buttons.find(button => button.props.onPress?.name === 'quickLogin').props.onPress;
  act(() => { login(); login(); quick(); });
  expect(mockLogin).toHaveBeenCalledTimes(1); expect(mockQuick).not.toHaveBeenCalled();
  await act(async () => reject(new Error('bad credentials')));
  await act(async () => login()); expect(mockLogin).toHaveBeenCalledTimes(2);
});
test('login failure after auth screen unmount does not alert a replacement screen', async () => {
  let reject; mockLogin.mockReturnValueOnce(new Promise((_done, fail) => { reject = fail; }));
  const screen = render(<Login />);
  fireEvent.changeText(screen.getByPlaceholderText('Account ID'), '123456'); fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');
  act(() => { fireEvent.press(screen.getByText('Log in to account')); }); screen.unmount();
  await act(async () => reject(new Error('obsolete'))); expect(Alert.alert).not.toHaveBeenCalled();
});


test('network login failure does not accuse valid credentials and can retry',async()=>{
 mockLogin.mockRejectedValueOnce({code:'auth/network-request-failed'}).mockResolvedValueOnce();
 const screen=render(<Login/>);fireEvent.changeText(screen.getByPlaceholderText('Account ID'),'123456');fireEvent.changeText(screen.getByPlaceholderText('Password'),'secret');
 await act(async()=>fireEvent.press(screen.getByText('Log in to account')));
 expect(Alert.alert).toHaveBeenLastCalledWith('Login failed',expect.stringContaining('connection'));
 await act(async()=>fireEvent.press(screen.getByText('Log in to account')));expect(mockLogin).toHaveBeenCalledTimes(2);
});
