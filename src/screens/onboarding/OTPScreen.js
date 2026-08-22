import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { authService, dbService } from '../../services/firebaseService';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const OTPScreen = ({ route, navigation }) => {
  const { phone, countryCode = 'GH', currency = 'GHS' } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert('Try again', GENERIC_ERROR_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { user } = await authService.verifyOTP(code);
      if (user) {
        const profile = await dbService.getUserProfile(user.uid);
        if (profile) {
           await dbService.updateUserProfile(user.uid, {
             phone: user.phoneNumber || phone,
             countryCode,
             wallet: {
               ...profile.wallet,
               currency,
             },
             phoneVerified: true,
             authProvider: 'phone',
           });
        } else {
           await dbService.createUserProfile(user.uid, {
             phone: user.phoneNumber || phone,
             countryCode,
             wallet: {
               balance: 0,
               currency,
             },
             phoneVerified: true,
             authProvider: 'phone',
           });
        }
      }
    } catch (error) {
      console.error('OTP verification screen error:', error);
      alert(`${error.code} - ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.resendOTP(phone);
      setCode('');
      Alert.alert('Code sent', 'We sent you a new verification code.');
    } catch (error) {
      console.error('OTP resend screen error:', error);
      alert(`${error.code} - ${error.message}`);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to your phone</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="0 0 0 0 0 0"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          autoFocus
          placeholderTextColor="#C8C8CC"
        />
      </View>
      <TouchableOpacity onPress={handleResend} disabled={resending || loading}>
        <Text style={[styles.resend, (resending || loading) && styles.resendDisabled]}>
          {resending ? 'Sending...' : 'Resend Code'}
        </Text>
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
  inputContainer: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#ECECF0',
    borderRadius: 18,
    backgroundColor: '#FAFAFB',
    justifyContent: 'center',
    marginBottom: 18,
  },
  input: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    height: 62,
    textAlign: 'center',
    letterSpacing: 8,
  },
  resend: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 30,
  },
  resendDisabled: {
    color: COLORS.textSecondary,
  },
  button: {
    backgroundColor: COLORS.primary,
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#F0A3B2',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
});

export default OTPScreen;
