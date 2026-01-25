import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const WalletScreen = () => {
  const packages = [
    { id: '1', diamonds: 100, price: '$0.99' },
    { id: '2', diamonds: 500, price: '$4.49' },
    { id: '3', diamonds: 1200, price: '$9.99' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>1,200 Diamonds</Text>
      </View>

      <Text style={styles.sectionTitle}>Get More Diamonds</Text>
      <FlatList
        data={packages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.package}>
            <Text style={styles.packageText}>{item.diamonds} Diamonds</Text>
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8', padding: 20 },
  balanceCard: { backgroundColor: COLORS.primary, padding: 30, borderRadius: 20, alignItems: 'center', marginBottom: 30 },
  balanceLabel: { color: COLORS.white, opacity: 0.8, fontSize: 16 },
  balanceValue: { color: COLORS.white, fontSize: 32, fontWeight: 'bold', marginTop: 5 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  package: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 20, borderRadius: 15, marginBottom: 15 },
  packageText: { fontSize: 18, fontWeight: '500' },
  priceTag: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  priceText: { color: COLORS.primary, fontWeight: 'bold' },
});
export default WalletScreen;
