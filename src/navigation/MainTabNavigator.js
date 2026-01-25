import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Compass, MessageCircle, User } from 'lucide-react-native';

import DiscoverScreen from '../screens/main/DiscoverScreen';
import MomentsScreen from '../screens/main/MomentsScreen';
import ChatListScreen from '../screens/main/ChatListScreen';
import MyProfileScreen from '../screens/main/MyProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Discover') {
            return <Compass color={color} size={size} />;
          } else if (route.name === 'Moments') {
            return <Home color={color} size={size} />;
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
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Moments" component={MomentsScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={MyProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
