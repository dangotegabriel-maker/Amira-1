import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins, Gift, Wallet, Image as ImageIcon, HelpCircle, History, Clock } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { getGiftAsset } from '../../services/giftingService';
import { hapticService } from '../../services/hapticService';
import { useIsFocused } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import GlowAvatar from '../../components/GlowAvatar';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const { user, loading, isMale } = useUser();

  const [balance, setBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [wealthXP, setWealthXP] = useState(0);
  const [receivedGifts, setReceivedGifts] = useState({});

  useEffect(() => {
    if (isFocused && user) {
      loadStats();
    }
  }, [isFocused, user]);

  const loadStats = async () => {
    const b = await ledgerService.getBalance();
    const r = await ledgerService.getReceivedGifts();
    const db = await ledgerService.getDiamondBalance();
    const xp = await ledgerService.getWealthXP();
    setBalance(b);
    setReceivedGifts(r);
    setDiamondBalance(db);
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

  const menuItems = [
    { icon: <Award size={22} color="#FFD700" />, label: 'Global Leaderboard', screen: 'Leaderboard' },
    { icon: <ImageIcon size={22} color={COLORS.secondary} />, label: 'My Gallery', screen: 'PhotoUpload' },
    { icon: <Settings size={22} color="#666" />, label: 'Settings', screen: 'Settings' },
    { icon: <HelpCircle size={22} color={COLORS.primary} />, label: 'Help & Support', screen: 'HelpSupport' },
  ];

  const renderPrivateDashboard = () => {
    if (isMale) {
      return (
        <View style={styles.dashboard}>
           <TouchableOpacity style={styles.dashCard} onPress={() => navigation.navigate('Wallet')}>
              <Wallet color="#FFD700" size={28} />
              <View style={styles.dashText}>
                 <Text style={styles.dashLabel}>My Wallet</Text>
                 <Text style={styles.dashValue}>{balance} 🪙</Text>
              </View>
              <TouchableOpacity style={styles.rechargeSmall} onPress={() => navigation.navigate('RechargeHub')}>
                 <Text style={styles.rechargeSmallText}>Top Up</Text>
              </TouchableOpacity>
           </TouchableOpacity>

           <TouchableOpacity style={styles.dashCard} onPress={() => navigation.navigate('VIPStore')}>
              <Award color={COLORS.primary} size={28} />
              <View style={styles.dashText}>
                 <Text style={styles.dashLabel}>VIP Store</Text>
                 <Text style={styles.dashValue}>Get Aura & Effects</Text>
              </View>
              <ChevronRight color="#CCC" size={20} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.dashCard} onPress={() => navigation.navigate('GiftLedger', { type: 'sent' })}>
              <History color={COLORS.secondary} size={28} />
              <View style={styles.dashText}>
                 <Text style={styles.dashLabel}>Gift History</Text>
                 <Text style={styles.dashValue}>View Sent Gifts</Text>
              </View>
              <ChevronRight color="#CCC" size={20} />
           </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.dashboard}>
           <TouchableOpacity style={styles.dashCard} onPress={() => navigation.navigate('Withdrawal')}>
              <Wallet color="#4CD964" size={28} />
              <View style={styles.dashText}>
                 <Text style={styles.dashLabel}>My Earnings</Text>
                 <Text style={styles.dashValue}>💎 {diamondBalance}</Text>
              </View>
              <TouchableOpacity style={styles.withdrawSmall} onPress={() => navigation.navigate('Withdrawal')}>
                 <Text style={styles.rechargeSmallText}>Withdraw</Text>
              </TouchableOpacity>
           </TouchableOpacity>

           <TouchableOpacity style={styles.dashCard}>
              <Clock color={COLORS.secondary} size={28} />
              <View style={styles.dashText}>
                 <Text style={styles.dashLabel}>Call Logs</Text>
                 <Text style={styles.dashValue}>Minutes & Earnings</Text>
              </View>
              <ChevronRight color="#CCC" size={20} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.dashCard} onPress={() => navigation.navigate('GiftLedger', { type: 'received' })}>
              <Gift color={COLORS.primary} size={28} />
              <View style={styles.dashText}>
                 <Text style={styles.dashLabel}>Trophy Cabinet</Text>
                 <Text style={styles.dashValue}>View Received Gifts</Text>
              </View>
              <ChevronRight color="#CCC" size={20} />
           </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
         <View style={styles.header}>
            <GlowAvatar size={100} isOnline={true} xp={isMale ? wealthXP : 0}>
               <Image source={user.photos?.[0]} style={styles.avatarImg} />
            </GlowAvatar>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.bio}>{user.bio || 'Add a bio'}</Text>
         </View>

         <Text style={styles.sectionTitle}>Private Dashboard</Text>
         {renderPrivateDashboard()}

         <Text style={styles.sectionTitle}>Account Utility</Text>
         <View style={styles.menuContainer}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.menuItemLeft}>
                  {item.icon}
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </View>
                <ChevronRight color="#CCC" size={20} />
              </TouchableOpacity>
            ))}
         </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { alignItems: 'center', backgroundColor: 'white', paddingVertical: 40, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  bio: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, paddingHorizontal: 40, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginLeft: 20, marginTop: 30, marginBottom: 10, textTransform: 'uppercase' },
  dashboard: { paddingHorizontal: 20 },
  dashCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 2 },
  dashText: { flex: 1, marginLeft: 15 },
  dashLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  dashValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  rechargeSmall: { backgroundColor: '#B8860B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  withdrawSmall: { backgroundColor: '#4CD964', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  rechargeSmallText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  menuContainer: { backgroundColor: 'white', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuLabel: { marginLeft: 15, fontSize: 16, color: COLORS.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.primary, textAlign: 'center' }
});

export default MyProfileScreen;
