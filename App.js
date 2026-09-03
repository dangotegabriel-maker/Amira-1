import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { GiftingProvider } from './src/context/GiftingContext';
import { UserProvider, useUser } from './src/context/UserContext';
import { presenceService } from './src/services/presenceService';
import FreeNowBanner from './src/components/FreeNowBanner';
import SplashScreen from './src/screens/onboarding/SplashScreen';

const AppContent = () => {
  const { user, loading } = useUser();
  const [splashReady, setSplashReady] = React.useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), 1100);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => user?.uid ? presenceService.start() : undefined, [user?.uid]);
  if (loading || !splashReady) return <SplashScreen />;
  return (
    <>
      <RootNavigator />
      <FreeNowBanner />
      <StatusBar style="auto" />
    </>
  );
};

export default function App() {
  return (
    <UserProvider>
      <GiftingProvider>
        <NavigationContainer>
           <AppContent />
        </NavigationContainer>
      </GiftingProvider>
    </UserProvider>
  );
}
