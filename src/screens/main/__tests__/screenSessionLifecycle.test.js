import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
jest.setTimeout(30000);
let mockSession;
const mockUser={uid:'c',username:'Alice',dob:'1990-01-01',countryCode:'GH',hostStatus:{isApproved:false}};
const mockWallet=jest.fn(),mockVip=jest.fn(),mockApplication=jest.fn(),mockAuthUpdate=jest.fn(),mockProfileUpdate=jest.fn(),mockRefresh=jest.fn();
jest.mock('../../../context/UserContext',()=>({useUser:()=>({user:mockUser,authenticatedSession:mockSession,refreshUser:mockRefresh})}));
jest.mock('@react-navigation/native',()=>({useFocusEffect:callback=>require('react').useEffect(callback,[callback]),useIsFocused:()=>true}));
jest.mock('../../../services/creditWalletService',()=>({creditWalletService:{getWallet:()=>mockWallet(),listHistory:async()=>({entries:[]})}}));
jest.mock('../../../services/vipService',()=>({vipService:{state:()=>mockVip(),plans:async()=>({available:false,plans:[]})}}));
jest.mock('../../../services/firebaseService',()=>({auth:{currentUser:{uid:'c'}},authService:{updateUserProfile:(...args)=>mockAuthUpdate(...args)},dbService:{updateUserProfile:(...args)=>mockProfileUpdate(...args)}}));
jest.mock('../../../services/hostApplicationService',()=>({hostApplicationService:{getApplication:()=>mockApplication()}}));
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
