import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const SettingsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Phone Number</Text>
          <Text style={styles.rowValue}>+234 801 234 5678</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>john@example.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>New Matches</Text>
          <Switch value={true} trackColor={{ true: COLORS.primary }} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Messages</Text>
          <Switch value={true} trackColor={{ true: COLORS.primary }} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  section: { marginTop: 20, backgroundColor: COLORS.white, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginVertical: 15, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16, color: COLORS.textSecondary },
  logoutButton: { marginTop: 40, padding: 20, alignItems: 'center' },
  logoutText: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold' },
});
export default SettingsScreen;
