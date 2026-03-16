// src/screens/main/WithdrawalScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal, FlatList } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, DollarSign, CreditCard, Smartphone, Landmark, CheckCircle2, History } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { hapticService } from '../../services/hapticService';

const MIN_WITHDRAWAL = 500;

const WithdrawalScreen = ({ navigation }) => {
  const [diamonds, setDiamonds] = useState(0);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('MTN MoMo');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await ledgerService.getDiamondBalance();
    setDiamonds(db);
    const h = await ledgerService.getWithdrawalHistory();
    setHistory(h || []);
  };

  const validateGhanaMoMo = (num) => {
    const regex = /^(024|054|055|059|027|057|026|056|020|050)\d{7}$/;
    return regex.test(num);
  };

  const handleInitialSubmit = () => {
    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount < MIN_WITHDRAWAL) {
      Alert.alert("Min Withdrawal", `Minimum withdrawal is ${MIN_WITHDRAWAL} diamonds.`);
      return;
    }

    if (withdrawAmount > diamonds) {
      Alert.alert("Insufficient Balance", "You don't have enough diamonds.");
      return;
    }

    if (!accountName || !accountNumber) {
      Alert.alert("Missing Info", "Please provide account details.");
      return;
    }

    if (provider !== 'Bank Transfer' && !validateGhanaMoMo(accountNumber)) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit Ghana MoMo number (e.g., 024XXXXXXX).");
      return;
    }

    setShowConfirm(true);
  };

  const processWithdrawal = async () => {
    const withdrawAmount = parseInt(amount);
    try {
      await ledgerService.withdrawDiamonds(withdrawAmount, {
        provider,
        accountNumber,
        accountName,
        status: 'Pending'
      });
      hapticService.success();
      setShowConfirm(false);
      Alert.alert("Request Sent", "Your withdrawal request is pending approval.");
      loadData();
      setAmount('');
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const renderHistoryItem = (item, idx) => (
    <View key={idx} style={styles.historyItem}>
       <View>
          <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
          <Text style={styles.historyMethod}>{item.provider}</Text>
       </View>
       <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.historyAmount}>💎 {item.amount}</Text>
          <Text style={[styles.historyStatus, { color: item.status === 'Success' ? '#4CD964' : '#FF9500' }]}>{item.status}</Text>
       </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
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

        <View style={styles.form}>
           <Text style={styles.sectionTitle}>Withdrawal Details</Text>

           <Text style={styles.inputLabel}>Select Provider</Text>
           <View style={styles.providerRow}>
              {['MTN MoMo', 'Telecel Cash', 'AT Money', 'Bank Transfer'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.providerBtn, provider === p && styles.providerActive]}
                  onPress={() => setProvider(p)}
                >
                   <Text style={[styles.providerText, provider === p && styles.providerTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
           </View>

           <Text style={styles.inputLabel}>Account Name</Text>
           <TextInput
             style={styles.input}
             placeholder="Full Name on Account"
             value={accountName}
             onChangeText={setAccountName}
           />

           <Text style={styles.inputLabel}>{provider === 'Bank Transfer' ? 'Account Number' : 'Phone Number'}</Text>
           <TextInput
             style={styles.input}
             placeholder={provider === 'Bank Transfer' ? 'Bank Account Number' : '024XXXXXXX'}
             keyboardType="numeric"
             value={accountNumber}
             onChangeText={setAccountNumber}
           />

           <Text style={styles.inputLabel}>Amount (Min. 500)</Text>
           <TextInput
             style={styles.input}
             placeholder="500"
             keyboardType="numeric"
             value={amount}
             onChangeText={setAmount}
           />
           <Text style={styles.minNotice}>Minimum withdrawal: 500 Diamonds</Text>
        </View>

        <TouchableOpacity style={styles.withdrawButton} onPress={handleInitialSubmit}>
           <CheckCircle2 color="white" size={20} />
           <Text style={styles.withdrawText}>Submit Request</Text>
        </TouchableOpacity>

        <View style={styles.historySection}>
           <View style={styles.historyHeader}>
              <History size={18} color={COLORS.textSecondary} />
              <Text style={styles.historyTitle}>Transaction History</Text>
           </View>
           {history.length > 0 ? (
             history.map((item, idx) => renderHistoryItem(item, idx))
           ) : (
             <Text style={styles.emptyHistory}>No withdrawal requests yet.</Text>
           )}
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Confirm Withdrawal</Text>
               <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Amount:</Text>
                  <Text style={styles.confirmValue}>💎 {amount}</Text>
               </View>
               <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>To:</Text>
                  <Text style={styles.confirmValue}>{provider}</Text>
               </View>
               <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Account:</Text>
                  <Text style={styles.confirmValue}>{accountNumber}</Text>
               </View>

               <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
                     <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={processWithdrawal}>
                     <Text style={styles.confirmBtnText}>Confirm</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white' },
  title: { fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: COLORS.primary, margin: 20, padding: 25, borderRadius: 20, alignItems: 'center', elevation: 5 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 5 },
  balanceValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  cashValue: { color: 'white', fontSize: 16, marginTop: 10, fontWeight: '500' },
  form: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 8, marginTop: 15 },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  providerBtn: { width: '48%', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  providerActive: { borderColor: COLORS.primary, backgroundColor: '#FFF5F7' },
  providerText: { fontSize: 14, color: COLORS.textSecondary },
  providerTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#EEE' },
  minNotice: { fontSize: 12, color: COLORS.textSecondary, marginTop: 5 },
  withdrawButton: { backgroundColor: '#111', margin: 20, height: 55, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  withdrawText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  historySection: { marginTop: 10, paddingHorizontal: 20 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  historyTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.textSecondary, marginLeft: 8 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  historyDate: { fontSize: 13, color: COLORS.textSecondary },
  historyMethod: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  historyStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  emptyHistory: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 },
  confirmLabel: { color: COLORS.textSecondary, fontSize: 15 },
  confirmValue: { fontWeight: 'bold', fontSize: 15, color: COLORS.text },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: 'bold' }
});

export default WithdrawalScreen;
