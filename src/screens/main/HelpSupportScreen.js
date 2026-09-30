import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { HelpCircle, MessageSquare, ShieldCheck } from 'lucide-react-native';

const HelpSupportScreen = () => {
  const sections = [
    { title: 'Frequently Asked Questions', icon: <HelpCircle color={COLORS.primary} size={24} /> },
    { title: 'Contact Live Support', icon: <MessageSquare color={COLORS.secondary} size={24} /> },
    { title: 'Safety & Privacy Guide', icon: <ShieldCheck color="#4CD964" size={24} /> },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>How can we assist you today?</Text>
      </View>

      <View style={styles.list}>
        {sections.map((item, index) => (
          <View key={index} style={styles.item} accessibilityLabel={`${item.title}, not available yet`} accessibilityState={{ disabled: true }}>
            <View style={styles.itemLeft}>
              {item.icon}
              <Text style={styles.itemText}>{item.title}</Text>
            </View>
            <Text>Not available yet</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { padding: 30, backgroundColor: COLORS.white, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5 },
  list: { marginTop: 20, backgroundColor: COLORS.white },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemText: { marginLeft: 15, fontSize: 16, fontWeight: '500', color: COLORS.text },
});

export default HelpSupportScreen;
