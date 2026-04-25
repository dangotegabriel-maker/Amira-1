// src/screens/main/PaymentScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft } from 'lucide-react-native';
import { paystackService } from '../../services/paystackService';
import PaystackWebView from '../../components/PaystackWebView';

const PaymentScreen = ({ route, navigation }) => {
  const { checkoutUrl, bundleId, coins, channels, currency, email } = route.params;
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;
    // console.log('WebView URL:', url);

    if (url.includes('checkout-success') || url.includes('done') || url.includes('callback')) {
      // Extract reference from URL (e.g. ?reference=ref_123 or ?trxref=ref_123)
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const reference = urlParams.get('reference') || urlParams.get('trxref') || 'simulated_ref';

      setVerifying(true);
      try {
        const verification = await paystackService.verifyTransaction(reference);
        if (verification.status === 'success') {
          navigation.navigate('RechargeHub', { paymentStatus: 'success', bundleId, coins });
        } else {
          navigation.navigate('RechargeHub', { paymentStatus: 'failed' });
        }
      } catch (error) {
        navigation.navigate('RechargeHub', { paymentStatus: 'failed' });
      } finally {
        setVerifying(false);
      }
    } else if (url.includes('cancel') || url.includes('fail')) {
      navigation.navigate('RechargeHub', { paymentStatus: 'failed' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.webviewContainer}>
        <PaystackWebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          email={email}
        />
      </View>

      {verifying && (
        <View style={styles.verifyingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.verifyingText}>Verifying Transaction...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  webviewContainer: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  verifyingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  }
});

export default PaymentScreen;
