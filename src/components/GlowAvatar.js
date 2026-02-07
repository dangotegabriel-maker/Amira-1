// src/components/GlowAvatar.js
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../theme/COLORS';

const GlowAvatar = ({ size = 60, isRankOne = false, isOnline = false, children }) => {
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isRankOne) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isRankOne]);

  const scale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const opacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {isRankOne && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale }],
              opacity
            }
          ]}
        />
      )}
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {children || <View style={[styles.placeholder, { borderRadius: size / 2 }]} />}
      </View>
      {isOnline && (
        <View style={[
          styles.onlinePulse,
          {
            width: Math.max(12, size * 0.2),
            height: Math.max(12, size * 0.2),
            borderRadius: Math.max(12, size * 0.2) / 2
          }
        ]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  avatar: {
    backgroundColor: '#EEE',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#DDD',
  },
  onlinePulse: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22C55E', // Vibrant Green (Tailwind green-500 equivalent)
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
    // Add shadow to make it pop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  }
});

export default GlowAvatar;
