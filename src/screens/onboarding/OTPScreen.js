import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const OTPScreen = ({ navigation }) => {
  const [code, setCode] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Code is</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="0 0 0 0 0 0"
          keyboardType="number-pad"
          maxLength={6}
          letterSpacing={10}
          value={code}
          onChangeText={setCode}
          autoFocus
        />
      </View>
      <TouchableOpacity onPress={() => {}}>
        <Text style={styles.resend}>Resend Code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, code.length < 6 && styles.buttonDisabled]}
        onPress={() => navigation.navigate('NameSetup')}
        disabled={code.length < 6}
      >
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  inputContainer: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    marginBottom: 20,
  },
  input: {
    fontSize: 32,
    height: 60,
    textAlign: 'center',
  },
  resend: {
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 30,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OTPScreen;
