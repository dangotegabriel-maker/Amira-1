import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Plus, Wallet } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';

const WalletScreen = () => {
  const { user } = useUser();
  const [adding, setAdding] = useState(false);
  const balance = user?.wallet?.balance || 0;
  const currency = user?.wallet?.currency || 'GHS';

  const addTestBalance = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await dbService.topUpWallet(100);
      Alert.alert('Test top-up complete', `100 ${currency} was added to your wallet.`);
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      Alert.alert('Top-up failed', 'Could not update your wallet.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <View style={styles.balanceCard}>
        <Wallet color={COLORS.white} size={28} />
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balanceValue}>{currency} {balance.toLocaleString()}</Text>
      </View>

      <TouchableOpacity style={styles.topUpButton} onPress={addTestBalance} disabled={adding}>
        {adding ? <ActivityIndicator color={COLORS.white} /> : <Plus color={COLORS.white} size={20} />}
        <Text style={styles.topUpText}>{adding ? 'Adding...' : 'Add 100 (Test Mode)'}</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Manual top-up is enabled for testing. Payment integration is intentionally disabled.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 22 },
  balanceCard: { backgroundColor: COLORS.primary, padding: 28, borderRadius: 22, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 12 },
  balanceValue: { color: COLORS.white, fontSize: 34, fontWeight: '900', marginTop: 6 },
  topUpButton: { minHeight: 54, borderRadius: 27, backgroundColor: COLORS.text, marginTop: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  topUpText: { color: COLORS.white, fontSize: 16, fontWeight: '800', marginLeft: 8 },
  note: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 16 },
});

export default WalletScreen;
