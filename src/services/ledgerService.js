// src/services/ledgerService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ledgerService = {
  transactions: [],
  currentBalance: 0,
  totalSpent: 0,
  upvotes: 0,
  receivedGifts: {}, // { giftId: count }
  profileViews: 0,
  detailedGifts: [],
  diamondBalance: 0, // Total withdrawal currency
  todayDiamonds: 0, // Earnings for the current day
  wealthXP: 0, // For males
  isInitialized: false,

  init: async () => {
    if (ledgerService.isInitialized) return;
    try {
      const balance = await AsyncStorage.getItem('coin_balance');
      const txns = await AsyncStorage.getItem('coin_transactions');
      const spent = await AsyncStorage.getItem('total_spent');
      const received = await AsyncStorage.getItem('received_gifts');
      const upvotes = await AsyncStorage.getItem('upvotes_count');
      const views = await AsyncStorage.getItem('profile_views_count');
      const detailed = await AsyncStorage.getItem('detailed_gifts');
      const diamonds = await AsyncStorage.getItem('diamond_balance');
      const today = await AsyncStorage.getItem('today_diamonds');
      const xp = await AsyncStorage.getItem('wealth_xp');
      const lastReset = await AsyncStorage.getItem('last_diamonds_reset');

      if (balance) ledgerService.currentBalance = parseInt(balance);
      if (txns) ledgerService.transactions = JSON.parse(txns);
      if (spent) ledgerService.totalSpent = parseInt(spent);
      if (received) ledgerService.receivedGifts = JSON.parse(received);
      if (upvotes) ledgerService.upvotes = parseInt(upvotes);
      if (views) ledgerService.profileViews = parseInt(views);
      if (detailed) ledgerService.detailedGifts = JSON.parse(detailed);
      if (diamonds) ledgerService.diamondBalance = parseInt(diamonds);
      if (xp) ledgerService.wealthXP = parseInt(xp);

      // Daily reset logic for todayDiamonds
      const now = new Date().toDateString();
      if (lastReset !== now) {
         ledgerService.todayDiamonds = 0;
         await AsyncStorage.setItem('today_diamonds', '0');
         await AsyncStorage.setItem('last_diamonds_reset', now);
      } else if (today) {
         ledgerService.todayDiamonds = parseInt(today);
      }

      ledgerService.isInitialized = true;
    } catch (e) {
      console.error('Ledger init error:', e);
    }
  },

  getTier: (xp) => {
    if (xp >= 10000) return { name: 'Emperor', color: '#B9F2FF', priority: 4 }; // Diamond
    if (xp >= 5000) return { name: 'Royalty', color: '#FFD700', priority: 3 }; // Gold
    if (xp >= 1000) return { name: 'Noble', color: '#C0C0C0', priority: 2 }; // Silver
    return { name: 'Commoner', color: '#CD7F32', priority: 1 }; // Bronze
  },

  getBalance: async () => {
    await ledgerService.init();
    return ledgerService.currentBalance;
  },

  getDiamondBalance: async () => {
    await ledgerService.init();
    return ledgerService.diamondBalance;
  },

  getTodayDiamonds: async () => {
    await ledgerService.init();
    return ledgerService.todayDiamonds;
  },

  getWealthXP: async () => {
    await ledgerService.init();
    return ledgerService.wealthXP;
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
      ledgerService.wealthXP += amount;

      if (metadata.category === 'Gifting') {
        const detailedEntry = {
          id: transaction.id,
          type: 'sent',
          giftId: metadata.giftId,
          amount: 1,
          timestamp: transaction.timestamp,
          otherUser: metadata.recipientName || 'User'
        };
        ledgerService.detailedGifts.unshift(detailedEntry);
      }
    }

    try {
      await AsyncStorage.setItem('coin_balance', newBalance.toString());
      await AsyncStorage.setItem('coin_transactions', JSON.stringify(ledgerService.transactions));
      await AsyncStorage.setItem('total_spent', ledgerService.totalSpent.toString());
      await AsyncStorage.setItem('detailed_gifts', JSON.stringify(ledgerService.detailedGifts));
      await AsyncStorage.setItem('wealth_xp', ledgerService.wealthXP.toString());
    } catch (e) {
      console.error('Ledger save error:', e);
    }

    return transaction;
  },

  buyCoins: async (amount, tierId) => {
    return await ledgerService.addTransaction('buy', amount, { tierId, source: 'IAP' });
  },

  spendCoins: async (amount, recipientId, giftId, recipientName) => {
    return await ledgerService.addTransaction('spend', amount, {
      recipientId,
      giftId,
      recipientName,
      category: 'Gifting',
      platformCommission: 0.4
    });
  },

  billCallMinute: async (rate, recipientId, recipientName) => {
    const txn = await ledgerService.addTransaction('spend', rate, {
      recipientId,
      recipientName,
      category: 'Call',
      unit: 'minute'
    });

    // For female recipient credit simulation (In real app, this is backend-only)
    // Here we can use a mock event to trigger a Diamond credit if we are the female
    return txn;
  },

  creditDiamonds: async (coinAmount) => {
     await ledgerService.init();
     const diamondCut = Math.floor(coinAmount * 0.6);
     ledgerService.diamondBalance += diamondCut;
     ledgerService.todayDiamonds += diamondCut;

     await AsyncStorage.setItem('diamond_balance', ledgerService.diamondBalance.toString());
     await AsyncStorage.setItem('today_diamonds', ledgerService.todayDiamonds.toString());

     return diamondCut;
  },

  recordReceivedGift: async (giftId, senderName, coinValue = 0) => {
    await ledgerService.init();
    ledgerService.receivedGifts[giftId] = (ledgerService.receivedGifts[giftId] || 0) + 1;

    const diamondCut = await ledgerService.creditDiamonds(coinValue);

    const detailedEntry = {
      id: `recv_${Date.now()}`,
      type: 'received',
      giftId: giftId,
      amount: 1,
      timestamp: new Date(),
      otherUser: senderName || 'User',
      diamondsEarned: diamondCut
    };
    ledgerService.detailedGifts.unshift(detailedEntry);

    try {
      await AsyncStorage.setItem('received_gifts', JSON.stringify(ledgerService.receivedGifts));
      await AsyncStorage.setItem('detailed_gifts', JSON.stringify(ledgerService.detailedGifts));
    } catch (e) {
      console.error('Ledger record gift error:', e);
    }
  },

  withdrawDiamonds: async (amount, method) => {
    await ledgerService.init();
    if (ledgerService.diamondBalance < amount) throw new Error('Insufficient diamonds');

    ledgerService.diamondBalance -= amount;
    await AsyncStorage.setItem('diamond_balance', ledgerService.diamondBalance.toString());
    return { success: true };
  }
};
