import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import CountryPicker from 'react-native-country-picker-modal';
import { COLORS } from '../../theme/COLORS';

const PhoneLoginScreen = ({ navigation }) => {
  const [countryCode, setCountryCode] = useState('NG');
  const [callingCode, setCallingCode] = useState('234');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const onSelect = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setPhoneNumber(''); // Reset phone number on country change
  };

  const formatPhoneNumber = (text) => {
    // Basic auto-formatter: adds spaces every 3 digits
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
    }
    return formatted;
  };

  const handleTextChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Number is</Text>
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.countryPickerButton}
          onPress={() => setShowPicker(true)}
        >
          <CountryPicker
            countryCode={countryCode}
            withFilter
            withFlag
            withCallingCode
            withAlphaFilter
            withEmoji
            onSelect={onSelect}
            visible={showPicker}
            onClose={() => setShowPicker(false)}
          />
          <Text style={styles.callingCode}>+{callingCode}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={handleTextChange}
          maxLength={15}
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
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: 10,
    height: 50,
  },
  callingCode: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 5,
  },
  input: {
    flex: 1,
    fontSize: 22,
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
