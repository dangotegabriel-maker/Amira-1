// src/components/VIPBadge.js
import React from 'react';
import { View, StyleSheet, Dimensions } from "react-native";
import { Award, Sparkles } from 'lucide-react-native';

const VIPBadge = ({ totalSpent }) => {
  if (totalSpent >= 5000) {
    // Golden Crown
    return (
      <View style={styles.badge}>
        <Award color="#FFD700" size={16} fill="#FFD700" />
      </View>
    );
  } else if (totalSpent >= 1000) {
    // Silver Sparkle
    return (
      <View style={styles.badge}>
        <Sparkles color="#C0C0C0" size={16} fill="#C0C0C0" />
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  badge: {
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VIPBadge;
