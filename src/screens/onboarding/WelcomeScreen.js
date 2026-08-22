import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS } from '../../theme/COLORS';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Amira</Text>
        <Text style={styles.description}>
          Meet new people, match with confidence, and start real conversations.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PhoneLogin')}
        >
          <Text style={styles.buttonText}>Continue with phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('PhoneLogin')}
        >
          <Text style={styles.secondaryButtonText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.disabledButton]}
          disabled
          activeOpacity={1}
        >
          <Text style={styles.disabledButtonText}>Google Sign-In · Coming soon</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24, paddingVertical: 36 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 42, fontWeight: '900', color: COLORS.text, marginBottom: 12, letterSpacing: 0 },
  description: { fontSize: 18, color: COLORS.textSecondary, lineHeight: 26 },
  footer: { paddingBottom: 12 },
  button: {
    backgroundColor: COLORS.primary,
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECECF0',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  disabledButton: {
    marginTop: 12,
    borderColor: '#ECECF0',
    backgroundColor: '#F7F7F8',
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
    fontSize: 17,
    fontWeight: '800',
  },
});

export default WelcomeScreen;
