export const EMPTY_DISCOVERY_FILTERS = Object.freeze({country:null,language:'',minAge:'',maxAge:'',onlineOnly:false,interests:[]});

const sessions = new Map();
const listeners = new Set();

export const subscribeDiscoveryFilters = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSessionDiscoveryFilters = uid => sessions.get(uid) || EMPTY_DISCOVERY_FILTERS;

export const setSessionDiscoveryFilters = (uid, value) => {
  sessions.set(uid, value);
  listeners.forEach(listener => listener());
};

export const clearSessionDiscoveryFilters = uid => {
  if (uid) sessions.delete(uid);
  listeners.forEach(listener => listener());
};
