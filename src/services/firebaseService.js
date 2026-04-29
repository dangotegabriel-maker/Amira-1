import { getAuth, signInWithPhoneNumber, updateProfile, signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';

export const authService = {
  loginWithPhone: async (phone) => {
    try {
      const confirmation = await signInWithPhoneNumber(getAuth(), phone);
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
      const user = getAuth().currentUser;
      if (user) {
        await updateProfile(user, data);
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
      await signOut(getAuth());
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
      const userRef = doc(getFirestore(), 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return { uid, ...userSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Firestore Get User Profile Error:", error);
      throw error;
    }
  },
  updateUserProfile: async (uid, data) => {
    try {
      const userRef = doc(getFirestore(), 'users', uid);
      await updateDoc(userRef, data);
      return { success: true };
    } catch (error) {
      console.error("Firestore Update User Profile Error:", error);
      throw error;
    }
  },
  createUserProfile: async (uid, data = {}) => {
    try {
      const initialBalance = 0;
      const newUser = {
        uid,
        coin_balance: initialBalance,
        diamonds: 0,
        is_verified: false,
        created_at: serverTimestamp(),
        ...data
      };
      const userRef = doc(getFirestore(), 'users', uid);
      await setDoc(userRef, newUser);
      return { success: true, user: newUser };
    } catch (error) {
      console.error("Firestore Create User Profile Error:", error);
      throw error;
    }
  }
};
