// src/screens/main/RechargeHubScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Coins, ChevronLeft } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';

const TIERS = [
  { id: '1', coins: 100, price: '$0.99' },
  { id: '2', coins: 500, price: '$4.49' },
  { id: '3', coins: 1200, price: '$9.99' },
  { id: '4', coins: 2500, price: '$19.99' },
  { id: '5', coins: 6500, price: '$49.99' },
  { id: '6', coins: 15000, price: '$99.99' },
];

const RechargeHubScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const b = await ledgerService.getBalance();
    setBalance(b);
  };

  const handlePurchase = async (tier) => {
    Alert.alert(
      "Confirm Purchase",
      `Buy ${tier.coins} coins for ${tier.price}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: async () => {
            await ledgerService.buyCoins(tier.coins, tier.id);
            loadBalance();
            Alert.alert("Success", "Coins added to your account.");
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharge Hub</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.balanceSection}>
        <Coins color="#FFD700" size={48} />
        <Text style={styles.balanceValue}>{balance}</Text>
        <Text style={styles.balanceLabel}>Current Coin Balance</Text>
      </View>

      <FlatList
        data={TIERS}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tierCard}
            onPress={() => handlePurchase(item)}
          >
            <Coins color="#FFD700" size={24} />
            <Text style={styles.tierCoins}>{item.coins}</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    height: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  balanceSection: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 10
  },
  balanceValue: { fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
  balanceLabel: { color: COLORS.textSecondary, fontSize: 16 },
  listContent: { padding: 10 },
  tierCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    margin: 8,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tierCoins: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  priceBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20
  },
  priceText: { color: COLORS.white, fontWeight: 'bold' }
});

export default RechargeHubScreen;
