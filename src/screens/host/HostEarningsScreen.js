import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';

const HostEarningsScreen = () => {
  const { user } = useUser();
  const currency = user?.wallet?.currency || 'GHS';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.value}>{currency} {(user?.wallet?.balance || 0).toLocaleString()}</Text>
        <Text style={styles.note}>Payout processing will be added in a future release.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 22 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24 },
  label: { color: COLORS.textSecondary, fontSize: 15 },
  value: { color: COLORS.text, fontSize: 32, fontWeight: '900', marginTop: 8 },
  note: { color: COLORS.textSecondary, marginTop: 20, lineHeight: 20 },
});

export default HostEarningsScreen;
