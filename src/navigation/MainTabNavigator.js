import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, HeartHandshake, Activity, MessageCircle, User } from 'lucide-react-native';
import { socketService } from '../services/socketService';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/main/HomeScreen';
import MessageHomeScreen from '../screens/main/MessageHomeScreen';
import MyProfileScreen from '../screens/main/MyProfileScreen';
import MatchScreen from '../screens/main/MatchScreen';
import HostDashboardScreen from '../screens/host/HostDashboardScreen';
import HostActivityScreen from '../screens/host/HostActivityScreen';
import { useUser } from '../context/UserContext';
import { isApprovedHost } from '../models/userModel';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const navigation = useNavigation();
  const { user } = useUser();
  const approvedHost = isApprovedHost(user);

  useEffect(() => {
    if (!approvedHost) return undefined;
    const handleIncomingCall = (data) => {
      navigation.navigate('VideoCall', {
        name: data.callerName,
        userId: data.callerId,
        isIncoming: true
      });
    };
    socketService.on('incoming_call', handleIncomingCall);
    return () => socketService.off('incoming_call', handleIncomingCall);
  }, [approvedHost, navigation]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') {
            return <Compass color={color} size={size} />;
          } else if (route.name === 'Match') {
            return <HeartHandshake color={color} size={size} />;
          } else if (route.name === 'Connect') {
            return <HeartHandshake color={color} size={size} />;
          } else if (route.name === 'Messages') {
            return <MessageCircle color={color} size={size} />;
          } else if (route.name === 'Activity') {
            return <Activity color={color} size={size} />;
          } else if (route.name === 'Profile') {
            return <User color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: '#FF2D55',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {approvedHost ? (
        <>
          <Tab.Screen name="Connect" component={HostDashboardScreen} />
          <Tab.Screen name="Messages" component={MessageHomeScreen} />
          <Tab.Screen name="Activity" component={HostActivityScreen} />
          <Tab.Screen name="Profile" component={MyProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Match" component={MatchScreen} />
          <Tab.Screen name="Messages" component={MessageHomeScreen} />
          <Tab.Screen name="Profile" component={MyProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
