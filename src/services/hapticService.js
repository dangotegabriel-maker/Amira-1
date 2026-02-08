// src/services/hapticService.js
import * as Haptics from 'expo-haptics';
import { Platform } from "react-native";

export const hapticService = {
  lightImpact: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  mediumImpact: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  heavyImpact: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  success: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  longVibration: () => {
    if (Platform.OS === 'web') return;
    // Simulate long vibration using heavy impact multiple times or notification error
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};
