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
        <View style={[styles.onlinePulse, { width: size * 0.25, height: size * 0.25, borderRadius: (size * 0.25) / 2 }]} />
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
    bottom: 2,
    right: 2,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: 'white',
  }
});

export default GlowAvatar;
