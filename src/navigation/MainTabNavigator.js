import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, LayoutDashboard, MessageCircle, User, Wallet } from 'lucide-react-native';
import { socketService } from '../services/socketService';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/main/HomeScreen';
import MessageHomeScreen from '../screens/main/MessageHomeScreen';
import MyProfileScreen from '../screens/main/MyProfileScreen';
import WalletScreen from '../screens/main/WalletScreen';
import HostDashboardScreen from '../screens/host/HostDashboardScreen';
import HostEarningsScreen from '../screens/host/HostEarningsScreen';
import { useUser } from '../context/UserContext';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const navigation = useNavigation();
  const { user } = useUser();

  useEffect(() => {
    const handleIncomingCall = (data) => {
      navigation.navigate('VideoCall', {
        name: data.callerName,
        userId: data.callerId,
        isIncoming: true
      });
    };
    socketService.on('incoming_call', handleIncomingCall);
    return () => socketService.off('incoming_call', handleIncomingCall);
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Discover') {
            return <Compass color={color} size={size} />;
          } else if (route.name === 'Dashboard') {
            return <LayoutDashboard color={color} size={size} />;
          } else if (route.name === 'Messages') {
            return <MessageCircle color={color} size={size} />;
          } else if (route.name === 'Wallet' || route.name === 'Earnings') {
            return <Wallet color={color} size={size} />;
          } else if (route.name === 'Profile') {
            return <User color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: '#FF2D55',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {user?.role === 'host' ? (
        <>
          <Tab.Screen name="Dashboard" component={HostDashboardScreen} />
          <Tab.Screen name="Messages" component={MessageHomeScreen} />
          <Tab.Screen name="Earnings" component={HostEarningsScreen} />
          <Tab.Screen name="Profile" component={MyProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Discover" component={HomeScreen} />
          <Tab.Screen name="Messages" component={MessageHomeScreen} />
          <Tab.Screen name="Wallet" component={WalletScreen} />
          <Tab.Screen name="Profile" component={MyProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
