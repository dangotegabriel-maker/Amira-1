import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Compass, MessageCircle, User, Sparkles } from 'lucide-react-native';
import { socketService } from '../services/socketService';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/main/HomeScreen';
import DiscoverScreen from '../screens/main/DiscoverScreen';
import MomentsScreen from '../screens/main/MomentsScreen';
import MessageHomeScreen from '../screens/main/MessageHomeScreen';
import MyProfileScreen from '../screens/main/MyProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const navigation = useNavigation();

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
          if (route.name === 'Home') {
            return <Home color={color} size={size} />;
          } else if (route.name === 'Cards') {
            return <Compass color={color} size={size} />;
          } else if (route.name === 'Moments') {
            return <Sparkles color={color} size={size} />;
          } else if (route.name === 'Messages') {
            return <MessageCircle color={color} size={size} />;
          } else if (route.name === 'Profile') {
            return <User color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: '#FF2D55',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cards" component={DiscoverScreen} />
      <Tab.Screen name="Moments" component={MomentsScreen} />
      <Tab.Screen name="Messages" component={MessageHomeScreen} />
      <Tab.Screen name="Profile" component={MyProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
