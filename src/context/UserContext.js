import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  dbService,
  firebaseSignOut,
  getWalletBalance,
  onAuthStateChanged,
} from '../services/firebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUserCoins = async () => {
    try {
      const currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        setCoins(0);
        console.log("USER COINS:", 0);
        return 0;
      }

      const profile = await dbService.getUserProfile(currentAuthUser.uid);
      const latestBalance = getWalletBalance(profile);
      setCoins(latestBalance);
      console.log('WALLET BALANCE:', latestBalance);
      return latestBalance;
    } catch (error) {
      console.log("COIN FETCH ERROR:", error);
      setCoins(0);
      console.log("USER COINS:", 0);
      return 0;
    }
  };

  useEffect(() => {
    let unsubscribeProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      unsubscribeProfile();
      if (authUser) {
        try {
          const profile = await dbService.ensureUserProfile(authUser);
          setUser(profile);
          setCoins(getWalletBalance(profile));
          unsubscribeProfile = dbService.subscribeToUserProfile(
            authUser.uid,
            (nextProfile) => {
              if (!nextProfile) return;
              setUser(nextProfile);
              setCoins(getWalletBalance(nextProfile));
            },
          );
        } catch (error) {
          console.error("User Hydration Error:", error);
          setUser({
            uid: authUser.uid,
            username: authUser.displayName || '',
            name: authUser.displayName || '',
            email: authUser.email || '',
            photoURL: authUser.photoURL || '',
          });
        }
      } else {
        setUser(null);
        setCoins(0);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribe();
    };
  }, []);

  const handleForceLogout = async () => {
    try {
      await AsyncStorage.clear();
      await firebaseSignOut(auth);
      setUser(null);
      setCoins(0);
    } catch (e) {
      console.error("Force logout failed:", e);
    }
  };

  const refreshUser = async () => {
    if (user?.uid) {
      const profile = await dbService.getUserProfile(user.uid);
      if (profile) setUser(prev => ({ ...prev, ...profile }));
      setCoins(getWalletBalance(profile));
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, coins, setCoins, fetchUserCoins, loading, isMale: user?.gender === 'male', refreshUser, forceLogout: handleForceLogout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
