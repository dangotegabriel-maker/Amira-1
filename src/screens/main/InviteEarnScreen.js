import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';

const InviteEarnScreen = () => (
  <View style={styles.container} accessibilityLabel="Referral rewards unavailable">
    <View style={styles.icon}><Users color={COLORS.primary} size={38} /></View>
    <Text style={styles.title}>Invite & Earn</Text>
    <Text style={styles.body}>Referral rewards are not available yet.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '900', marginTop: 18 },
  body: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 23, marginTop: 10, textAlign: 'center' },
});

export default InviteEarnScreen;
