import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  linkWithCredential,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_EARNINGS,
  DEFAULT_HOST_STATUS,
  DEFAULT_WALLET,
  getLegacyCreditBalance,
  getLegacyMigrationPatch,
  normalizeUser,
} from '../models/userModel';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAVS5T2i7jW2cW8xX3xFE8Hgutb5V7Wj08',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'amira-db680.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'amira-db680',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'amira-db680.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '528428934640',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:528428934640:android:c4c6898741b6229abf6935',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const getFirebaseAuth = () => {
  try {
    if (Platform.OS === 'web') {
      return getAuth(app);
    }

    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error?.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
};

export const auth = getFirebaseAuth();
export const db = getFirestore(app);
export { app, firebaseConfig, firebaseSignOut, onAuthStateChanged };

export const DEFAULT_USER_PROFILE = {
  uid: '',
  username: '',
  email: '',
  phone: '',
  profilePic: '',
  gender: '',
  dob: '',
  age: 0,
  role: '',
  isProfileComplete: false,
  countryCode: '',
  countryName: '',
  hostStatus: { ...DEFAULT_HOST_STATUS },
  wallet: { ...DEFAULT_WALLET },
  earnings: { ...DEFAULT_EARNINGS },
  hostProfile: {
    bio: '', interests: [], gallery: [], introVideoUrl: '',
    introVideoPath: '', rateTier: 'ENTRY', videoRateCredits: 25,
  },
  settings: {
    doNotDisturb: false,
  },
  vip: { tier: 'FREE', status: 'inactive', startsAt: null, expiresAt: null },
  profileViewStats: { recentCount: 0, updatedAt: null },
  referralCode: '',
  referredBy: null,
  referralStats: { qualifiedCount: 0, pendingCount: 0, updatedAt: null },
  createdAt: null,
  updatedAt: null,
};

export const getWalletBalance = (profile = {}) => {
  return getLegacyCreditBalance(profile);
};

export const normalizeUserProfile = normalizeUser;

const requireAuthenticatedUser = (expectedUid) => {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('No authenticated user found.');
  }
  if (expectedUid && expectedUid !== user.uid) {
    throw new Error('Authenticated user does not match the requested profile.');
  }
  console.log('UID:', user.uid);
  return user;
};

const GENERIC_AUTH_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const getAuthErrorMessage = () => GENERIC_AUTH_ERROR_MESSAGE;

export const formatPhoneToE164 = (phone) => {
  const rawPhone = String(phone || '').trim();
  if (rawPhone.startsWith('+')) {
    return `+${rawPhone.replace(/\D/g, '')}`;
  }

  let digits = rawPhone.replace(/\D/g, '');

  if (digits.startsWith('233')) {
    digits = digits.slice(3);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return `+233${digits}`;
};

export const authService = {
  getErrorMessage: getAuthErrorMessage,
  formatPhoneToE164,
  loginWithPhone: async (phone) => {
    const formattedPhone = formatPhoneToE164(phone);
    const error = new Error('Phone sign-in is temporarily unavailable while native app verification is configured.');
    error.code = 'auth/phone-auth-unavailable';
    error.phone = formattedPhone;
    throw error;
  },
  verifyOTP: async () => {
    const error = new Error('Phone sign-in is temporarily unavailable.');
    error.code = 'auth/phone-auth-unavailable';
    throw error;
  },
  resendOTP: async (phone) => authService.loginWithPhone(phone),
  createQuickAccount: async () => {
    const accountId = String(Math.floor(100000000 + Math.random() * 900000000));
    const username = `Guest_${Math.floor(10000 + Math.random() * 90000)}`;
    const passwordAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const password = Array.from(
      { length: 6 },
      () => passwordAlphabet[Math.floor(Math.random() * passwordAlphabet.length)],
    ).join('');
    const loginEmail = `${accountId}@accounts.amira.app`;

    const credential = await createUserWithEmailAndPassword(auth, loginEmail, password);
    await dbService.createUserProfile(credential.user.uid, {
      accountId,
      username,
      loginEmail,
      isGuest: true,
      isProfileComplete: false,
      authProvider: 'quick',
      accountDetailsAcknowledged: false,
      wallet: { creditBalance: 0, currency: 'COINS' },
    });

    return { success: true, user: credential.user, accountId, username, password };
  },
  loginWithAccount: async (accountId, password) => {
    const normalizedId = String(accountId || '').replace(/\D/g, '');
    if (!normalizedId || !password) throw new Error('Enter your Account ID and password.');

    const credential = await signInWithEmailAndPassword(
      auth,
      `${normalizedId}@accounts.amira.app`,
      password,
    );
    const profile = await dbService.getUserProfile(credential.user.uid);
    if (String(profile?.accountId) !== normalizedId) {
      await firebaseSignOut(auth);
      throw new Error('Account details do not match.');
    }
    return { success: true, user: credential.user };
  },
  loginWithGoogleToken: async (idToken) => {
    if (!idToken) throw new Error('Google did not return an identity token.');
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    const existing = await dbService.getUserProfile(result.user.uid);
    if (existing) {
      const googleProfile = {
        isGuest: false,
        authProvider: 'google',
        updatedAt: serverTimestamp(),
      };
      if (!existing.username && result.user.displayName) googleProfile.username = result.user.displayName;
      if (result.user.email) googleProfile.email = result.user.email;
      if (!existing.profilePic && result.user.photoURL) googleProfile.profilePic = result.user.photoURL;
      await dbService.updateUserProfile(result.user.uid, googleProfile);
    } else {
      await dbService.createUserProfile(result.user.uid, {
        username: result.user.displayName || result.user.email?.split('@')[0] || '',
        email: result.user.email || '',
        profilePic: result.user.photoURL || '',
        isGuest: false,
        authProvider: 'google',
        isProfileComplete: false,
      });
    }
    return { success: true, user: result.user };
  },
  bindGoogleToken: async (idToken) => {
    const currentUser = requireAuthenticatedUser();
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await linkWithCredential(currentUser, credential);
    await dbService.grantGoogleBindReward(result.user);
    return { success: true, user: result.user };
  },
  updateUserProfile: async (data) => {
    try {
      const user = auth.currentUser;
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
      await firebaseSignOut(auth);
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
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return normalizeUserProfile(uid, userSnap.data(), auth.currentUser);
      }
      return null;
    } catch (error) {
      console.error("Firestore Get User Profile Error:", error);
      throw error;
    }
  },
  updateUserProfile: async (uid, data) => {
    try {
      requireAuthenticatedUser(uid);
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, data, { merge: true });
      return { success: true };
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      throw error;
    }
  },
  updateHostAvailability: async (availability) => {
    const user = requireAuthenticatedUser();
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) throw new Error('Profile not found.');
    const profile = normalizeUserProfile(user.uid, snapshot.data(), user);
    if (profile.role !== 'host' || profile.hostStatus?.isApproved !== true) {
      throw new Error('Only approved hosts can change availability.');
    }
    if (!['online', 'offline', 'busy'].includes(availability)) {
      throw new Error('Invalid host availability.');
    }
    await updateDoc(userRef, {
      'hostStatus.availability': availability,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  },
  createUserProfile: async (uid, data = {}) => {
    try {
      const user = requireAuthenticatedUser(uid);
      const suppliedBalance = getWalletBalance(data);
      const canonicalInput = normalizeUserProfile(uid, {
        ...data,
        uid: user.uid,
        username: data.username || data.name || user.displayName || '',
        email: data.email || user.email || '',
        phone: data.phone || user.phoneNumber || '',
        profilePic: data.profilePic || data.photoURL || user.photoURL || '',
        wallet: {
          creditBalance: suppliedBalance,
          currency: data?.wallet?.currency || data.currency || 'GHS',
        },
      }, user);
      const newUser = {
        ...DEFAULT_USER_PROFILE,
        ...data,
        uid: canonicalInput.uid,
        username: canonicalInput.username,
        email: canonicalInput.email,
        phone: canonicalInput.phone,
        profilePic: canonicalInput.profilePic,
        gender: canonicalInput.gender,
        dob: canonicalInput.dob,
        age: canonicalInput.age,
        countryCode: canonicalInput.countryCode,
        countryName: canonicalInput.countryName,
        role: canonicalInput.role,
        isProfileComplete: canonicalInput.isProfileComplete,
        hostStatus: canonicalInput.hostStatus,
        wallet: canonicalInput.wallet,
        earnings: canonicalInput.earnings,
        hostProfile: canonicalInput.hostProfile,
        settings: canonicalInput.settings,
        vip: canonicalInput.vip,
        profileViewStats: canonicalInput.profileViewStats,
        referralCode: canonicalInput.referralCode,
        referredBy: canonicalInput.referredBy,
        referralStats: canonicalInput.referralStats,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, newUser, { merge: true });
      return { success: true, user: newUser };
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      throw error;
    }
  },
  ensureUserProfile: async (authUser) => {
    if (!authUser?.uid) throw new Error('No authenticated user found.');
    const userRef = doc(db, 'users', authUser.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await dbService.createUserProfile(authUser.uid, {
        username: authUser.displayName || '',
        email: authUser.email || '',
        phone: authUser.phoneNumber || '',
        profilePic: authUser.photoURL || '',
      });
    } else {
      const rawData = snapshot.data();
      const normalized = normalizeUserProfile(authUser.uid, rawData, authUser);
      const migrationPatch = getLegacyMigrationPatch(rawData, normalized);
      // Firebase Auth remains the authority for generated-account passwords.
      if (Object.prototype.hasOwnProperty.call(rawData, 'password')) {
        migrationPatch.password = deleteField();
      }
      if (Object.keys(migrationPatch).length > 0) {
        migrationPatch.updatedAt = serverTimestamp();
        try {
          await updateDoc(userRef, migrationPatch);
        } catch (migrationError) {
          // A legacy ruleset may not yet allow every canonical field. Do not
          // prevent sign-in; surface the normalized profile and retry later.
          console.log('PROFILE MIGRATION ERROR:', migrationError);
        }
      }
    }

    return dbService.getUserProfile(authUser.uid);
  },
  subscribeToUserProfile: (uid, onValue, onError) => {
    if (!uid) return () => {};
    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        onValue(snapshot.exists()
          ? normalizeUserProfile(uid, snapshot.data(), auth.currentUser)
          : null);
      },
      (error) => {
        console.log('FIRESTORE ERROR:', error);
        onError?.(error);
      },
    );
  },
  topUpWallet: async (amount) => {
    const user = requireAuthenticatedUser();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Top-up amount must be greater than zero.');
    }

    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await dbService.createUserProfile(user.uid);
    }

    try {
      await setDoc(userRef, {
        wallet: {
          creditBalance: increment(numericAmount),
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      throw error;
    }
  },
  updateWalletBalance: async (amountDelta) => {
    const user = requireAuthenticatedUser();
    const numericDelta = Number(amountDelta);
    if (!Number.isFinite(numericDelta)) throw new Error('Invalid wallet amount.');

    try {
      await setDoc(doc(db, 'users', user.uid), {
        wallet: {
          creditBalance: increment(numericDelta),
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      throw error;
    }
  },
  acknowledgeAccountDetails: async () => {
    const user = requireAuthenticatedUser();
    await setDoc(doc(db, 'users', user.uid), {
      accountDetailsAcknowledged: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },
  claimDailyReward: async () => {
    const user = requireAuthenticatedUser();
    const userRef = doc(db, 'users', user.uid);
    const today = new Date().toISOString().slice(0, 10);

    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists()) throw new Error('Profile not found.');
      const data = snapshot.data();
      if (data?.rewards?.dailyClaimedAt === today) {
        return { claimed: false, balance: getWalletBalance(data) };
      }
      const balance = getWalletBalance(data) + 10;
      transaction.set(userRef, {
        wallet: { creditBalance: balance, currency: data?.wallet?.currency || 'COINS' },
        rewards: {
          ...(data.rewards || {}),
          dailyClaimedAt: today,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { claimed: true, balance };
    });
  },
  grantGoogleBindReward: async (googleUser) => {
    const user = requireAuthenticatedUser();
    const userRef = doc(db, 'users', user.uid);

    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists()) throw new Error('Profile not found.');
      const data = snapshot.data();
      if (data?.rewards?.googleLinked) return { rewarded: false };
      const balance = getWalletBalance(data) + 50;
      transaction.set(userRef, {
        username: googleUser?.displayName || data.username || '',
        email: googleUser?.email || data.email || '',
        profilePic: googleUser?.photoURL || data.profilePic || '',
        isGuest: false,
        wallet: { creditBalance: balance, currency: data?.wallet?.currency || 'COINS' },
        rewards: {
          ...(data.rewards || {}),
          googleLinked: true,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { rewarded: true, balance };
    });
  },
};
