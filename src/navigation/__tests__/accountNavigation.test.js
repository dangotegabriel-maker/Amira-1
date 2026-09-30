let mockAuthenticatedSession = { key: "session-1", isCurrent: () => true };
const mockMount = jest.fn(), mockUnmount = jest.fn();
jest.mock('../../components/IncomingCallListener',()=>({children})=>children);
jest.mock('../../screens/main/MyLevelScreen',()=>()=>null);
import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
let mockUser, mockStatus;
const mockRetry = jest.fn();
jest.mock('../../context/UserContext',()=>({useUser:()=>({authenticatedSession:mockAuthenticatedSession,user:mockUser,loading:['auth_loading','profile_loading'].includes(mockStatus),bootstrapStatus:mockStatus,retryProfile:mockRetry})}));
jest.mock('../../context/MessageActivityContext',()=>({useMessageActivity:()=>({unread:0}),MessageActivityProvider:({children})=>children}));
jest.mock('../../services/socketService',()=>({socketService:{on:jest.fn(),off:jest.fn()}}));
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>true,useNavigation:()=>({navigate:jest.fn()})}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaProvider:({children})=>{require('react').useEffect(()=>{mockMount();return ()=>mockUnmount();},[]);return children;}}));
jest.mock('lucide-react-native',()=>Object.fromEntries(['Compass','HeartHandshake','Activity','MessageCircle','User'].map(key=>[key,()=>null])));
jest.mock('@react-navigation/bottom-tabs',()=>({createBottomTabNavigator:()=>({Navigator:({children,initialRouteName})=>{const {View}=require('react-native');return <View testID="tabs" accessibilityLabel={initialRouteName}>{children}</View>},Screen:({name})=>{const {Text}=require('react-native');return <Text>{name}</Text>}})}));
jest.mock('@react-navigation/native-stack',()=>({createNativeStackNavigator:()=>({Navigator:({children})=>children,Group:({children})=>children,Screen:({name,options})=>{const {Text}=require('react-native');return <Text testID={`route-${name}`} accessibilityHint={options?.headerShown?'native-header':undefined}>{name}</Text>}})}));
jest.mock('../../screens/host/HostActivityScreen',()=>()=>null);
jest.mock('../../screens/host/HostApplicationScreen',()=>()=>null);
jest.mock('../../screens/host/HostDashboardScreen',()=>()=>null);
jest.mock('../../screens/host/HostEarningsScreen',()=>()=>null);
jest.mock('../../screens/host/HostVisitorsScreen',()=>()=>null);
jest.mock('../../screens/main/BlockedUsersScreen',()=>()=>null);
jest.mock('../../screens/main/CallSummaryScreen',()=>()=>null);
jest.mock('../../screens/main/ChatDetailScreen',()=>()=>null);
jest.mock('../../screens/main/EditProfileScreen',()=>()=>null);
jest.mock('../../screens/main/FollowingScreen',()=>()=>null);
jest.mock('../../screens/main/GiftLedgerScreen',()=>()=>null);
jest.mock('../../screens/main/HelpSupportScreen',()=>()=>null);
jest.mock('../../screens/main/HomeScreen',()=>()=>null);
jest.mock('../../screens/main/InviteEarnScreen',()=>()=>null);
jest.mock('../../screens/main/LeaderboardScreen',()=>()=>null);
jest.mock('../../screens/main/MatchScreen',()=>()=>null);
jest.mock('../../screens/main/MessageHomeScreen',()=>()=>null);
jest.mock('../../screens/main/MomentsScreen',()=>()=>null);
jest.mock('../../screens/main/MyProfileScreen',()=>()=>null);
jest.mock('../../screens/main/PaymentMethodScreen',()=>()=>null);
jest.mock('../../screens/main/PaymentScreen',()=>()=>null);
jest.mock('../../screens/main/RechargeHubScreen',()=>()=>null);
jest.mock('../../screens/main/RewardsScreen',()=>()=>null);
jest.mock('../../screens/main/SettingsScreen',()=>()=>null);
jest.mock('../../screens/main/StoryViewerScreen',()=>()=>null);
jest.mock('../../screens/main/UserProfileScreen',()=>()=>null);
jest.mock('../../screens/main/VIPStoreScreen',()=>()=>null);
jest.mock('../../screens/main/VideoCallScreen',()=>()=>null);
jest.mock('../../screens/main/VipInfoScreen',()=>()=>null);
jest.mock('../../screens/main/WalletScreen',()=>()=>null);
jest.mock('../../screens/main/WhoViewedMeScreen',()=>()=>null);
jest.mock('../../screens/onboarding/BirthdaySetupScreen',()=>()=>null);
jest.mock('../../screens/onboarding/CountrySetupScreen',()=>()=>null);
jest.mock('../../screens/onboarding/GenderSetupScreen',()=>()=>null);
jest.mock('../../screens/onboarding/LoginScreen',()=>()=>null);
jest.mock('../../screens/onboarding/NameSetupScreen',()=>()=>null);
jest.mock('../../screens/onboarding/OTPScreen',()=>()=>null);
jest.mock('../../screens/onboarding/PhoneLoginScreen',()=>()=>null);
const Main=require('../MainTabNavigator').default,Root=require('../RootNavigator').default;
beforeEach(()=>{mockStatus='ready';mockRetry.mockClear();mockUser={uid:'p',username:'Person',dob:'1990-01-01',gender:'other',countryCode:'GH',role:'consumer',hostStatus:{isApproved:false}};});
test.each(['draft','submitted','pending','under_review'])('%s stays in Consumer tabs without Host privileges',status=>{
 mockUser.role='host';mockUser.hostStatus.verificationStatus=status;
 const screen=render(<Main/>);for(const text of ['Home','Match','Messages','Profile'])expect(screen.getByText(text)).toBeTruthy();for(const text of ['Connect','Activity','RoleSelection'])expect(screen.queryByText(text)).toBeNull();expect(screen.getByTestId('tabs').props.accessibilityLabel).toBe('Home');screen.unmount();
});
test('trusted approval replaces Consumer navigation with permanent Host destinations',()=>{
 const screen=render(<Main/>);mockUser={...mockUser,hostStatus:{isApproved:true}};screen.rerender(<Main/>);
 for(const text of ['Connect','Messages','Activity','Profile'])expect(screen.getByText(text)).toBeTruthy();for(const text of ['Home','Match','Switch to Consumer'])expect(screen.queryByText(text)).toBeNull();expect(screen.getByTestId('tabs').props.accessibilityLabel).toBe('Connect');screen.unmount();
});
test('approved Host stack excludes Consumer purchase/rewards/visitors and legacy withdrawals',()=>{
 mockUser.hostStatus.isApproved=true;const screen=render(<Root/>);
 for(const text of ['HostEarnings','FollowingList','HostVisitors'])expect(screen.getByText(text)).toBeTruthy();
 for(const text of ['MyLevel','Wallet','RechargeHub','VIPStore','Rewards','WhoViewedMe','VipInfo','Withdrawal','GiftLedger','HostApplication','RoleSelection'])expect(screen.queryByText(text)).toBeNull();screen.unmount();
});
test('pending applicant retains Consumer routes but cannot open earnings/Host visitors',()=>{
 mockUser.role='host';mockUser.hostStatus.verificationStatus='pending';const screen=render(<Root/>);
 for(const text of ['MyLevel','Rewards','WhoViewedMe','VipInfo','HostApplication','FollowingList'])expect(screen.getByText(text)).toBeTruthy();for(const text of ['HostEarnings','HostVisitors','RoleSelection'])expect(screen.queryByText(text)).toBeNull();screen.unmount();
});
test('Consumer stack excludes the removed local withdrawal route',()=>{
 const screen=render(<Root/>);expect(screen.queryByText('Withdrawal')).toBeNull();screen.unmount();
});

test('profile failure blocks every stack and provides retry before authoritative routing resumes',()=>{
 mockStatus='profile_error';mockUser=null;const screen=render(<Root/>);
 expect(screen.getByText("We couldn't load your profile. Please try again.")).toBeTruthy();
 for(const route of ['Login','NameSetup','BirthdaySetup','CountrySetup','MainTabs','HostApplication'])expect(screen.queryByText(route)).toBeNull();
 fireEvent.press(screen.getByText('Try again'));expect(mockRetry).toHaveBeenCalledTimes(1);
 mockStatus='ready';mockUser={uid:'h',username:'Host',dob:'1990-01-01',gender:'female',countryCode:'GH',hostStatus:{isApproved:true}};
 screen.rerender(<Root/>);expect(screen.getByText('HostEarnings')).toBeTruthy();expect(screen.queryByText('NameSetup')).toBeNull();
});

test.each(['auth_loading','profile_loading'])('%s does not route into a stack',status=>{
 mockStatus=status;mockUser=null;const screen=render(<Root/>);expect(screen.toJSON()).toBeNull();
});

test('signed out routes to Login; only a loaded incomplete profile routes to onboarding',()=>{
 mockStatus='signed_out';mockUser=null;const screen=render(<Root/>);expect(screen.getByText('Login')).toBeTruthy();
 mockStatus='ready';mockUser={uid:'a',username:'Alice'};screen.rerender(<Root/>);
 expect(screen.getByText('BirthdaySetup')).toBeTruthy();expect(screen.queryByText('Login')).toBeNull();
});


test.each([false, true])('tabs are exactly the approved role set: Host=%s', approved => {
 mockUser.hostStatus.isApproved=approved;
 const screen=render(<Main/>);
 expect(screen.getByTestId('tabs').findAllByType(require('react-native').Text).map(node=>node.props.children)).toEqual(approved?['Connect','Messages','Activity','Profile']:['Home','Match','Messages','Profile']);
});

test('incomplete profile has only its required step and cannot enter Creator application',()=>{
 mockUser={uid:'c',username:'Consumer'};
 const screen=render(<Root/>);
 expect(screen.getByText('BirthdaySetup')).toBeTruthy();
 for(const name of ['HostApplication','MainTabs','CountrySetup','HostEarnings'])expect(screen.queryByText(name)).toBeNull();
});

test('same UID replacement destroys the navigation subtree and nested state',()=>{
 mockMount.mockClear();mockUnmount.mockClear();
 const screen=render(<Root/>);
 expect(mockMount).toHaveBeenCalledTimes(1);
 mockAuthenticatedSession={key:'replacement-session',isCurrent:()=>true};
 screen.rerender(<Root/>);
 expect(mockUnmount).toHaveBeenCalledTimes(1);
 expect(mockMount).toHaveBeenCalledTimes(2);
 mockStatus='signed_out';mockUser=null;mockAuthenticatedSession=null;
 screen.rerender(<Root/>);
 expect(mockUnmount).toHaveBeenCalledTimes(2);
 expect(screen.queryByText('MainTabs')).toBeNull();
 expect(screen.getByText('Login')).toBeTruthy();
});


test('Moments retains a native header for an explicit back route',()=>{
 const screen=render(<Root/>);
 expect(screen.getByTestId('route-Moments').props.accessibilityHint).toBe('native-header');
});
