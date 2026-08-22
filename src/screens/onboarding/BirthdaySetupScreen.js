import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { dbService } from '../../services/firebaseService';

const BirthdaySetupScreen = ({ navigation }) => {
  const today = new Date();
  const maximumDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minimumDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  const [date, setDate] = useState(maximumDate);
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const { user, setUser } = useUser();

  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleContinue = async () => {
    const age = calculateAge(date);

    if (!(date instanceof Date) || Number.isNaN(date.getTime()) || date > today || age > 120) {
      Alert.alert("Invalid Date", "Please enter a valid birthdate.");
      return;
    }

    if (age < 18) {
      Alert.alert("Access Restricted", "You must be at least 18 years old to use Amira.");
      return;
    }

    try {
      if (user?.uid) {
        const dob = date.toISOString().slice(0, 10);
        await dbService.updateUserProfile(user.uid, { dob, age });
        setUser({ ...user, dob, age });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save birthdate. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>Your age will be public</Text>

      <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, selectedDate) => {
            if (Platform.OS === 'android') setShowPicker(false);
            if (event.type !== 'dismissed' && selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
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
  dateButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 18, backgroundColor: COLORS.white },
  dateText: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 40 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default BirthdaySetupScreen;
