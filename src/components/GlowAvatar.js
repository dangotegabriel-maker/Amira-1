// src/components/GlowAvatar.js
import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { COLORS } from '../theme/COLORS';
import { ledgerService } from '../services/ledgerService';

const GlowAvatar = ({ size = 60, isRankOne = false, isOnline = false, isBusy = false, xp = 0, children }) => {
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  const tier = ledgerService.getTier(xp);
  const showGlow = isRankOne || xp >= 1000; // Show glow for Noble and above

  React.useEffect(() => {
    if (showGlow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showGlow]);

  const scale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const opacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Determine dot color
  const dotColor = isBusy ? '#F59E0B' : (isOnline ? '#22C55E' : 'transparent');

  // Determine glow color: #1 rank gets Gold pulse, others get Tier color
  const glowColor = isRankOne ? '#FFD700' : tier.color;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {showGlow && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale }],
              opacity,
              backgroundColor: glowColor,
              shadowColor: glowColor,
            }
          ]}
        />
      )}
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {children || <View style={[styles.placeholder, { borderRadius: size / 2 }]} />}
      </View>
      {(isOnline || isBusy) && (
        <View style={[
          styles.onlinePulse,
          {
            width: Math.max(12, size * 0.2),
            height: Math.max(12, size * 0.2),
            borderRadius: Math.max(12, size * 0.2) / 2,
            backgroundColor: dotColor
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
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  }
});

export default GlowAvatar;
