import { useSessionGuard } from '../../hooks/useSessionGuard';
import { useActionLock } from '../../hooks/useActionLock';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { auth } from '../../services/firebaseService';
import { validateUsername } from '../../utils/usernameValidation';

const NameSetupScreen = ({ navigation }) => {
  const current = useSessionGuard();
  const runAction = useActionLock(current);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useUser();

  const saveName = () => runAction('save', async () => {
    const validation = validateUsername(name);
    if (!validation.isValid) {
      Alert.alert('Check your name', validation.error);
      return;
    }
    const enteredName = validation.value;
    setLoading(true);

    try {
      await updateProfile({
        username: enteredName,
        phone: auth.currentUser?.phoneNumber,
        updatedAt: new Date()
      });
    } catch (error) {
      if (current()) Alert.alert('Unable to save name', error.message || 'Please try again.');
    } finally {
      if (current()) setLoading(false);
    }
  });

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
        style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
        onPress={saveName}
        disabled={!name.trim() || loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
  input: { color: COLORS.text, fontSize: 24, borderBottomWidth: 2, borderBottomColor: COLORS.primary, marginBottom: 40, height: 50 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});
export default NameSetupScreen;
