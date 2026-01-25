import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Check } from 'lucide-react-native';

const VIPStoreScreen = () => {
  const benefits = [
    'Unlimited Swipes',
    'See who likes you',
    '5 Super Likes daily',
    'Passport to any location',
    'No Ads',
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Go Premium</Text>
        <Text style={styles.subtitle}>Unlock exclusive features</Text>
      </View>

      <View style={styles.benefitsCard}>
        {benefits.map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <Check color={COLORS.primary} size={20} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.subscribeButton}>
        <Text style={styles.subscribeText}>Subscribe Now - $9.99/mo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8', padding: 20 },
  header: { alignItems: 'center', marginVertical: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.black },
  subtitle: { fontSize: 18, color: COLORS.textSecondary, marginTop: 10 },
  benefitsCard: { backgroundColor: COLORS.white, padding: 25, borderRadius: 20, marginBottom: 40 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  benefitText: { marginLeft: 15, fontSize: 16, color: COLORS.text },
  subscribeButton: { backgroundColor: COLORS.primary, padding: 20, borderRadius: 30, alignItems: 'center' },
  subscribeText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});
export default VIPStoreScreen;
