import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { authService, dbService } from '../../services/firebaseService';

const NameSetupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useUser();

  const handleContinue = async () => {
    setLoading(true);
    try {
      if (user?.uid) {
        // Sync with Firebase Auth
        await authService.updateProfile({ displayName: name });
        // Sync with Firestore
        await dbService.updateUserProfile(user.uid, { name });
        // Sync with Local Context
        setUser({ ...user, name });
      }
      navigation.navigate('BirthdaySetup');
    } catch (error) {
      Alert.alert("Sync Error", "Failed to save your name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Name is</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <TouchableOpacity
        style={[styles.button, (!name || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!name || loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continue</Text>}
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
export default NameSetupScreen;
