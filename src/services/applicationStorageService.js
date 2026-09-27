import AsyncStorage from '@react-native-async-storage/async-storage';

// These keys belong exclusively to the removed device-local financial prototype.
// Firebase and third-party persistence keys must never be added to this list.
export const OBSOLETE_LOCAL_FINANCIAL_KEYS = Object.freeze([
  'coin_balance',
  'coin_transactions',
  'total_spent',
  'received_gifts',
  'upvotes_count',
  'profile_views_count',
  'detailed_gifts',
  'withdrawal_history',
  'diamond_balance',
  'today_diamonds',
  'wealth_xp',
  'last_diamonds_reset',
]);

export const applicationStorageService = {
  clearAccountSession: async () => {
    await AsyncStorage.multiRemove(OBSOLETE_LOCAL_FINANCIAL_KEYS);
  },
};
