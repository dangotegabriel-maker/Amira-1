import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { authService, dbService } from '../../services/firebaseService';

const OTPScreen = ({ route, navigation }) => {
  const { confirmation } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { user } = await authService.verifyOTP(confirmation, code);
      if (user) {
        // Check if user document already exists
        const profile = await dbService.getUserProfile(user.uid);
        if (profile) {
           navigation.navigate('MainTabs');
        } else {
           await dbService.createUserProfile(user.uid, { phone: user.phoneNumber });
           navigation.navigate('NameSetup');
        }
      }
    } catch (error) {
      Alert.alert("Verification Failed", error.message || "Please check your code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Code is</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="0 0 0 0 0 0"
          keyboardType="number-pad"
          maxLength={6}
          letterSpacing={10}
          value={code}
          onChangeText={setCode}
          autoFocus
        />
      </View>
      <TouchableOpacity onPress={() => {}}>
        <Text style={styles.resend}>Resend Code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (code.length < 6 || loading) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={code.length < 6 || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
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
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    marginBottom: 20,
  },
  input: {
    fontSize: 32,
    height: 60,
    textAlign: 'center',
  },
  resend: {
    color: COLORS.primary,
    fontWeight: '600',
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

export default OTPScreen;
