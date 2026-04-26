import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Image } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { useUser } from '../../context/UserContext';
import { dbService } from '../../services/firebaseService';

const WelcomeScreen = ({ navigation }) => {
  const { setUser } = useUser();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '528428934640-taoiu31lp997g77vf4m7tded8kphfeio.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data ? userInfo.data.idToken : userInfo.idToken;
      if (!idToken) throw new Error("Google Sign-In failed: No ID Token found.");

      // Authenticate with Firebase
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Check if user already exists in Firestore
        const profile = await dbService.getUserProfile(firebaseUser.uid);

        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          photo: firebaseUser.photoURL,
        };

        if (profile) {
          setUser({ ...userData, ...profile });
          navigation.navigate('MainTabs');
        } else {
          // New user creation
          await dbService.createUserProfile(firebaseUser.uid, {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photo: firebaseUser.photoURL,
            country_code: 'GH',
            gender: null,
          });
          setUser({ ...userData, country_code: 'GH', gender: null });
          navigation.navigate('GenderSetup');
        }
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Sign In In Progress", "A sign in operation is already in progress.");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Play Services Error", "Google Play Services are not available or outdated.");
      } else {
        Alert.alert("Login Failed", error.message || "An unexpected error occurred during Google Sign-In.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Amira</Text>
        <Text style={styles.description}>
          Find your perfect match and start chatting today.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PhoneLogin')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('PhoneLogin')}
        >
          <Text style={styles.secondaryButtonText}>Login with Phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 12, borderColor: '#DDD' }]}
          onPress={handleGoogleLogin}
        >
          <Text style={[styles.secondaryButtonText, { color: '#444' }]}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  description: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  footer: { marginBottom: 40 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { padding: 16, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  secondaryButtonText: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
});

export default WelcomeScreen;
