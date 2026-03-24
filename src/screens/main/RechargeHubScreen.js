// src/screens/main/RechargeHubScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Coins, ChevronLeft, TrendingUp, Zap, Trophy, Crown } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { useIsFocused } from '@react-navigation/native';

const BUNDLES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    coins: 100,
    price: '$0.99',
    icon: <Coins color="#FFD700" size={32} />,
    description: 'Low friction entry'
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    coins: 500,
    price: '$4.49',
    icon: <TrendingUp color="#FFD700" size={40} />,
    bonus: '10% Bonus',
    description: 'Most popular choice'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    coins: 1200,
    price: '$9.99',
    icon: <Zap color="#FFD700" size={48} />,
    bonus: '20% Bonus',
    description: 'Best for power users'
  },
  {
    id: 'whale',
    name: 'Whale Pack',
    coins: 6500,
    price: '$49.99',
    icon: <Crown color="#FFD700" size={60} />,
    bonus: 'Best Value',
    description: 'Highest value bundle'
  },
];

const RechargeHubScreen = ({ navigation, route }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadBalance();

      // Handle return from payment screen
      if (route.params?.paymentStatus === 'success') {
        const { coins, bundleId } = route.params;
        ledgerService.buyCoins(coins, bundleId).then(() => {
           loadBalance();
           Alert.alert("Success", "Payment confirmed! Coins added.");
           // Clear params to avoid multiple alerts
           navigation.setParams({ paymentStatus: null, coins: null, bundleId: null });
        });
      } else if (route.params?.paymentStatus === 'failed') {
        Alert.alert("Payment Failed", "Transaction was unsuccessful. Please try again.");
        navigation.setParams({ paymentStatus: null });
      }
    }
  }, [isFocused, route.params]);

  const loadBalance = async () => {
    const b = await ledgerService.getBalance();
    setBalance(b);
  };

  const handlePurchase = async (bundle) => {
    setLoading(true);
    try {
      // MOCK BACKEND CALL: In production, call your server to initialize transaction
      // This returns a Paystack Checkout URL
      // Mocking a successful init response
      setTimeout(() => {
        setLoading(false);
        navigation.navigate('PaymentMethod', {
          bundleId: bundle.id,
          coins: bundle.coins,
          amount: bundle.price
        });
      }, 1000);

    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Could not initiate payment. Please check your connection.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharge Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <View style={styles.balanceValueContainer}>
          <Coins color="#FFD700" size={24} />
          <Text style={styles.balanceValue}>{balance}</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.globalLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Connecting to Payment Gateway...</Text>
        </View>
      )}

      <FlatList
        data={BUNDLES}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bundleCard}
            onPress={() => handlePurchase(item)}
          >
            <View style={styles.bundleIconContainer}>
              {item.icon}
            </View>
            <View style={styles.bundleInfo}>
              <View style={styles.bundleHeader}>
                <Text style={styles.bundleName}>{item.name}</Text>
                {item.bonus && (
                  <View style={styles.bonusBadge}>
                    <Text style={styles.bonusText}>{item.bonus}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.bundleCoins}>{item.coins} Coins</Text>
              <Text style={styles.bundleDesc}>{item.description}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: COLORS.white
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  balanceCard: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 30,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  balanceLabel: { color: COLORS.textSecondary, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  balanceValueContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  balanceValue: { fontSize: 32, fontWeight: 'bold', marginLeft: 10 },
  listContent: { padding: 15 },
  bundleCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginBottom: 15,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  bundleIconContainer: { width: 70, alignItems: 'center', justifyContent: 'center' },
  bundleInfo: { flex: 1, marginLeft: 15 },
  bundleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bundleName: { fontSize: 16, fontWeight: 'bold' },
  bonusBadge: { backgroundColor: '#E1F5FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginLeft: 8 },
  bonusText: { color: '#0288D1', fontSize: 10, fontWeight: 'bold' },
  bundleCoins: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  bundleDesc: { fontSize: 12, color: COLORS.textSecondary },
  priceBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  priceText: { color: COLORS.white, fontWeight: 'bold' },
  globalLoading: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFBE6',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE58F'
  },
  loadingText: {
    marginTop: 8,
    color: '#856404',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default RechargeHubScreen;
