// src/screens/main/PaymentMethodScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, Smartphone, CreditCard, ChevronRight } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const PaymentMethodScreen = ({ route, navigation }) => {
  const { bundleId, coins, amount } = route.params;
  const { user } = useUser();

  const getCurrency = (countryCode) => {
    switch (countryCode) {
      case 'GH': return 'GHS';
      case 'NG': return 'NGN';
      case 'KE': return 'KES';
      case 'ZA': return 'ZAR';
      default: return 'USD';
    }
  };

  const currency = getCurrency(user?.country_code);

  const handleSelect = (method) => {
    let channels = ['card'];
    if (method === 'momo') {
      channels = ['mobile_money'];
    } else if (method === 'card') {
      channels = ['card'];
    }

    // Use dynamic public key from env
    const publicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

    // Mock Paystack Checkout URL generation logic
    const mockPaystackUrl = `https://checkout.paystack.com/mock-${method}-${currency}-${bundleId}?key=${publicKey}`;

    navigation.navigate('Payment', {
      checkoutUrl: mockPaystackUrl,
      bundleId,
      coins,
      channels,
      currency
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose how to pay</Text>
        <Text style={styles.subtitle}>Pay {amount} in {currency} for {coins} coins</Text>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => handleSelect('momo')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
            <Smartphone color="#0288D1" size={28} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Mobile Money</Text>
            <Text style={styles.methodDesc}>MTN MoMo, Telecel Cash, AT Money</Text>
          </View>
          <ChevronRight color="#CCC" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => handleSelect('card')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
            <CreditCard color="#7B1FA2" size={28} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Credit / Debit Card</Text>
            <Text style={styles.methodDesc}>Visa, Mastercard, American Express</Text>
          </View>
          <ChevronRight color="#CCC" size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 30 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: { flex: 1, marginLeft: 15 },
  methodName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  methodDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default PaymentMethodScreen;
