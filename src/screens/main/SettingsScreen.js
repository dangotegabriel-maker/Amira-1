import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { socketService } from '../../services/socketService';
import { authService } from '../../services/firebaseService';

const UnavailableRow = ({ label }) => (
  <View style={[styles.item, styles.disabled]} accessibilityLabel={`${label}, not available yet`} accessibilityState={{ disabled: true }}>
    <View><Text style={styles.itemText}>{label}</Text><Text style={styles.detail}>Not available yet</Text></View>
  </View>
);

const SettingsScreen = ({ navigation }) => {
  const handleLogout = () => Alert.alert('Logout', 'Are you sure you want to logout?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', onPress: async () => { await authService.signOut(); socketService.disconnect(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); } },
  ]);

  return <ScrollView style={styles.container}>
    <View style={styles.section}><Text style={styles.sectionTitle}>ACCOUNT</Text><View style={styles.itemList}><UnavailableRow label="Update Phone Number" /><UnavailableRow label="Email & Password" /></View></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>PRIVACY</Text><View style={styles.itemList}><TouchableOpacity accessibilityLabel="Open Blocked Users" style={styles.item} onPress={() => navigation.navigate('BlockedUsers')}><Text style={styles.itemText}>Block List</Text><ChevronRight color="#B5B5BC" size={20} /></TouchableOpacity></View></View>
    <TouchableOpacity accessibilityLabel="Logout" style={styles.logoutBtn} onPress={handleLogout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' }, section: { marginTop: 25 }, sectionTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginLeft: 20, marginBottom: 10 },
  itemList: { backgroundColor: 'white', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' }, item: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  disabled: { opacity: 0.62 }, itemText: { fontSize: 16, color: COLORS.text }, detail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }, logoutBtn: { backgroundColor: 'white', marginTop: 40, padding: 18, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' }, logoutText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 16 },
});

export default SettingsScreen;
