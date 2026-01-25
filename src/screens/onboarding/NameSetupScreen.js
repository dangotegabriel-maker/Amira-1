import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const NameSetupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
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
        style={[styles.button, !name && styles.buttonDisabled]}
        onPress={() => navigation.navigate('BirthdaySetup')}
        disabled={!name}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
