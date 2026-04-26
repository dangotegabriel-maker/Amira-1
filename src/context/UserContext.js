import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/firebaseService';
import auth from '@react-native-firebase/auth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth().onAuthStateChanged(async (authUser) => {
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
            // Document might not exist yet during onboarding
            setUser({
              uid: authUser.uid,
              email: authUser.email,
              name: authUser.displayName,
              photo: authUser.photoURL,
            });
          }
        } catch (error) {
          console.error("User Hydration Error:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    if (user?.uid) {
      const profile = await dbService.getUserProfile(user.uid);
      if (profile) setUser(prev => ({ ...prev, ...profile }));
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, isMale: user?.gender === 'male', refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
