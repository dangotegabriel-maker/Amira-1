import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Settings, CreditCard, Award, ChevronRight, Coins } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { useIsFocused } from '@react-navigation/native';

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (isFocused) {
      loadBalance();
    }
  }, [isFocused]);

  const loadBalance = async () => {
    const b = await ledgerService.getBalance();
    setBalance(b);
  };
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} />
          <View style={styles.vipBadge}>
            <Award color="#FFF" size={14} />
            <Text style={styles.vipBadgeText}>VIP</Text>
          </View>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>John Doe</Text>
          <Award color="#FFD700" size={20} fill="#FFD700" />
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('RechargeHub')}>
          <Coins color="#FFD700" size={24} />
          <Text style={styles.statValue}>{balance}</Text>
          <Text style={styles.statLabel}>Coins</Text>
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
          { icon: <Coins size={20} />, label: 'Recharge Hub', screen: 'RechargeHub' },
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
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEE' },
  vipBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white
  },
  vipBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold', marginLeft: 2 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
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
