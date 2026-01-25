import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const BirthdaySetupScreen = ({ navigation }) => {
  const [birthday, setBirthday] = useState('');

  const formatBirthday = (text) => {
    // Remove any non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }

    return formatted;
  };

  const handleTextChange = (text) => {
    // Handle backspace properly if the last character was a slash
    if (text.length < birthday.length && (birthday.endsWith('/') )) {
        setBirthday(text.slice(0, -1));
        return;
    }

    const formatted = formatBirthday(text);
    setBirthday(formatted);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Birthday is</Text>
      <TextInput
        style={styles.input}
        placeholder="DD / MM / YYYY"
        value={birthday}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={10}
      />
      <TouchableOpacity
        style={[styles.button, birthday.length < 10 && styles.buttonDisabled]}
        onPress={() => navigation.navigate('GenderSetup')}
        disabled={birthday.length < 10}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
  input: { fontSize: 24, borderBottomWidth: 2, borderBottomColor: COLORS.primary, marginBottom: 40, height: 50 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default BirthdaySetupScreen;
