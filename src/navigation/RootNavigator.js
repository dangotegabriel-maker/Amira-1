import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Onboarding Screens
import SplashScreen from '../screens/onboarding/SplashScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PhoneLoginScreen from '../screens/onboarding/PhoneLoginScreen';
import OTPScreen from '../screens/onboarding/OTPScreen';
import NameSetupScreen from '../screens/onboarding/NameSetupScreen';
import BirthdaySetupScreen from '../screens/onboarding/BirthdaySetupScreen';
import GenderSetupScreen from '../screens/onboarding/GenderSetupScreen';
import PhotoUploadScreen from '../screens/onboarding/PhotoUploadScreen';
import InterestsScreen from '../screens/onboarding/InterestsScreen';
import LocationPermissionScreen from '../screens/onboarding/LocationPermissionScreen';
import AccountNotAllowedScreen from '../screens/onboarding/AccountNotAllowedScreen';

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
import HelpSupportScreen from '../screens/main/HelpSupportScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {/* Onboarding Stack */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="NameSetup" component={NameSetupScreen} />
      <Stack.Screen name="BirthdaySetup" component={BirthdaySetupScreen} />
      <Stack.Screen name="GenderSetup" component={GenderSetupScreen} />
      <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <Stack.Screen name="Interests" component={InterestsScreen} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <Stack.Screen name="AccountNotAllowed" component={AccountNotAllowedScreen} />

      {/* Main App */}
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true, title: 'Chat' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: true, title: 'Wallet' }} />
      <Stack.Screen name="VIPStore" component={VIPStoreScreen} options={{ headerShown: true, title: 'VIP Store' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="RechargeHub" component={RechargeHubScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, title: 'Leaderboard' }} />
      <Stack.Screen name="GiftLedger" component={GiftLedgerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: true, title: 'Help & Support' }} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
