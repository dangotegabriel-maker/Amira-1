// src/services/ledgerService.js
// Service for secure double-entry transaction tracking for coins
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ledgerService = {
  // Mock double-entry ledger
  // Each entry has: id, type (buy/spend), amount, balanceAfter, timestamp
  transactions: [],
  currentBalance: 0,
  isInitialized: false,

  init: async () => {
    if (ledgerService.isInitialized) return;
    try {
      const balance = await AsyncStorage.getItem('coin_balance');
      const txns = await AsyncStorage.getItem('coin_transactions');
      if (balance) ledgerService.currentBalance = parseInt(balance);
      if (txns) ledgerService.transactions = JSON.parse(txns);
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

    try {
      await AsyncStorage.setItem('coin_balance', newBalance.toString());
      await AsyncStorage.setItem('coin_transactions', JSON.stringify(ledgerService.transactions));
    } catch (e) {
      console.error('Ledger save error:', e);
    }

    console.log(`Transaction successful: ${type} ${amount}. New balance: ${newBalance}`);
    return transaction;
  },

  buyCoins: async (amount, tierId) => {
    return await ledgerService.addTransaction('buy', amount, { tierId, source: 'IAP' });
  },

  spendCoins: async (amount, recipientId, giftId) => {
    return await ledgerService.addTransaction('spend', amount, { recipientId, giftId, category: 'Gifting' });
  }
};
