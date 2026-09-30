import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
jest.setTimeout(30000);
let mockSession;
const mockUser={uid:'c',username:'Alice',dob:'1990-01-01',countryCode:'GH',hostStatus:{isApproved:false}};
const mockWallet=jest.fn(),mockVip=jest.fn(),mockApplication=jest.fn(),mockSaveDraft=jest.fn(),mockSubmit=jest.fn(),mockAuthUpdate=jest.fn(),mockProfileUpdate=jest.fn(),mockRefresh=jest.fn();
jest.mock('../../../context/UserContext',()=>({useUser:()=>({user:mockUser,authenticatedSession:mockSession,refreshUser:mockRefresh})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:callback=>require('react').useEffect(callback,[callback]),useIsFocused:()=>true}));
jest.mock('../../../services/creditWalletService',()=>({creditWalletService:{getWallet:()=>mockWallet(),listHistory:async()=>({entries:[]})}}));
jest.mock('../../../services/vipService',()=>({vipService:{state:()=>mockVip(),plans:async()=>({available:false,plans:[]})}}));
jest.mock('../../../services/firebaseService',()=>({auth:{currentUser:{uid:'c'}},authService:{updateUserProfile:(...args)=>mockAuthUpdate(...args)},dbService:{updateUserProfile:(...args)=>mockProfileUpdate(...args)}}));
jest.mock('../../../services/hostApplicationService',()=>({hostApplicationService:{getApplication:()=>mockApplication(),saveDraft:(...args)=>mockSaveDraft(...args),submit:()=>mockSubmit()}}));
jest.mock('../../../services/mediaService',()=>({mediaService:{}}));
jest.mock('../../../components/CountrySelectorModal',()=>()=>null);
jest.mock('expo-image',()=>({Image:()=>null}));
jest.mock('expo-image-picker',()=>({}));
jest.mock('lucide-react-native',()=>Object.fromEntries(['Wallet','Coins','ChevronLeft','Camera','Check','Crown','CheckCircle2','ChevronRight','ImagePlus','Video','X'].map(name=>[name,()=>null])));
const Wallet=require('../WalletScreen').default,Recharge=require('../RechargeHubScreen').default,Vip=require('../VIPStoreScreen').default,Edit=require('../EditProfileScreen').default,Application=require('../../host/HostApplicationScreen').default;
const change=()=>{const token={isCurrent:()=>mockSession===token};mockSession=token;};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>act(async()=>{});
beforeEach(()=>{jest.clearAllMocks();change();mockWallet.mockReset().mockResolvedValue({totalCredits:7});mockVip.mockReset().mockResolvedValue({active:false});mockApplication.mockReset().mockResolvedValue(null);jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
test.each([['Wallet',Wallet],['Recharge',Recharge]])('%s cannot display an obsolete same-UID balance',async(_name,Screen)=>{
  const pending=deferred();mockWallet.mockReturnValueOnce(pending.promise);const screen=render(<Screen navigation={{}}/>);change();screen.rerender(<Screen navigation={{}}/>);await flush();await act(async()=>pending.resolve({totalCredits:999999}));expect(screen.queryByText('999,999')).toBeNull();expect(screen.getByText('7')).toBeTruthy();
});
test('VIP response from an unmounted screen is ignored',async()=>{const pending=deferred();mockVip.mockReturnValueOnce(pending.promise);const screen=render(<Vip/>);screen.unmount();await act(async()=>pending.resolve({active:true,planId:'old'}));expect(Alert.alert).not.toHaveBeenCalled();});
test('application hydration cannot reveal an obsolete session application',async()=>{
  const pending=deferred();mockApplication.mockReturnValueOnce(pending.promise);const screen=render(<Application navigation={{}}/>);change();screen.rerender(<Application navigation={{}}/>);await flush();await act(async()=>pending.resolve({status:'pending',details:{bio:'Old private draft'}}));expect(screen.queryByText('Application Under Review')).toBeNull();expect(screen.getByText('Welcome to your host application')).toBeTruthy();
});
test.each(['replacement','unmount'])('Edit Profile stops its write chain and navigation after %s',async kind=>{
  const pending=deferred();mockAuthUpdate.mockReturnValueOnce(pending.promise);const navigation={goBack:jest.fn()};const screen=render(<Edit navigation={navigation}/>);
  const save=screen.UNSAFE_getAllByType(TouchableOpacity).find(button=>button.props.onPress?.name==='handleSave');act(()=>{fireEvent.press(save);});
  if(kind==='replacement')change();else screen.unmount();await act(async()=>pending.resolve());expect(mockProfileUpdate).not.toHaveBeenCalled();expect(mockRefresh).not.toHaveBeenCalled();expect(Alert.alert).not.toHaveBeenCalled();expect(navigation.goBack).not.toHaveBeenCalled();
});


test('Country is read-only and excluded from profile writes',async()=>{
 const screen=render(<Edit navigation={{goBack:jest.fn()}}/>);
 expect(screen.getByLabelText('Country, read only')).toBeTruthy();
 const save=screen.UNSAFE_getAllByType(TouchableOpacity).find(button=>button.props.onPress?.name==='handleSave');
 await act(async()=>fireEvent.press(save));
 expect(mockProfileUpdate).toHaveBeenCalledTimes(1);
 const patch=mockProfileUpdate.mock.calls[0][1];
 for(const key of ['countryCode','countryName','phoneCode','dob'])expect(patch).not.toHaveProperty(key);
});

test('failed application hydration blocks editing and retries the authoritative draft',async()=>{
 mockApplication.mockRejectedValueOnce(new Error('offline'));
 const screen=render(<Application navigation={{goBack:jest.fn()}}/>);await flush();
 expect(screen.getByText('Application could not be loaded.')).toBeTruthy();
 expect(screen.queryByText('Continue')).toBeNull();
 mockApplication.mockResolvedValueOnce({status:'in_progress',details:{bio:'A previously saved creator biography'}});
 await act(async()=>fireEvent.press(screen.getByText('Try again')));
 await act(async()=>fireEvent.press(screen.getByText('Continue')));
 expect(screen.getByDisplayValue('A previously saved creator biography')).toBeTruthy();
 expect(mockApplication).toHaveBeenCalledTimes(2);
});

test('Creator Continue is single-shot and Back cannot race an unfinished save',async()=>{
 const screen=render(<Application navigation={{goBack:jest.fn()}}/>);await flush();
 const continueButton=screen.UNSAFE_getAllByType(TouchableOpacity).find(button=>button.props.onPress?.name==='next');
 await act(async()=>{continueButton.props.onPress();continueButton.props.onPress();});
 expect(screen.getByText('Your Profile')).toBeTruthy();
 fireEvent.changeText(screen.getByPlaceholderText('Tell consumers what makes a conversation with you special'),'A sufficiently detailed creator biography');
 const pending=deferred();mockSaveDraft.mockReturnValueOnce(pending.promise);
 const save=screen.UNSAFE_getAllByType(TouchableOpacity).find(button=>button.props.onPress?.name==='next');
 act(()=>{save.props.onPress();save.props.onPress();fireEvent.press(screen.getByLabelText('Previous application step'));});
 expect(mockSaveDraft).toHaveBeenCalledTimes(1);
 expect(screen.getByText('Your Profile')).toBeTruthy();
 await act(async()=>pending.resolve());
 expect(screen.getByText('Photos')).toBeTruthy();
 fireEvent.press(screen.getByLabelText('Previous application step'));
 expect(screen.getByText('Your Profile')).toBeTruthy();
});

test('Creator preview follows all seven steps and missing media prevents submission',async()=>{
 const screen=render(<Application navigation={{goBack:jest.fn()}}/>);await flush();
 expect(screen.getByText('About You')).toBeTruthy();
 await act(async()=>fireEvent.press(screen.getByText('Continue')));
 fireEvent.changeText(screen.getByPlaceholderText('Tell consumers what makes a conversation with you special'),'A sufficiently detailed creator biography');
 for(const step of ['Photos','Intro Video','Verification','Payout Setup']){
  await act(async()=>fireEvent.press(screen.getByText('Continue')));
  expect(screen.getByText(step)).toBeTruthy();
 }
 fireEvent.press(screen.getByText('Mobile Money'));
 await act(async()=>fireEvent.press(screen.getByText('Continue')));
 expect(screen.getByText('Review & Submit')).toBeTruthy();
 expect(screen.getByText('Submit for Review')).toBeDisabled();
 fireEvent.press(screen.getByText('Submit for Review'));
 expect(mockSubmit).not.toHaveBeenCalled();
 expect(mockUser.hostStatus.isApproved).toBe(false);
});

test('pending Creator returns to the Consumer experience without granting a role',async()=>{
 mockApplication.mockResolvedValueOnce({status:'pending'});
 const navigation={goBack:jest.fn()},screen=render(<Application navigation={navigation}/>);await flush();
 expect(screen.getByText('Application Under Review')).toBeTruthy();
 fireEvent.press(screen.getByText('Back'));
 expect(navigation.goBack).toHaveBeenCalledTimes(1);
 expect(mockProfileUpdate).not.toHaveBeenCalled();expect(mockAuthUpdate).not.toHaveBeenCalled();
 expect(mockUser.hostStatus.isApproved).toBe(false);
});


test('failed VIP read does not infer FREE and retries authoritative status',async()=>{
 mockVip.mockRejectedValueOnce(new Error('offline'));
 const screen=render(<Vip/>);await flush();
 expect(screen.getByText('VIP information could not be loaded.')).toBeTruthy();
 expect(screen.queryByText('One membership with fixed 3-day, 7-day, or 30-day purchase options.')).toBeNull();
 mockVip.mockResolvedValueOnce({active:true,planId:'VIP_7',expiresAtMs:1800000000000});
 await act(async()=>fireEvent.press(screen.getByText('Try again')));
 expect(screen.getByText('VIP is active')).toBeTruthy();
 expect(mockVip).toHaveBeenCalledTimes(2);
});
