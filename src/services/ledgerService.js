// src/services/ledgerService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ledgerService = {
  transactions: [],
  currentBalance: 0,
  totalSpent: 0,
  upvotes: 0,
  receivedGifts: {}, // { giftId: count }
  isInitialized: false,

  init: async () => {
    if (ledgerService.isInitialized) return;
    try {
      const balance = await AsyncStorage.getItem('coin_balance');
      const txns = await AsyncStorage.getItem('coin_transactions');
      const spent = await AsyncStorage.getItem('total_spent');
      const received = await AsyncStorage.getItem('received_gifts');
      const upvotes = await AsyncStorage.getItem('upvotes_count');

      if (balance) ledgerService.currentBalance = parseInt(balance);
      if (txns) ledgerService.transactions = JSON.parse(txns);
      if (spent) ledgerService.totalSpent = parseInt(spent);
      if (received) ledgerService.receivedGifts = JSON.parse(received);
      if (upvotes) ledgerService.upvotes = parseInt(upvotes);

      ledgerService.isInitialized = true;
    } catch (e) {
      console.error('Ledger init error:', e);
    }
  },

  getTransactions: async () => {
    await ledgerService.init();
    return ledgerService.transactions;
  },

  getBalance: async () => {
    await ledgerService.init();
    return ledgerService.currentBalance;
  },

  getTotalSpent: async () => {
    await ledgerService.init();
    return ledgerService.totalSpent;
  },

  getUpvotes: async () => {
    await ledgerService.init();
    return ledgerService.upvotes;
  },

  getReceivedGifts: async () => {
    await ledgerService.init();
    return ledgerService.receivedGifts;
  },

  getTotalGiftsReceived: async () => {
    await ledgerService.init();
    return Object.values(ledgerService.receivedGifts).reduce((a, b) => a + b, 0);
  },

  addTransaction: async (type, amount, metadata = {}) => {
    await ledgerService.init();
    const change = type === 'buy' ? amount : -amount;
    const newBalance = ledgerService.currentBalance + change;

    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      amount,
      balanceAfter: newBalance,
      timestamp: new Date(),
      ...metadata
    };

    ledgerService.transactions.unshift(transaction);
    ledgerService.currentBalance = newBalance;

    if (type === 'spend') {
      ledgerService.totalSpent += amount;
    }

    try {
      await AsyncStorage.setItem('coin_balance', newBalance.toString());
      await AsyncStorage.setItem('coin_transactions', JSON.stringify(ledgerService.transactions));
      await AsyncStorage.setItem('total_spent', ledgerService.totalSpent.toString());
    } catch (e) {
      console.error('Ledger save error:', e);
    }

    return transaction;
  },

  buyCoins: async (amount, tierId) => {
    return await ledgerService.addTransaction('buy', amount, { tierId, source: 'IAP' });
  },

  spendCoins: async (amount, recipientId, giftId) => {
    return await ledgerService.addTransaction('spend', amount, { recipientId, giftId, category: 'Gifting' });
  },

  // Mock receiving a gift (for the Trophy Cabinet)
  recordReceivedGift: async (giftId) => {
    await ledgerService.init();
    ledgerService.receivedGifts[giftId] = (ledgerService.receivedGifts[giftId] || 0) + 1;
    try {
      await AsyncStorage.setItem('received_gifts', JSON.stringify(ledgerService.receivedGifts));
    } catch (e) {
      console.error('Ledger record gift error:', e);
    }
  },

  // Mock receiving an upvote
  recordUpvote: async () => {
    await ledgerService.init();
    ledgerService.upvotes += 1;
    try {
      await AsyncStorage.setItem('upvotes_count', ledgerService.upvotes.toString());
    } catch (e) {
      console.error('Ledger record upvote error:', e);
    }
  }
};
