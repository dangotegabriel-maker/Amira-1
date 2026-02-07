import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { GiftingProvider } from './src/context/GiftingContext';
import FreeNowBanner from './src/components/FreeNowBanner';

export default function App() {
  return (
    <GiftingProvider>
      <NavigationContainer>
        <RootNavigator />
        <FreeNowBanner />
        <StatusBar style="auto" />
      </NavigationContainer>
    </GiftingProvider>
  );
}
