// src/screens/main/WithdrawalScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, DollarSign, CreditCard } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { hapticService } from '../../services/hapticService';

const WithdrawalScreen = ({ navigation }) => {
  const [diamonds, setDiamonds] = useState(0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PayPal');

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const db = await ledgerService.getDiamondBalance();
    setDiamonds(db);
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    if (withdrawAmount > diamonds) {
      Alert.alert("Error", "Insufficient diamond balance.");
      return;
    }

    try {
      await ledgerService.withdrawDiamonds(withdrawAmount, method);
      hapticService.success();
      Alert.alert("Success", `Withdrawal request for ${withdrawAmount} diamonds sent via ${method}.`);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>Withdraw Earnings</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.card}>
         <Text style={styles.balanceLabel}>Available Diamonds</Text>
         <Text style={styles.balanceValue}>💎 {diamonds.toLocaleString()}</Text>
         <Text style={styles.cashValue}>Estimated: ${(diamonds * 0.05).toFixed(2)}</Text>
      </View>

      <View style={styles.inputSection}>
         <Text style={styles.inputLabel}>Enter Diamonds to Withdraw</Text>
         <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
         </View>
         <Text style={styles.conversionText}>You will receive: ${(parseInt(amount || 0) * 0.05).toFixed(2)}</Text>
      </View>

      <View style={styles.methodSection}>
         <Text style={styles.inputLabel}>Withdrawal Method</Text>
         {['PayPal', 'Bank Transfer', 'Paystack'].map(m => (
           <TouchableOpacity
             key={m}
             style={[styles.methodItem, method === m && styles.methodActive]}
             onPress={() => { hapticService.lightImpact(); setMethod(m); }}
           >
              <CreditCard color={method === m ? COLORS.primary : '#999'} size={20} />
              <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m}</Text>
           </TouchableOpacity>
         ))}
      </View>

      <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
         <DollarSign color="white" size={20} />
         <Text style={styles.withdrawText}>Confirm Withdrawal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white' },
  title: { fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: COLORS.primary, margin: 20, padding: 25, borderRadius: 20, alignItems: 'center', elevation: 5 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 5 },
  balanceValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  cashValue: { color: 'white', fontSize: 16, marginTop: 10, fontWeight: '500' },
  inputSection: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  inputWrapper: { backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 55, justifyContent: 'center', borderWidth: 1, borderColor: '#EEE' },
  input: { fontSize: 18, fontWeight: 'bold' },
  conversionText: { marginTop: 10, color: '#4CD964', fontWeight: 'bold' },
  methodSection: { paddingHorizontal: 20 },
  methodItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  methodActive: { borderColor: COLORS.primary, backgroundColor: '#FFF5F7' },
  methodText: { marginLeft: 15, fontSize: 16, color: '#666' },
  methodTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  withdrawButton: { backgroundColor: '#111', margin: 20, height: 55, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  withdrawText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
});

export default WithdrawalScreen;
