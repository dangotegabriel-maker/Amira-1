import { amiraIdentityService } from '../services/amiraIdentityService';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, dbService, firebaseSignOut, getWalletBalance, onAuthStateChanged } from '../services/firebaseService';
import { isApprovedHost, isConsumer } from '../models/userModel';
import { socketService } from '../services/socketService';
import { applicationStorageService } from '../services/applicationStorageService';
import { clearSessionDiscoveryFilters } from '../services/discoveryFilterStore';
import { runSessionTermination } from '../services/sessionTerminationService';

const UserContext = createContext();
const emptyState = status => ({ user: null, coins: 0, status });

export const UserProvider = ({ children }) => {
  const [state, setState] = useState(() => emptyState('auth_loading'));
  const owner = useRef(null);
  const sessionVersion = useRef(0);
  const terminationPromise = useRef(null);

  // Token identity distinguishes even two authentication sessions for one UID.
  // Retry replaces the token too, invalidating the preceding profile attempt.
  const current = token => Boolean(token && owner.current === token
    && auth.currentUser === token.authUser);
  const invalidate = () => {
    const previous = owner.current;
    owner.current = null;
    previous?.stop();
    if (previous?.authUser?.uid) clearSessionDiscoveryFilters(previous.authUser.uid);
  };
  const commitProfile = (token, profile) => {
    if (!current(token)) return;
    if (!profile || profile.uid !== token.authUser.uid) throw new Error('Profile unavailable.');
    setState({ user: profile, coins: getWalletBalance(profile), status: 'ready' });
  };
  const failProfile = token => {
    if (!current(token)) return;
    // Keep Auth, but never infer role/onboarding from a failed profile read.
    invalidate();
    owner.current = { authUser: token.authUser, lifecycle: token.lifecycle, stop: () => {} };
    setState(emptyState('profile_error'));
  };
  const resolveProfile = async (authUser, lifecycle = {}) => {
    invalidate();
    if (!authUser) {
      setState(emptyState('signed_out'));
      return;
    }
    const token = { authUser, lifecycle, stop: () => {} };
    token.publicSession = { key: ++sessionVersion.current, isCurrent: () => current(token) };
    owner.current = token;
    setState(emptyState('profile_loading'));
    try {
      const profile = await dbService.ensureUserProfile(authUser);
      if (!current(token)) return;
      commitProfile(token, profile);
      const stop = dbService.subscribeToUserProfile(authUser.uid, nextProfile => {
        if (!current(token)) return;
        try { commitProfile(token, nextProfile); } catch (_) { failProfile(token); }
      }, () => failProfile(token));
      // An adapter may report an error synchronously during subscription setup.
      if (!current(token)) { stop(); return; }
      token.stop = stop;
      amiraIdentityService.ensure().catch(() => {
        if (current(token)) console.warn('Account identity unavailable.');
      });
    } catch (_) {
      failProfile(token);
    }
  };

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, authUser => {
      if (active) resolveProfile(authUser);
    });
    return () => { active = false; invalidate(); unsubscribe(); };
  }, []);

  // Bind APIs to this render's session, not the account current when an old
  // screen resumes after an awaited backend operation.
  const session = owner.current;
  const retryProfile = () => {
    if (current(session)) return resolveProfile(session.authUser, session.lifecycle);
    return Promise.resolve();
  };
  const refreshUser = async () => {
    if (!current(session)) return;
    try {
      const profile = await dbService.getUserProfile(session.authUser.uid);
      commitProfile(session, profile);
    } catch (error) {
      if (!current(session)) return;
      throw error;
    }
  };
  const updateProfile = async patch => {
    if (!current(session)) return;
    try {
      await dbService.updateUserProfile(session.authUser.uid, patch);
      if (current(session)) await refreshUser();
    } catch (error) {
      if (!current(session)) return;
      throw error;
    }
  };
  const fetchUserCoins = async () => {
    if (!current(session)) return 0;
    try {
      const profile = await dbService.getUserProfile(session.authUser.uid);
      if (!current(session)) return 0;
      if (!profile || profile.uid !== session.authUser.uid) throw new Error('Profile unavailable.');
      const coins = getWalletBalance(profile);
      setState(previous => ({ ...previous, coins }));
      return coins;
    } catch (error) {
      if (current(session)) console.error('Coin fetch failed:', error);
      // A read failure is not evidence of a zero authoritative balance.
      return 0;
    }
  };
  const terminateSession = () => {
    if (!current(session)) return Promise.resolve();
    if (terminationPromise.current) return terminationPromise.current;
    const terminatingOwner = owner.current;
    const authUser = auth.currentUser;
    const uid = authUser?.uid || state.user?.uid;
    const stillTerminating = () => owner.current?.lifecycle === terminatingOwner?.lifecycle
      && auth.currentUser === authUser;
    const task = runSessionTermination({
      disconnect: () => socketService.disconnect(),
      clearFilters: () => clearSessionDiscoveryFilters(uid),
      clearStorage: () => applicationStorageService.clearAccountSession(),
      signOut: () => stillTerminating() ? firebaseSignOut(auth) : undefined,
      resetState: () => {
        // Auth's null callback may already have reset state. Never reset a
        // newer session when this termination settles.
        if (!stillTerminating()) return;
        invalidate();
        setState(emptyState('signed_out'));
      },
      onCleanupError: (label, error) => console.error(`${label} cleanup failed:`, error),
    });
    terminationPromise.current = task;
    task.finally(() => {
      if (terminationPromise.current === task) terminationPromise.current = null;
    }).catch(() => {});
    return task;
  };

  return <UserContext.Provider value={{
    user: state.user,
    authenticatedSession: session?.publicSession,
    coins: state.coins,
    bootstrapStatus: state.status,
    loading: state.status === 'auth_loading' || state.status === 'profile_loading',
    isConsumer: isConsumer(state.user),
    isApprovedHost: isApprovedHost(state.user),
    retryProfile, refreshUser, updateProfile, fetchUserCoins,
    terminateSession, forceLogout: terminateSession,
  }}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
