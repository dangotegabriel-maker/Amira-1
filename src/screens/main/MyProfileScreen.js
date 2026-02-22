import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins, Gift, ArrowUpCircle, User as UserIcon, X, DollarSign, Wallet } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { getGiftAsset } from '../../services/giftingService';
import { hapticService } from '../../services/hapticService';
import { useIsFocused } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import VIPBadge from '../../components/VIPBadge';
import GlowAvatar from '../../components/GlowAvatar';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const { user, loading, isMale } = useUser();

  const [balance, setBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [todayDiamonds, setTodayDiamonds] = useState(0);
  const [wealthXP, setWealthXP] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upvotes, setUpvotes] = useState(0);
  const [totalReceivedCount, setTotalReceivedCount] = useState(0);
  const [receivedGifts, setReceivedGifts] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (isFocused && user) {
      loadData();
      if (!user.gender) {
        navigation.navigate('GenderSetup');
      }
    }
  }, [isFocused, user]);

  const loadData = async () => {
    const b = await ledgerService.getBalance();
    const s = await ledgerService.getTotalSpent();
    const u = await ledgerService.getUpvotes();
    const trc = await ledgerService.getTotalGiftsReceived();
    const r = await ledgerService.getReceivedGifts();
    const db = await ledgerService.getDiamondBalance();
    const td = await ledgerService.getTodayDiamonds();
    const xp = await ledgerService.getWealthXP();

    setBalance(b);
    setTotalSpent(s);
    setUpvotes(u);
    setTotalReceivedCount(trc);
    setReceivedGifts(r);
    setDiamondBalance(db);
    setTodayDiamonds(td);
    setWealthXP(xp);
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );

  if (!user) return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Error: Profile not found. Please re-login.</Text>
    </View>
  );

  const trophyData = Object.entries(receivedGifts).map(([id, count]) => {
    const asset = getGiftAsset(id);
    return { id, count, name: asset?.name || 'Gift' };
  });

  const tier = ledgerService.getTier(wealthXP);

  const menuItems = [
    { icon: <Award size={20} color="#FFD700" />, label: 'Global Leaderboard', screen: 'Leaderboard' },
    { icon: <Gift size={20} color={COLORS.primary} />, label: isMale ? 'Gifts Sent' : 'My Gift Cabinet', screen: 'GiftLedger', params: { type: isMale ? 'sent' : 'received' } },
    ...(isMale ? [{ icon: <Coins size={20} color="#FFD700" />, label: 'Recharge Hub', screen: 'RechargeHub' }] : []),
    { icon: <Award size={20} color={COLORS.primary} />, label: 'VIP Store', screen: 'VIPStore' },
    { icon: <Settings size={20} color="#666" />, label: 'Settings', screen: 'Settings' },
    { icon: <Award size={20} color={COLORS.secondary} />, label: 'Help & Support', screen: 'HelpSupport' },
  ];

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <GlowAvatar size={100} isOnline={true} xp={isMale ? wealthXP : 0}>
             <Image source={user.photos?.[0]} style={styles.profileImg} />
          </GlowAvatar>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{user.name || 'Amira User'}</Text>
          <VIPBadge totalSpent={totalSpent} />
        </View>
        {isMale && <Text style={styles.tierName}>{tier.name} Rank</Text>}
        <Text style={styles.bio}>{user.bio || 'No bio yet'}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => { hapticService.lightImpact(); navigation.navigate('EditProfile'); }}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dashboard}>
        <TouchableOpacity style={styles.dashItem} onPress={() => navigation.navigate('GiftLedger', { type: 'received' })}>
          <Gift color={COLORS.primary} size={24} />
          <Text style={styles.dashValue}>{isMale ? totalReceivedCount : diamondBalance}</Text>
          <Text style={styles.dashLabel}>{isMale ? 'Gifts Received' : 'Diamond Balance'}</Text>
        </TouchableOpacity>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#4CD964" size={24} />
          <Text style={styles.dashValue}>{upvotes}</Text>
          <Text style={styles.dashLabel}>Upvotes</Text>
        </View>
        <TouchableOpacity style={styles.dashItem} onPress={() => navigation.navigate('GiftLedger', { type: 'sent' })}>
          <ArrowUpCircle color="#007AFF" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.dashValue}>{isMale ? wealthXP : totalSpent}</Text>
          <Text style={styles.dashLabel}>{isMale ? 'Total Contributed' : 'Gifts Sent'}</Text>
        </TouchableOpacity>
      </View>

      {!isMale && (
        <View style={styles.portfolioContainer}>
           <Text style={styles.sectionTitle}>Earnings Portfolio</Text>
           <View style={styles.portfolioCard}>
              <View style={styles.portfolioRow}>
                 <View>
                    <Text style={styles.portLabel}>Today's Diamonds</Text>
                    <Text style={styles.portValue}>💎 {todayDiamonds}</Text>
                 </View>
                 <View>
                    <Text style={styles.portLabel}>Total Diamonds</Text>
                    <Text style={styles.portValue}>💎 {diamondBalance}</Text>
                 </View>
              </View>
              <View style={styles.usdRow}>
                 <Text style={styles.usdLabel}>Estimated USD Value</Text>
                 <Text style={styles.usdValue}>${(diamondBalance * 0.05).toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.withdrawAction}
                onPress={() => { hapticService.mediumImpact(); navigation.navigate('Withdrawal'); }}
              >
                 <Wallet color="white" size={18} />
                 <Text style={styles.withdrawActionText}>Withdraw Earnings</Text>
              </TouchableOpacity>
           </View>
        </View>
      )}

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
            <Text style={styles.emptyTrophyText}>No gifts received yet.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.label}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { hapticService.lightImpact(); navigation.navigate(item.screen, item.params); }}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.white },
  avatarContainer: { marginBottom: 15 },
  profileImg: { width: 100, height: 100, borderRadius: 50 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
  tierName: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5 },
  bio: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15, paddingHorizontal: 40, textAlign: 'center' },
  editButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  editButtonText: { color: COLORS.textSecondary },
  dashboard: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 20, marginTop: 10 },
  dashItem: { flex: 1, alignItems: 'center' },
  dashValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  dashLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },
  portfolioContainer: { backgroundColor: 'white', marginTop: 10, paddingVertical: 20 },
  portfolioCard: { backgroundColor: '#1A1A1A', marginHorizontal: 20, borderRadius: 20, padding: 20, elevation: 5 },
  portfolioRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  portLabel: { color: '#888', fontSize: 12, marginBottom: 5 },
  portValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  usdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  usdLabel: { color: '#888', fontSize: 14 },
  usdValue: { color: '#4CD964', fontSize: 20, fontWeight: 'bold' },
  withdrawAction: { backgroundColor: COLORS.primary, height: 45, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  withdrawActionText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  trophySection: { marginTop: 10, backgroundColor: COLORS.white, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 15 },
  trophyCabinet: { flexDirection: 'row' },
  trophyItem: { alignItems: 'center', marginRight: 20, width: 80 },
  trophyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  trophyCount: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  trophyName: { fontSize: 12, color: COLORS.textSecondary },
  emptyTrophyText: { color: COLORS.textSecondary, fontStyle: 'italic' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', backgroundColor: 'white' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { marginLeft: 15, fontSize: 16, fontWeight: '500', color: COLORS.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.primary, fontSize: 16, textAlign: 'center' }
});

export default MyProfileScreen;
