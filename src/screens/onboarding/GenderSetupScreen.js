import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';

const GenderSetupScreen = ({ navigation }) => {
  const [gender, setGender] = useState(null);
  const { refreshUser } = useUser();

  const handleContinue = async () => {
    if (!gender) return;
    try {
      const g = gender === 'Woman' ? 'female' : 'male';
      await dbService.updateUserProfile('current_user_id', { gender: g });
      await refreshUser();
      navigation.navigate('PhotoUpload');
    } catch (e) {
      Alert.alert("Error", "Failed to save gender preference.");
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
          >
            <Text style={[styles.optionText, gender === g && styles.optionTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, !gender && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!gender}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
