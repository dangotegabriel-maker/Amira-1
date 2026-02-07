import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { getGiftAsset } from '../../services/giftingService';
import { useIsFocused } from '@react-navigation/native';
import VIPBadge from '../../components/VIPBadge';

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [balance, setBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [receivedGifts, setReceivedGifts] = useState({});

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    const b = await ledgerService.getBalance();
    const s = await ledgerService.getTotalSpent();
    const r = await ledgerService.getReceivedGifts();
    setBalance(b);
    setTotalSpent(s);
    setReceivedGifts(r);
  };

  const trophyData = Object.entries(receivedGifts).map(([id, count]) => {
    const asset = getGiftAsset(id);
    return { id, count, name: asset.name };
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} />
          <View style={styles.vipBadgeContainer}>
            <VIPBadge totalSpent={totalSpent} />
          </View>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>John Doe</Text>
          <VIPBadge totalSpent={totalSpent} />
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Wallet')}>
          <Coins color="#FFD700" size={24} />
          <Text style={styles.statValue}>{balance}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('VIPStore')}>
          <Award color="#FFD700" size={24} />
          <Text style={styles.statValue}>{totalSpent > 5000 ? 'Gold' : totalSpent > 1000 ? 'Silver' : 'Member'}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </TouchableOpacity>
      </View>

      {/* Trophy Cabinet */}
      <View style={styles.trophySection}>
        <Text style={styles.sectionTitle}>Trophy Cabinet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trophyCabinet}>
          {trophyData.length > 0 ? trophyData.map((item) => (
            <View key={item.id} style={styles.trophyItem}>
              <View style={styles.trophyIcon}>
                <Award color={COLORS.primary} size={32} />
              </View>
              <Text style={styles.trophyCount}>x{item.count}</Text>
              <Text style={styles.trophyName} numberOfLines={1}>{item.name || 'Gift'}</Text>
            </View>
          )) : (
            <Text style={styles.emptyTrophyText}>No gifts received yet. Start social flexing!</Text>
          )}
        </ScrollView>
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
  vipBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
  editButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  editButtonText: { color: COLORS.textSecondary },
  stats: { flexDirection: 'row', backgroundColor: COLORS.white, marginTop: 10, paddingVertical: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  trophySection: { marginTop: 10, backgroundColor: COLORS.white, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  trophyCabinet: { flexDirection: 'row' },
  trophyItem: { alignItems: 'center', marginRight: 20, width: 80 },
  trophyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  trophyCount: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  trophyName: { fontSize: 12, color: COLORS.textSecondary },
  emptyTrophyText: { color: COLORS.textSecondary, fontStyle: 'italic' },
  menu: { marginTop: 10, backgroundColor: COLORS.white },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { marginLeft: 15, fontSize: 16 },
});
export default MyProfileScreen;
