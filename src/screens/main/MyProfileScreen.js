import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins, Gift, ArrowUpCircle, Eye, Clock } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { getGiftAsset } from '../../services/giftingService';
import { useIsFocused } from '@react-navigation/native';
import VIPBadge from '../../components/VIPBadge';
import GiftingLeaderboard from '../../components/GiftingLeaderboard';
import GlowAvatar from '../../components/GlowAvatar';

const { width } = Dimensions.get('window');

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [balance, setBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upvotes, setUpvotes] = useState(0);
  const [totalReceivedCount, setTotalReceivedCount] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [receivedGifts, setReceivedGifts] = useState({});

  const [visitors, setVisitors] = useState([
    { id: '1', name: 'Jessica', time: '2m ago', isOnline: true },
    { id: '2', name: 'Mark', time: '15m ago', isOnline: false },
    { id: '3', name: 'Sarah', time: '1h ago', isOnline: true },
    { id: '4', name: 'David', time: '3h ago', isOnline: false },
  ]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    const b = await ledgerService.getBalance();
    const s = await ledgerService.getTotalSpent();
    const u = await ledgerService.getUpvotes();
    const trc = await ledgerService.getTotalGiftsReceived();
    const v = await ledgerService.getProfileViews();
    const r = await ledgerService.getReceivedGifts();

    setBalance(b);
    setTotalSpent(s);
    setUpvotes(u);
    setTotalReceivedCount(trc);
    setProfileViews(v);
    setReceivedGifts(r);
  };

  const trophyData = Object.entries(receivedGifts).map(([id, count]) => {
    const asset = getGiftAsset(id);
    return { id, count, name: asset.name };
  });

  const renderHeader = () => (
    <View>
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
        <Text style={styles.bio}>Lover of luxury and high-stakes social flexing. 🥂</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dashboard}>
        <View style={styles.dashItem}>
          <Gift color={COLORS.primary} size={24} />
          <Text style={styles.dashValue}>{totalReceivedCount}</Text>
          <Text style={styles.dashLabel}>Gifts Received</Text>
        </View>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#4CD964" size={24} />
          <Text style={styles.dashValue}>{upvotes}</Text>
          <Text style={styles.dashLabel}>Upvotes</Text>
        </View>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#007AFF" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.dashValue}>{totalSpent}</Text>
          <Text style={styles.dashLabel}>Gifts Sent</Text>
        </View>
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

      {/* Visitor Log Section */}
      <View style={styles.visitorSection}>
         <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Who Viewed Me</Text>
            <View style={styles.viewCountBadge}>
               <Eye color="white" size={12} />
               <Text style={styles.viewCountText}>{profileViews}</Text>
            </View>
         </View>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visitorList}>
            {visitors.map(visitor => (
              <TouchableOpacity
                key={visitor.id}
                style={styles.visitorItem}
                onPress={() => navigation.navigate('UserProfile', { userId: visitor.id, name: visitor.name, isOnline: visitor.isOnline })}
              >
                <GlowAvatar size={50} isOnline={visitor.isOnline} />
                <Text style={styles.visitorName} numberOfLines={1}>{visitor.name}</Text>
                <View style={styles.timeRow}>
                   <Clock size={10} color="#999" />
                   <Text style={styles.visitorTime}>{visitor.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
         </ScrollView>
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

      <View style={{ paddingHorizontal: 10 }}>
         <Text style={styles.sectionTitle}>Top Gifters</Text>
         <GiftingLeaderboard />
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
      <View style={{ height: 50 }} />
    </View>
  );

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={renderHeader}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.white },
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
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
  bio: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15, paddingHorizontal: 40, textAlign: 'center' },
  editButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  editButtonText: { color: COLORS.textSecondary },

  dashboard: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 20 },
  dashItem: { flex: 1, alignItems: 'center' },
  dashValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  dashLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },

  stats: { flexDirection: 'row', backgroundColor: COLORS.white, marginTop: 10, paddingVertical: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },

  visitorSection: { marginTop: 10, backgroundColor: COLORS.white, paddingVertical: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  viewCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  viewCountText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  visitorList: { paddingHorizontal: 20 },
  visitorItem: { alignItems: 'center', marginRight: 20, width: 60 },
  visitorName: { fontSize: 11, color: COLORS.text, marginTop: 8, fontWeight: '500' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  visitorTime: { fontSize: 9, color: '#999', marginLeft: 3 },

  trophySection: { marginTop: 10, backgroundColor: COLORS.white, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 10, marginTop: 10 },
  trophyCabinet: { flexDirection: 'row' },
  trophyItem: { alignItems: 'center', marginRight: 20, width: 80 },
  trophyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  trophyCount: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  trophyName: { fontSize: 12, color: COLORS.textSecondary },
  emptyTrophyText: { color: COLORS.textSecondary, fontStyle: 'italic' },

  menu: { marginTop: 20, backgroundColor: COLORS.white },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { marginLeft: 15, fontSize: 16 },
});
export default MyProfileScreen;
