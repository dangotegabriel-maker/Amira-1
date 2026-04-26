import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { authService } from '../../services/firebaseService';

const PhoneLoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.loginWithPhone(phone);
      if (response.success) {
        navigation.navigate('OTP', { confirmation: response.confirmation });
      }
    } catch (error) {
      Alert.alert("Login Error", error.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your number?</Text>
      <Text style={styles.subtitle}>We'll send a code to verify your account</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="+1 234 567 8900"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.button, (phone.length < 10 || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={phone.length < 10 || loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 100 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 },
  inputRow: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  input: { flex: 1, fontSize: 18 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 40 },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default PhoneLoginScreen;
