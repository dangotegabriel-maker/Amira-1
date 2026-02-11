import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';

const BirthdaySetupScreen = ({ navigation }) => {
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  const handleTextChange = (text) => {
    // Basic DD/MM/YYYY auto-formatter
    let cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    if (cleaned.length > 4) formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4, 8);
    setDob(formatted);

    if (cleaned.length === 8) {
      validateAge(cleaned);
    } else {
      setError('');
    }
  };

  const validateAge = (cleaned) => {
    const day = parseInt(cleaned.slice(0, 2));
    const month = parseInt(cleaned.slice(2, 4)) - 1;
    const year = parseInt(cleaned.slice(4, 8));

    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < 18) {
      setError('You must be 18+ to use Amira.');
    } else {
      setError('');
    }
  };

  const isComplete = dob.length === 10 && !error;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>Your age will be public</Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="DD/MM/YYYY"
        keyboardType="numeric"
        maxLength={10}
        value={dob}
        onChangeText={handleTextChange}
        autoFocus
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, !isComplete && styles.buttonDisabled]}
        onPress={() => isComplete && navigation.navigate('GenderSetup')}
        disabled={!isComplete}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 100 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 },
  input: { fontSize: 24, borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 10, letterSpacing: 2 },
  inputError: { borderBottomColor: '#FF3B30' },
  errorText: { color: '#FF3B30', marginTop: 10, fontSize: 14, fontWeight: '500' },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 40 },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default BirthdaySetupScreen;
