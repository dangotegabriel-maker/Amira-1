import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Firebase initialization and service methods
export const firebaseConfig = {
  apiKey: "AIzaSyB_Mock_Key_For_Production",
  authDomain: "amira-social.firebaseapp.com",
  projectId: "amira-social",
  storageBucket: "amira-social.appspot.com",
  messagingSenderId: "777888999000",
  appId: "1:777888999000:android:abc123xyz"
};

export const authService = {
  loginWithPhone: async (phone) => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phone);
      return { success: true, confirmation };
    } catch (error) {
      console.error("Firebase Phone Login Error:", error);
      throw error;
    }
  },
  verifyOTP: async (confirmation, code) => {
    try {
      const result = await confirmation.confirm(code);
      return { success: true, user: result.user };
    } catch (error) {
      console.error("Firebase OTP Verification Error:", error);
      throw error;
    }
  },
  updateProfile: async (data) => {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.updateProfile(data);
        return { success: true };
      }
      throw new Error("No authenticated user found.");
    } catch (error) {
      console.error("Firebase Update Profile Error:", error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      await auth().signOut();
      return { success: true };
    } catch (error) {
      console.error("Firebase Sign Out Error:", error);
      throw error;
    }
  }
};

export const dbService = {
  getUserProfile: async (uid) => {
    try {
      const doc = await firestore().collection('users').doc(uid).get();
      if (doc.exists) {
        return { uid, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error("Firestore Get User Profile Error:", error);
      throw error;
    }
  },
  updateUserProfile: async (uid, data) => {
    try {
      await firestore().collection('users').doc(uid).update(data);
      return { success: true };
    } catch (error) {
      console.error("Firestore Update User Profile Error:", error);
      throw error;
    }
  },
  createUserProfile: async (uid, data = {}) => {
    try {
      const initialBalance = 0; // Production default
      const newUser = {
        uid,
        coin_balance: initialBalance,
        diamonds: 0,
        is_verified: false,
        created_at: firestore.FieldValue.serverTimestamp(),
        ...data
      };
      await firestore().collection('users').doc(uid).set(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      console.error("Firestore Create User Profile Error:", error);
      throw error;
    }
  }
};
