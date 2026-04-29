import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/firebaseService';
import { getAuth, onAuthStateChanged, signOut } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const profile = await dbService.getUserProfile(authUser.uid);
          if (profile) {
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              name: authUser.displayName || profile.name,
              photo: authUser.photoURL || profile.photos?.[0],
              ...profile
            });
          } else {
            // New user case
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              name: authUser.displayName,
              photo: authUser.photoURL,
            });
          }
        } catch (error) {
          console.error("User Hydration Error:", error);
          // If profile fetch fails critically, force logout to avoid broken state
          await handleForceLogout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleForceLogout = async () => {
    try {
      await AsyncStorage.clear();
      await signOut(getAuth());
      setUser(null);
    } catch (e) {
      console.error("Force logout failed:", e);
    }
  };

  const refreshUser = async () => {
    if (user?.uid) {
      const profile = await dbService.getUserProfile(user.uid);
      if (profile) setUser(prev => ({ ...prev, ...profile }));
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, isMale: user?.gender === 'male', refreshUser, forceLogout: handleForceLogout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
