// src/components/FreeNowBanner.js
import React, { useState, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { COLORS } from '../theme/COLORS';
import { socketService } from '../services/socketService';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const FreeNowBanner = () => {
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const navigation = useNavigation();

  useEffect(() => {
    const handleUserFree = (data) => {
      // Mock data for the demo
      setUser({ id: data.profileId, name: 'Jessica' });
      setVisible(true);

      Animated.spring(slideAnim, {
        toValue: 50,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 5 seconds
      setTimeout(hide, 5000);
    };

    socketService.on('user_free', handleUserFree);
    return () => socketService.off('user_free', handleUserFree);
  }, []);

  const hide = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={() => {
          hide();
          navigation.navigate('VideoCall', { userId: user.id, name: user.name });
        }}
      >
        <Text style={styles.text}>✨ {user.name} is now free! Tap to call now!</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999999, alignItems: 'center' },
  banner: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  text: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});

export default FreeNowBanner;
