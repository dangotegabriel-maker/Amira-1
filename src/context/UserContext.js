import {amiraIdentityService} from '../services/amiraIdentityService';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  auth,
  dbService,
  firebaseSignOut,
  getWalletBalance,
  onAuthStateChanged,
} from '../services/firebaseService';
import { isApprovedHost, isConsumer } from '../models/userModel';
import { socketService } from '../services/socketService';
import { applicationStorageService } from '../services/applicationStorageService';
import { clearSessionDiscoveryFilters } from '../services/discoveryFilterStore';
import { runSessionTermination } from '../services/sessionTerminationService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const terminationPromise = useRef(null);

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
          if(auth.currentUser?.uid===authUser.uid) amiraIdentityService.ensure().catch(()=>console.warn('Account identity unavailable.'));
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

  const terminateSession = () => {
    if (terminationPromise.current) return terminationPromise.current;
    const uid = auth.currentUser?.uid || user?.uid;
    const task = runSessionTermination({
      disconnect: () => socketService.disconnect(),
      clearFilters: () => clearSessionDiscoveryFilters(uid),
      clearStorage: () => applicationStorageService.clearAccountSession(),
      signOut: () => firebaseSignOut(auth),
      resetState: () => {
        setUser(null);
        setCoins(0);
      },
      onCleanupError: (label, error) => console.error(`${label} cleanup failed:`, error),
    });
    terminationPromise.current = task;
    task.finally(() => {
      if (terminationPromise.current === task) terminationPromise.current = null;
    }).catch(() => {});
    return task;
  };

  const refreshUser = async () => {
    if (user?.uid) {
      const profile = await dbService.getUserProfile(user.uid);
      if (profile) setUser(prev => ({ ...prev, ...profile }));
      setCoins(getWalletBalance(profile));
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      coins,
      setCoins,
      fetchUserCoins,
      loading,
      isConsumer: isConsumer(user),
      isApprovedHost: isApprovedHost(user),
      refreshUser,
      terminateSession,
      forceLogout: terminateSession,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
