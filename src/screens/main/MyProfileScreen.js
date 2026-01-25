import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Settings, CreditCard, Award, ChevronRight } from 'lucide-react-native';

const MyProfileScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>John Doe</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Wallet')}>
          <CreditCard color={COLORS.primary} size={24} />
          <Text style={styles.statValue}>1,200</Text>
          <Text style={styles.statLabel}>Diamonds</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('VIPStore')}>
          <Award color="#FFD700" size={24} />
          <Text style={styles.statValue}>VIP</Text>
          <Text style={styles.statLabel}>Status</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menu}>
        {[
          { icon: <Settings size={20} />, label: 'Settings', screen: 'Settings' },
          { icon: <CreditCard size={20} />, label: 'Wallet', screen: 'Wallet' },
          { icon: <Award size={20} />, label: 'VIP Store', screen: 'VIPStore' },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { alignItems: 'center', paddingVertical: 40, backgroundColor: COLORS.white },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEE', marginBottom: 15 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  editButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  editButtonText: { color: COLORS.textSecondary },
  stats: { flexDirection: 'row', backgroundColor: COLORS.white, marginTop: 10, paddingVertical: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  menu: { marginTop: 10, backgroundColor: COLORS.white },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { marginLeft: 15, fontSize: 16 },
});
export default MyProfileScreen;
