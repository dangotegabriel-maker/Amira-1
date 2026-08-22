// src/screens/main/RechargeHubScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Button, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Coins, ChevronLeft } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';
import { DEV_FEATURES } from '../../config/devFeatures';

const RechargeHubScreen = ({ navigation }) => {
  const [userCoins, setUserCoins] = useState(0);
  const [isAddingCoins, setIsAddingCoins] = useState(false);
  const isFocused = useIsFocused();
  const { fetchUserCoins } = useUser();

  useEffect(() => {
    if (isFocused) {
      fetchCoins();
    }
  }, [isFocused]);

  const fetchCoins = async () => {
    try {
      const coins = await fetchUserCoins();
      setUserCoins(coins);
      console.log('WALLET BALANCE:', coins);
    } catch (error) {
      console.log('COIN FETCH ERROR:', error);
    }
  };

  const addTestCoins = async () => {
    if (isAddingCoins) return;
    setIsAddingCoins(true);
    try {
      await dbService.topUpWallet(100);

      await fetchCoins();
      await fetchUserCoins();
      Alert.alert('100 coins added (test mode)');
    } catch (error) {
      console.log('COIN ERROR:', error);
      Alert.alert('Failed to add coins');
    } finally {
      setIsAddingCoins(false);
    }
  };

  // Paystack purchase trigger disabled for local coin top-up testing.
  // const handlePurchase = async (bundle) => {
  //   navigation.navigate('PaymentMethod', {
  //     bundleId: bundle.id,
  //     coins: bundle.coins,
  //     amount: bundle.price
  //   });
  // };

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
        <Text>Coins: {userCoins}</Text>
        <View style={styles.balanceValueContainer}>
          <Coins color="#FFD700" size={24} />
          <Text style={styles.balanceValue}>{userCoins}</Text>
        </View>
      </View>

      {DEV_FEATURES.enableTestTopUps && <View style={styles.testButtonContainer}>
        {isAddingCoins ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Button title="Add 100 Coins (Test)" onPress={addTestCoins} />
        )}
      </View>}
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
  testButtonContainer: { marginHorizontal: 15, marginTop: 20 }
});

export default RechargeHubScreen;
