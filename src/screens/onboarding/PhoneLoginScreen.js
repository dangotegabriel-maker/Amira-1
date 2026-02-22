import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import CountryPicker from 'react-native-country-picker-modal';

const PhoneLoginScreen = ({ navigation }) => {
  const [countryCode, setCountryCode] = useState('US');
  const [callingCode, setCallingCode] = useState('1');
  const [phone, setPhone] = useState('');

  const handleContinue = () => {
    if (phone.length > 5) {
      navigation.navigate('OTP', { phone: `+${callingCode}${phone}` });
    } else {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your number?</Text>
      <Text style={styles.subtitle}>We'll send a code to verify your account</Text>

      <View style={styles.inputRow}>
        <CountryPicker
          countryCode={countryCode}
          withFilter
          withFlag
          withCallingCode
          onSelect={(country) => {
            setCountryCode(country.cca2);
            setCallingCode(country.callingCode[0]);
          }}
        />
        <Text style={styles.callingCode}>+{callingCode}</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.button, phone.length < 6 && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={phone.length < 6}
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
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  callingCode: { fontSize: 18, marginHorizontal: 10, fontWeight: '500' },
  input: { flex: 1, fontSize: 18 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 40 },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default PhoneLoginScreen;
