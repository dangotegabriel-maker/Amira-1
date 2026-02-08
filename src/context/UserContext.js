import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/firebaseService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const profile = await dbService.getUserProfile('current_user_id');
      setUser(profile);
    } catch (error) {
      console.error("Failed to load user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, isMale: user?.gender === 'male' }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
