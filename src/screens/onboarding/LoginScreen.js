import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { LogIn, Sparkles } from 'lucide-react-native';
import { authService } from '../../services/firebaseService';
import { COLORS } from '../../theme/COLORS';
import { DEV_FEATURES } from '../../config/devFeatures';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState('');
  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    '';

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId || 'google-client-id-not-configured',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || googleClientId || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleClientId || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleClientId || undefined,
  });

  useEffect(() => {
    const finishGoogleLogin = async () => {
      if (response?.type !== 'success') return;
      const idToken = response.authentication?.idToken || response.params?.id_token;
      setLoading('google');
      try {
        await authService.loginWithGoogleToken(idToken);
      } catch (error) {
        Alert.alert('Google login failed', error.message || 'Please try again.');
      } finally {
        setLoading('');
      }
    };
    finishGoogleLogin();
  }, [response]);

  const quickLogin = async () => {
    setLoading('quick');
    try {
      const account = await authService.createQuickAccount();
      Alert.alert(
        'Development account created',
        `Save these credentials now. They are not stored in your profile.\n\nAccount ID: ${account.accountId}\nPassword: ${account.password}`,
      );
    } catch (error) {
      Alert.alert('Quick login failed', error.message || 'Please try again.');
    } finally {
      setLoading('');
    }
  };

  const accountLogin = async () => {
    if (!accountId.trim() || password.length < 6) {
      Alert.alert('Enter account details', 'Use your numeric Account ID and 6-character password.');
      return;
    }
    setLoading('account');
    try {
      await authService.loginWithAccount(accountId, password);
    } catch (error) {
      Alert.alert('Login failed', 'The Account ID or password is incorrect.');
    } finally {
      setLoading('');
    }
  };

  const googleLogin = async () => {
    if (!googleClientId) {
      Alert.alert(
        'Google login needs configuration',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and the platform Google client ID to the Expo environment.',
      );
      return;
    }
    await promptAsync();
  };

  const busy = Boolean(loading);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Sparkles color={COLORS.white} size={28} />
        </View>
        <Text style={styles.title}>Welcome to Amira</Text>
        <Text style={styles.subtitle}>Connect, chat, and enjoy every moment.</Text>

        {DEV_FEATURES.enableQuickLogin && <TouchableOpacity style={styles.primaryButton} onPress={quickLogin} disabled={busy}>
          {loading === 'quick' ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.primaryText}>QUICK LOGIN</Text>
          )}
        </TouchableOpacity>}
        {DEV_FEATURES.enableQuickLogin && <Text style={styles.helper}>Development only. Save the generated credentials when shown.</Text>}

        <View style={styles.accountCard}>
          <Text style={styles.cardTitle}>EXISTING ACCOUNT LOGIN</Text>
          <TextInput
            style={styles.input}
            value={accountId}
            onChangeText={(value) => setAccountId(value.replace(/\D/g, ''))}
            placeholder="Account ID"
            keyboardType="number-pad"
            placeholderTextColor="#A09AAD"
            editable={!busy}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#A09AAD"
            editable={!busy}
          />
          <TouchableOpacity style={styles.accountButton} onPress={accountLogin} disabled={busy}>
            {loading === 'account' ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <LogIn color={COLORS.primary} size={19} />
                <Text style={styles.accountButtonText}>Log in to account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={googleLogin}
          disabled={busy || !request}
        >
          {loading === 'google' ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.googleText}>G&nbsp;&nbsp; GOOGLE LOGIN</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4FC' },
  content: { flexGrow: 1, padding: 24, paddingTop: 72, paddingBottom: 36 },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { fontSize: 34, fontWeight: '900', color: '#241532' },
  subtitle: { fontSize: 16, color: '#756B7E', marginTop: 8, marginBottom: 30 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: COLORS.white, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  helper: { color: '#857B8D', fontSize: 12, textAlign: 'center', marginTop: 9, marginBottom: 20 },
  accountCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#42235E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTitle: { color: '#4D3C59', fontSize: 13, fontWeight: '900', marginBottom: 12 },
  input: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#F6F3F9',
    paddingHorizontal: 16,
    color: '#241532',
    fontSize: 16,
    marginBottom: 11,
  },
  accountButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DACAF0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountButtonText: { color: COLORS.primary, fontWeight: '800', marginLeft: 8 },
  googleButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5DFE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  googleText: { color: '#302638', fontWeight: '900', fontSize: 15 },
});

export default LoginScreen;
