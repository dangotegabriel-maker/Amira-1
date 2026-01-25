import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const PhoneLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Number is</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.countryCode}>+234</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
      </View>
      <Text style={styles.info}>
        We will send a text with a verification code. Message and data rates may apply.
      </Text>

      <TouchableOpacity
        style={[styles.button, !phoneNumber && styles.buttonDisabled]}
        onPress={() => navigation.navigate('OTP')}
        disabled={!phoneNumber}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    alignItems: 'center',
    marginBottom: 20,
  },
  countryCode: {
    fontSize: 24,
    fontWeight: '500',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 24,
    height: 50,
  },
  info: {
    color: COLORS.textSecondary,
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

export default PhoneLoginScreen;
