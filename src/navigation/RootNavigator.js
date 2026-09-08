import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUser } from '../context/UserContext';

// Onboarding Screens
import LoginScreen from '../screens/onboarding/LoginScreen';
import PhoneLoginScreen from '../screens/onboarding/PhoneLoginScreen';
import OTPScreen from '../screens/onboarding/OTPScreen';
import NameSetupScreen from '../screens/onboarding/NameSetupScreen';
import BirthdaySetupScreen from '../screens/onboarding/BirthdaySetupScreen';
import GenderSetupScreen from '../screens/onboarding/GenderSetupScreen';

// Main App Screens
import MainTabNavigator from './MainTabNavigator';
import ChatDetailScreen from '../screens/main/ChatDetailScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import VideoCallScreen from '../screens/main/VideoCallScreen';
import WalletScreen from '../screens/main/WalletScreen';
import VIPStoreScreen from '../screens/main/VIPStoreScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import RechargeHubScreen from '../screens/main/RechargeHubScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import GiftLedgerScreen from '../screens/main/GiftLedgerScreen';
import WithdrawalScreen from '../screens/main/WithdrawalScreen';
import CallSummaryScreen from '../screens/main/CallSummaryScreen';
import HelpSupportScreen from '../screens/main/HelpSupportScreen';
import PaymentScreen from '../screens/main/PaymentScreen';
import PaymentMethodScreen from '../screens/main/PaymentMethodScreen';
import StoryViewerScreen from '../screens/main/StoryViewerScreen';
import MomentsScreen from '../screens/main/MomentsScreen';
import CountrySetupScreen from '../screens/onboarding/CountrySetupScreen';
import HostApplicationScreen from '../screens/host/HostApplicationScreen';
import FollowingScreen from '../screens/main/FollowingScreen';
import HostEarningsScreen from '../screens/host/HostEarningsScreen';
import HostVisitorsScreen from '../screens/host/HostVisitorsScreen';
import WhoViewedMeScreen from '../screens/main/WhoViewedMeScreen';
import VipInfoScreen from '../screens/main/VipInfoScreen';
import InviteEarnScreen from '../screens/main/InviteEarnScreen';
import BlockedUsersScreen from '../screens/main/BlockedUsersScreen';
import { getRequiredProfileStep, isProfileActuallyComplete, isApprovedHost } from '../models/userModel';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, loading } = useUser();

  if (loading) return null;

  const nextProfileScreen = getRequiredProfileStep(user);
  const isProfileComplete = isProfileActuallyComplete(user);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
        </>
      ) : !isProfileComplete ? (
        <Stack.Group key={nextProfileScreen || 'profile-completion'}>
          <Stack.Screen name={nextProfileScreen || 'NameSetup'} component={
            nextProfileScreen === 'NameSetup' ? NameSetupScreen
              : nextProfileScreen === 'BirthdaySetup' ? BirthdaySetupScreen
                : nextProfileScreen === 'GenderSetup' ? GenderSetupScreen
                  : nextProfileScreen === 'CountrySetup' ? CountrySetupScreen
                  : NameSetupScreen
          } />
          <Stack.Screen name="HostApplication" component={HostApplicationScreen} />
        </Stack.Group>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true, title: 'Chat' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="VideoCall" component={VideoCallScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: true, title: 'Wallet' }} />
          <Stack.Screen name="VIPStore" component={VIPStoreScreen} options={{ headerShown: true, title: 'VIP Store' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
          <Stack.Screen name="RechargeHub" component={RechargeHubScreen} />
          <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="StoryViewer" component={StoryViewerScreen} />
          <Stack.Screen name="Moments" component={MomentsScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, title: 'Leaderboard' }} />
          <Stack.Screen name="GiftLedger" component={GiftLedgerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
          <Stack.Screen name="CallSummary" component={CallSummaryScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: true, title: 'Help & Support' }} />
          <Stack.Screen name="HostApplication" component={HostApplicationScreen} />
          <Stack.Screen name="FollowingList" component={FollowingScreen} options={{ headerShown: true, title: 'Following' }} />
          {isApprovedHost(user) && <Stack.Screen name="HostEarnings" component={HostEarningsScreen} options={{ headerShown: true, title: 'Earnings' }} />}
          <Stack.Screen name="HostVisitors" component={HostVisitorsScreen} options={{ headerShown: true, title: 'Profile Visitors' }} />
          <Stack.Screen name="WhoViewedMe" component={WhoViewedMeScreen} options={{ headerShown: true, title: 'Who Viewed Me' }} />
          <Stack.Screen name="VipInfo" component={VipInfoScreen} options={{ headerShown: true, title: 'Amira VIP' }} />
          <Stack.Screen name="InviteEarn" component={InviteEarnScreen} options={{ headerShown: true, title: 'Invite & Earn' }} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ headerShown: true, title: 'Blocked Users' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
