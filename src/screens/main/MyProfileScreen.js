import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins, Gift, ArrowUpCircle, User as UserIcon, X, Wallet, Image as ImageIcon, HelpCircle } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { getGiftAsset } from '../../services/giftingService';
import { hapticService } from '../../services/hapticService';
import { useIsFocused } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import VIPBadge from '../../components/VIPBadge';
import GlowAvatar from '../../components/GlowAvatar';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const { user, loading, isMale } = useUser();

  const [balance, setBalance] = useState(0);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [wealthXP, setWealthXP] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [receivedGifts, setReceivedGifts] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (isFocused && user) {
      loadStats();
      if (!user.gender) {
        navigation.navigate('GenderSetup');
      }
    }
  }, [isFocused, user]);

  const loadStats = async () => {
    const b = await ledgerService.getBalance();
    const s = await ledgerService.getTotalSpent();
    const trc = await ledgerService.getTotalGiftsReceived();
    const r = await ledgerService.getReceivedGifts();
    const db = await ledgerService.getDiamondBalance();
    const xp = await ledgerService.getWealthXP();

    setBalance(b);
    setTotalSpent(s);
    setReceivedGifts(r);
    setDiamondBalance(db);
    setWealthXP(xp);
    setTotalMinutes(Math.floor(Math.random() * 500)); // Mocked minutes
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
    return { id, count, name: asset?.name || 'Gift', icon: asset?.icon || '🎁' };
  });

  const menuItems = [
    { icon: <Award size={22} color="#FFD700" />, label: 'Global Leaderboard', screen: 'Leaderboard' },
    { icon: <ImageIcon size={22} color={COLORS.secondary} />, label: 'My Gallery', screen: 'PhotoUpload' },
    { icon: <Settings size={22} color="#666" />, label: 'Settings', screen: 'Settings' },
    { icon: <HelpCircle size={22} color={COLORS.primary} />, label: 'Help & Support', screen: 'HelpSupport' },
  ];

  const renderMaleStats = () => (
    <View style={styles.statsContainer}>
       <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Coins Sent</Text>
          <Text style={styles.statValue}>{totalSpent} 🪙</Text>
       </View>
       <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current Balance</Text>
          <Text style={styles.statValue}>{balance} 🪙</Text>
       </View>
    </View>
  );

  const renderFemaleStats = () => (
    <View style={styles.statsContainer}>
       <View style={styles.statBox}>
          <Text style={styles.statLabel}>Diamond Balance</Text>
          <Text style={styles.statValue}>💎 {diamondBalance}</Text>
       </View>
       <View style={styles.statBox}>
          <Text style={styles.statLabel}>Minutes Talked</Text>
          <Text style={styles.statValue}>{totalMinutes}m</Text>
       </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatarWrapper}>
        <GlowAvatar size={110} isOnline={true} xp={isMale ? wealthXP : 0}>
           <Image source={user.photos?.[0] || 'https://via.placeholder.com/150'} style={styles.profileImg} />
        </GlowAvatar>
      </View>
      <Text style={styles.name}>{user.name || 'Amira User'}</Text>
      <Text style={styles.bio}>{user.bio || 'Add a bio to your profile'}</Text>

      {isMale ? renderMaleStats() : renderFemaleStats()}

      <View style={styles.actionHub}>
         {isMale ? (
           <>
             <TouchableOpacity style={styles.rechargeBtn} onPress={() => navigation.navigate('RechargeHub')}>
                <Coins color="white" size={20} />
                <Text style={styles.btnText}>Recharge Hub</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.vipBtn} onPress={() => navigation.navigate('VIPStore')}>
                <Award color={COLORS.primary} size={20} />
                <Text style={styles.vipBtnText}>VIP Store</Text>
             </TouchableOpacity>
           </>
         ) : (
           <TouchableOpacity style={styles.withdrawBtn} onPress={() => navigation.navigate('Withdrawal')}>
              <Wallet color="white" size={20} />
              <Text style={styles.btnText}>Withdrawal Center</Text>
           </TouchableOpacity>
         )}
      </View>

      <TouchableOpacity
        style={styles.ledgerRow}
        onPress={() => navigation.navigate('GiftLedger', { type: isMale ? 'sent' : 'received' })}
      >
         <View style={styles.ledgerLeft}>
            <Gift color={COLORS.primary} size={20} />
            <Text style={styles.ledgerLabel}>{isMale ? 'My Sent Gifts' : 'Trophy Cabinet'}</Text>
         </View>
         <View style={styles.giftIconsPreview}>
            {trophyData.slice(0, 3).map((g, i) => (
               <Text key={i} style={styles.previewIcon}>{g.icon}</Text>
            ))}
            <ChevronRight color="#CCC" size={20} />
         </View>
      </TouchableOpacity>
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
            onPress={() => { hapticService.lightImpact(); navigation.navigate(item.screen); }}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Photo Lightbox */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
         <View style={styles.lightbox}>
            <TouchableOpacity style={styles.closeLightbox} onPress={() => setSelectedPhoto(null)}>
               <X color="white" size={32} />
            </TouchableOpacity>
            <Image source={selectedPhoto} style={styles.lightboxImage} contentFit="contain" />
         </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { backgroundColor: 'white', paddingVertical: 40, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  avatarWrapper: { marginBottom: 15 },
  profileImg: { width: 110, height: 110, borderRadius: 55 },
  name: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
  bio: { fontSize: 14, color: COLORS.textSecondary, paddingHorizontal: 40, textAlign: 'center', marginBottom: 20 },

  statsContainer: { flexDirection: 'row', width: '90%', justifyContent: 'space-around', marginVertical: 10 },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },

  actionHub: { flexDirection: 'row', width: '90%', justifyContent: 'center', marginTop: 20 },
  rechargeBtn: { backgroundColor: '#B8860B', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  withdrawBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  vipBtn: { marginLeft: 15, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 25, flexDirection: 'row', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  vipBtnText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },

  ledgerRow: { flexDirection: 'row', width: '90%', backgroundColor: '#FFF5F7', marginTop: 25, padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'space-between' },
  ledgerLeft: { flexDirection: 'row', alignItems: 'center' },
  ledgerLabel: { marginLeft: 10, fontWeight: 'bold', color: COLORS.text },
  giftIconsPreview: { flexDirection: 'row', alignItems: 'center' },
  previewIcon: { fontSize: 18, marginRight: 5 },

  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuLabel: { marginLeft: 15, fontSize: 16, color: COLORS.text, fontWeight: '500' },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeLightbox: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  lightboxImage: { width: width, height: height * 0.8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.primary, fontSize: 16, textAlign: 'center' }
});

export default MyProfileScreen;
