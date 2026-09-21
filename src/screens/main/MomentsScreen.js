import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Images } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';

const MomentsScreen = () => (
  <View style={styles.container} accessibilityLabel="Moments unavailable">
    <View style={styles.header}><Text style={styles.title}>Moments</Text></View>
    <View style={styles.content}>
      <View style={styles.icon}><Images color={COLORS.primary} size={34} /></View>
      <Text style={styles.heading}>Moments are not available yet</Text>
      <Text style={styles.body}>Moments from Hosts will appear here when this feature becomes available.</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: 'white' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 90 },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center' },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 18, textAlign: 'center' },
  body: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 9, textAlign: 'center' },
});

export default MomentsScreen;
