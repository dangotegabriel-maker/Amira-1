import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { doc, setDoc } from 'firebase/firestore';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { auth, db } from '../../services/firebaseService';

const NameSetupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();

  const saveName = async () => {
    setLoading(true);
    const enteredName = name.trim();

    try {
      const user = auth.currentUser;

      console.log("USER:", auth.currentUser);
      console.log("UID:", auth.currentUser?.uid);
      console.log("NAME:", enteredName);

      if (!user?.uid) {
        alert("User not authenticated");
        return;
      }

      await setDoc(doc(db, "users", user.uid), {
        username: enteredName,
        name: enteredName,
        phone: user.phoneNumber,
        updatedAt: new Date()
      }, { merge: true });

      setUser((currentUser) => ({ ...currentUser, username: enteredName, name: enteredName }));
    } catch (error) {
      console.log("SAVE ERROR:", error.code, error.message);
      alert(error.code + " - " + error.message);
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
        onPress={saveName}
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
  input: { color: COLORS.text, fontSize: 24, borderBottomWidth: 2, borderBottomColor: COLORS.primary, marginBottom: 40, height: 50 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});
export default NameSetupScreen;
