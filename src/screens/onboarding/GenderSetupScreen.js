import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';

const GenderSetupScreen = ({ navigation }) => {
  const [gender, setGender] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useUser();

  const handleContinue = async () => {
    // Safety check: Valid selection must exist
    if (!gender) {
      Alert.alert("Selection Required", "Please select your gender to continue.");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Session Error", "User session not found. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const g = gender === 'Woman' ? 'female' : 'male';

      // Final update call: Set isProfileComplete to true
      await dbService.updateUserProfile(user.uid, {
        gender: g,
        isProfileComplete: true
      });

      await refreshUser();

      // Close the loop: RootNavigator will now grant access to Home
    } catch (e) {
      Alert.alert("Update Failed", "Failed to save gender preference. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I am a</Text>
      <View style={styles.options}>
        {['Woman', 'Man', 'Other'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.option, gender === g && styles.optionSelected]}
            onPress={() => setGender(g)}
            disabled={loading}
          >
            <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, (!gender || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!gender || loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Finish</Text>}
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
  options: { marginBottom: 40 },
  option: { padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  optionText: { fontSize: 18, color: COLORS.textSecondary },
  optionTextSelected: { color: COLORS.primary, fontWeight: 'bold' },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});
export default GenderSetupScreen;
