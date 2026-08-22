import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { DEFAULT_COUNTRY } from '../../data/countries';
import CountrySelectorModal from '../../components/CountrySelectorModal';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const PhoneLoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const getNationalNumber = () => {
    return phone.trim().replace(/\D/g, '').replace(/^0/, '');
  };

  const handleContinue = async () => {
    const localNumber = getNationalNumber();

    if (localNumber.length < 7) {
      Alert.alert('Try again', GENERIC_ERROR_MESSAGE);
      return;
    }

    Alert.alert(
      'Phone sign-in unavailable',
      'Phone sign-in is disabled until native Firebase App Verification is configured. Please use another sign-in method.',
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>Phone sign-in is temporarily unavailable while secure app verification is configured.</Text>
      </View>

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.callingCodeButton}
          onPress={() => setShowPicker(true)}
          disabled={loading}
        >
          <Text style={styles.countryCode}>{selectedCountry.flag} {selectedCountry.cca2}</Text>
          <Text style={styles.callingCode}>+{selectedCountry.callingCode}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor="#B8B8BD"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^\d+\s()-]/g, ''))}
          autoFocus
        />
      </View>

      <CountrySelectorModal visible={showPicker} onClose={() => setShowPicker(false)} onSelect={setSelectedCountry} />

      <TouchableOpacity
        style={[styles.button, (getNationalNumber().length < 7 || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={getNationalNumber().length < 7 || loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  header: {
    marginBottom: 44,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#ECECF0',
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFB',
  },
  callingCodeButton: { marginRight: 12, minHeight: 56, justifyContent: 'center', alignItems: 'center', minWidth: 68 },
  countryCode: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  callingCode: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  input: { flex: 1, fontSize: 18, color: COLORS.text, minHeight: 56 },
  countryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  countryModal: { backgroundColor: COLORS.white, borderRadius: 18, paddingVertical: 12, maxHeight: 420 },
  countryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, paddingHorizontal: 18, paddingVertical: 12 },
  countryOption: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  countryName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  countryDial: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  button: {
    backgroundColor: COLORS.primary,
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  buttonDisabled: { backgroundColor: '#F0A3B2' },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
});

export default PhoneLoginScreen;
