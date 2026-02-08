import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from "react-native";
import { COLORS } from '../../theme/COLORS';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>AMIRA</Text>
      <Text style={styles.subtitle}>Connect & Match</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    marginTop: 10,
    opacity: 0.8,
  },
});

export default SplashScreen;
