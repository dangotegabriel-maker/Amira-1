import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  linkWithCredential,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
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
  serverTimestamp,
} from 'firebase/firestore';
import { Platform } from 'react-native';

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

    return initializeAuth(app, { persistence: inMemoryPersistence });
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
  photoURL: '',
  gender: '',
  dob: '',
  age: 0,
  role: '',
  isProfileComplete: false,
  isApproved: false,
  agencyId: 'DIRECT',
  wallet: {
    balance: 0,
    currency: 'GHS',
  },
  vip: {
    isActive: false,
    level: 0,
  },
  rewards: {
    dailyClaimedAt: null,
    googleLinked: false,
  },
  settings: {
    doNotDisturb: false,
  },
  notifications: {
    unreadMessages: 0,
    likesCount: 0,
  },
  isOnline: false,
};

export const getWalletBalance = (profile = {}) => {
  const value = profile?.wallet?.balance ?? profile?.coins ?? profile?.coin_balance ?? 0;
  const balance = Number(value);
  return Number.isFinite(balance) ? balance : 0;
};

export const normalizeUserProfile = (uid, data = {}, authUser = null) => {
  const username =
    data.username ||
    data.name ||
    authUser?.displayName ||
    '';
  const photoURL =
    data.photoURL ||
    data.photo ||
    data.photos?.[0] ||
    authUser?.photoURL ||
    '';
  const role = data.role === 'host' || data.role === 'consumer' ? data.role : '';

  return {
    ...DEFAULT_USER_PROFILE,
    ...data,
    uid,
    username,
    name: username,
    email: data.email || authUser?.email || '',
    phone: data.phone || authUser?.phoneNumber || '',
    photoURL,
    photo: photoURL,
    role,
    agencyId: data.agencyId || 'DIRECT',
    wallet: {
      balance: getWalletBalance(data),
      currency: data?.wallet?.currency || data.currency || 'GHS',
    },
    vip: {
      ...DEFAULT_USER_PROFILE.vip,
      ...data.vip,
    },
    rewards: {
      ...DEFAULT_USER_PROFILE.rewards,
      ...data.rewards,
    },
    settings: {
      ...DEFAULT_USER_PROFILE.settings,
      ...data.settings,
    },
    notifications: {
      ...DEFAULT_USER_PROFILE.notifications,
      ...data.notifications,
    },
  };
};

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

let lastConfirmationResult = null;

const GENERIC_AUTH_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const getAuthErrorMessage = () => GENERIC_AUTH_ERROR_MESSAGE;

const throwFriendlyAuthError = (error, context) => {
  console.error(context, error);
  console.log("ERROR CODE:", error?.code);
  console.log("ERROR MESSAGE:", error?.message);
  throw error;
};

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

const testPhoneAuthVerifier = {
  type: 'recaptcha',
  verify: async () => 'test',
  _reset: () => {},
};

export const authService = {
  getErrorMessage: getAuthErrorMessage,
  formatPhoneToE164,
  loginWithPhone: async (phone) => {
    const formattedPhone = formatPhoneToE164(phone);
    console.log("PHONE:", formattedPhone);

    try {
      lastConfirmationResult = await signInWithPhoneNumber(auth, formattedPhone, testPhoneAuthVerifier);

      return {
        success: true,
        phone: formattedPhone,
        requiresOTP: true,
      };
    } catch (error) {
      throwFriendlyAuthError(error, 'Firebase Phone Login Error:');
    }
  },
  verifyOTP: async (code) => {
    try {
      if (!lastConfirmationResult) {
        const error = new Error('Missing phone confirmation result.');
        error.code = 'auth/missing-confirmation-result';
        throw error;
      }

      const userCredential = await lastConfirmationResult.confirm(code);
      lastConfirmationResult = null;

      return { success: true, user: userCredential.user };
    } catch (error) {
      throwFriendlyAuthError(error, 'Firebase OTP Verification Error:');
    }
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
      password,
      loginEmail,
      isGuest: true,
      role: 'consumer',
      gender: 'male',
      isProfileComplete: true,
      authProvider: 'quick',
      accountDetailsAcknowledged: false,
      wallet: { balance: 0, currency: 'COINS' },
      vip: { isActive: false, level: 0 },
      rewards: { dailyClaimedAt: null, googleLinked: false },
      settings: { doNotDisturb: false },
      notifications: { unreadMessages: 0, likesCount: 0 },
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
    const googleProfile = {
      username: result.user.displayName || result.user.email?.split('@')[0] || 'Amira User',
      email: result.user.email || '',
      photoURL: result.user.photoURL || '',
      profilePic: result.user.photoURL || '',
      isGuest: false,
      role: 'consumer',
      gender: 'male',
      isProfileComplete: true,
      authProvider: 'google',
    };
    const existing = await dbService.getUserProfile(result.user.uid);
    if (existing) {
      await dbService.updateUserProfile(result.user.uid, googleProfile);
    } else {
      await dbService.createUserProfile(result.user.uid, googleProfile);
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
  createUserProfile: async (uid, data = {}) => {
    try {
      const user = requireAuthenticatedUser(uid);
      const suppliedBalance = getWalletBalance(data);
      const newUser = {
        ...DEFAULT_USER_PROFILE,
        uid: user.uid,
        username: data.username || data.name || user.displayName || '',
        email: data.email || user.email || '',
        phone: data.phone || user.phoneNumber || '',
        photoURL: data.photoURL || user.photoURL || '',
        wallet: {
          balance: suppliedBalance,
          currency: data?.wallet?.currency || data.currency || 'GHS',
        },
        // Keep legacy fields synchronized while old screens are phased out.
        coins: suppliedBalance,
        coin_balance: suppliedBalance,
        diamonds: data.diamonds || 0,
        is_verified: data.is_verified || false,
        createdAt: serverTimestamp(),
        created_at: serverTimestamp(),
        ...data,
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
    const existing = await dbService.getUserProfile(authUser.uid);
    const providerData = {
      username: existing?.username || authUser.displayName || '',
      email: existing?.email || authUser.email || '',
      phone: existing?.phone || authUser.phoneNumber || '',
      photoURL: existing?.photoURL || authUser.photoURL || '',
    };

    if (!existing) {
      await dbService.createUserProfile(authUser.uid, providerData);
    } else {
      await dbService.updateUserProfile(authUser.uid, {
        ...providerData,
        wallet: existing.wallet,
        agencyId: existing.agencyId || 'DIRECT',
      });
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
          balance: increment(numericAmount),
        },
        coins: increment(numericAmount),
        coin_balance: increment(numericAmount),
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
          balance: increment(numericDelta),
        },
        coins: increment(numericDelta),
        coin_balance: increment(numericDelta),
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
        wallet: { balance, currency: data?.wallet?.currency || 'COINS' },
        coins: balance,
        coin_balance: balance,
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
        photoURL: googleUser?.photoURL || data.photoURL || '',
        profilePic: googleUser?.photoURL || data.profilePic || '',
        isGuest: false,
        wallet: { balance, currency: data?.wallet?.currency || 'COINS' },
        coins: balance,
        coin_balance: balance,
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
