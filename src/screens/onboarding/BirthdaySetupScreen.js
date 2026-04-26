import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { dbService } from '../../services/firebaseService';

const BirthdaySetupScreen = ({ navigation }) => {
  const [dob, setDob] = useState('');
  const { user, setUser } = useUser();

  const handleTextChange = (text) => {
    let cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    if (cleaned.length > 4) formatted = formatted.slice(0, 5) + '/' + cleaned.slice(4, 8);
    setDob(formatted);
  };

  const calculateAge = (birthday) => {
    const [day, month, year] = birthday.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleContinue = async () => {
    const age = calculateAge(dob);

    if (isNaN(age) || age < 0 || age > 120) {
      Alert.alert("Invalid Date", "Please enter a valid birthdate.");
      return;
    }

    if (age < 18) {
      Alert.alert("Access Restricted", "You must be at least 18 years old to use Amira.");
      return;
    }

    try {
      if (user?.uid) {
        await dbService.updateUserProfile(user.uid, { dob, age });
        setUser({ ...user, dob, age });
      }
      navigation.navigate('GenderSetup');
    } catch (error) {
      Alert.alert("Error", "Failed to save birthdate. Please try again.");
    }
  };

  const isComplete = dob.length === 10;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>Your age will be public</Text>

      <TextInput
        style={styles.input}
        placeholder="DD/MM/YYYY"
        keyboardType="numeric"
        maxLength={10}
        value={dob}
        onChangeText={handleTextChange}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.button, !isComplete && styles.buttonDisabled]}
        onPress={handleContinue}
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
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 40 },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default BirthdaySetupScreen;
